import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, GatewayIntentBits, Message, TextChannel, Collection } from 'discord.js';
import { MinioService } from '../minio/minio.service';
import { MediaService } from '../media/media.service';
import { Readable, PassThrough } from 'stream';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import * as crypto from 'crypto';

const unlinkAsync = promisify(fs.unlink);

@Injectable()
export class DiscordService implements OnModuleInit {
    private client: Client;
    private readonly logger = new Logger(DiscordService.name);
    private channelIds: string[] = [];

    constructor(
        private configService: ConfigService,
        private minioService: MinioService,
        private mediaService: MediaService,
    ) { }

    async onModuleInit() {
        const ids = this.configService.get<string>('DISCORD_CHANNEL_IDS');
        this.channelIds = ids ? ids.split(',').map(id => id.trim()).filter(id => id.length > 0) : [];

        if (this.channelIds.length === 0) {
            this.logger.warn('No DISCORD_CHANNEL_IDS configured');
        }

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        this.client.on('ready', () => {
            this.logger.log(`Discord Bot logged in as ${this.client.user?.tag}`);
            this.runBackfill();
        });

        this.client.on('messageCreate', (message) => this.handleMessage(message));

        const token = this.configService.get<string>('DISCORD_BOT_TOKEN');
        if (token) {
            await this.client.login(token);
        } else {
            this.logger.warn('DISCORD_BOT_TOKEN not provided');
        }
    }

    async runBackfill() {
        this.logger.log('Starting multi-channel backfill...');
        for (const channelId of this.channelIds) {
            await this.backfillChannel(channelId);
        }
        this.logger.log('Backfill complete.');
    }

    async backfillChannel(channelId: string) {
        this.logger.log(`Backfilling channel ${channelId} (Backward Crawl)...`);
        const channel = await this.client.channels.fetch(channelId) as TextChannel;
        if (!channel || !channel.isTextBased()) {
            this.logger.error(`Invalid channel ${channelId}`);
            return;
        }

        let oldestErrorMessageId: string | null = null;
        let beforeId: string | null = null; // Start from "latest" (null)
        let hasMore = true;
        let totalFetched = 0;
        let batchCount = 0;

        while (hasMore) {
            batchCount++;
            const options: any = { limit: 100 };
            if (beforeId) {
                options.before = beforeId;
            }

            try {
                this.logger.debug(`Fetching batch ${batchCount} for ${channelId} (before: ${beforeId || 'latest'})...`);
                const messages = (await channel.messages.fetch(options)) as unknown as Collection<string, Message>;

                if (messages.size === 0) {
                    this.logger.log(`No more messages found in channel ${channelId}. Reached beginning of history. Total fetched: ${totalFetched}`);
                    hasMore = false;
                    break;
                }

                totalFetched += messages.size;
                this.logger.log(`Fetched ${messages.size} messages (Total: ${totalFetched}). Processing items...`);

                const items = Array.from(messages.values());

                // Process in chunks to avoid overwhelming but speed up
                const chunkSize = 10;
                let processedCount = 0;

                for (let i = 0; i < items.length; i += chunkSize) {
                    const chunk = items.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(msg => this.handleMessage(msg)));
                    processedCount += chunk.length;
                    this.logger.log(`[Backfill Progress] Processed ${processedCount}/${items.length} in current batch (Batch ${batchCount}, Total Fetched: ${totalFetched})`);
                }

                // Update pointer for next batch (move backwards in time)
                // Use BigInt for correct Snowflake comparison
                const sorted = items.sort((a: any, b: any) => {
                    return Number(BigInt(a.id) - BigInt(b.id)); // Ascending (oldest first)
                });

                // We want the OLDEST message from this batch to be the "before" cursor for the next batch
                beforeId = sorted[0].id;

                if (messages.size < 100) {
                    this.logger.log(`Fetched ${messages.size} messages (<100), assuming end of history. Total: ${totalFetched}`);
                    hasMore = false;
                } else {
                    this.logger.log(`Batch ${batchCount} complete. Moving to next batch (before: ${beforeId})...`);
                }

            } catch (e) {
                this.logger.error(`Backfill error in ${channelId} at batch ${batchCount}: ${e.message}`, e.stack);
                // If it's a transient error, maybe we shouldn't abort?
                // But if fetch fails, we can't get 'beforeId'.
                // Let's try to wait and retry? Or just skip.
                // For now, aborting is safer than infinite loop, but let's log clearly.
                hasMore = false;
            }
        }
    }

    async handleMessage(message: Message) {
        if (message.author.bot || !this.channelIds.includes(message.channelId)) return;

        // 1. Process Attachments
        if (message.attachments.size > 0) {
            for (const [, attachment] of message.attachments) {
                await this.processMediaUrl(message, attachment.url, attachment.contentType, attachment.name, attachment.size);
            }
        }

        // 2. Process Embeds (External Links, etc.)
        if (message.embeds.length > 0) {
            for (const embed of message.embeds) {
                // this.logger.debug(`Inspecting Embed: ${JSON.stringify(embed)}`);
                if (embed.video && embed.video.url) {
                    await this.processMediaUrl(message, embed.video.url, 'video/embed', `embed_video_${message.id}`, 0);
                }
                else if (embed.image && embed.image.url) {
                    await this.processMediaUrl(message, embed.image.url, 'image/embed', `embed_image_${message.id}`, 0);
                }
                else if (embed.thumbnail && embed.thumbnail.url) {
                    await this.processMediaUrl(message, embed.thumbnail.url, 'image/embed', `embed_thumb_${message.id}`, 0);
                }
            }
        }

        // 3. Process Message Snapshots (Discord Forwards)
        if ((message as any).messageSnapshots && (message as any).messageSnapshots.size > 0) {
            const snapshots = (message as any).messageSnapshots as Collection<string, Message>;
            for (const [, snapshot] of snapshots) {
                if (snapshot.attachments && snapshot.attachments.size > 0) {
                    for (const [, attachment] of snapshot.attachments) {
                        await this.processMediaUrl(message, attachment.url, attachment.contentType, attachment.name, attachment.size, snapshot.content);
                    }
                }
                if (snapshot.embeds && snapshot.embeds.length > 0) {
                    for (const embed of snapshot.embeds) {
                        if (embed.video && embed.video.url) {
                            await this.processMediaUrl(message, embed.video.url, 'video/embed', `forward_video_${message.id}`, 0, snapshot.content);
                        }
                        else if (embed.image && embed.image.url) {
                            await this.processMediaUrl(message, embed.image.url, 'image/embed', `forward_image_${message.id}`, 0, snapshot.content);
                        }
                        else if (embed.thumbnail && embed.thumbnail.url) {
                            await this.processMediaUrl(message, embed.thumbnail.url, 'image/embed', `forward_thumb_${message.id}`, 0, snapshot.content);
                        }
                    }
                }
            }
        }
    }
    async processMediaUrl(message: Message, url: string, contentType: string | null, filename: string | null, size: number, contentOverride?: string): Promise<boolean> {
        let type: string | null = null;

        // Deduction
        const lowerUrl = url.toLowerCase();
        if (contentType?.startsWith('video/') || lowerUrl.match(/\.(mp4|mov|webm|mkv)$/)) type = 'video';
        else if (contentType?.startsWith('image/') || lowerUrl.match(/\.(png|jpg|jpeg|gif|webp)$/)) type = 'image';

        // Embeds often have no content-type, rely on URL
        if (!type && contentType === 'video/embed') type = 'video';
        if (!type && contentType === 'image/embed') type = 'image';

        if (!type) {
            return false;
        }

        try {
            // this.logger.log(`Processing media: ${url} (${type}) from message ${message.id}`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);

            const channelId = message.channelId;
            // Clean filename
            const cleanName = (filename || 'unknown_file').replace(/[^a-zA-Z0-9._-]/g, '_');

            // Deterministic Unique ID based on URL
            const uniqueId = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);

            const objectName = `${channelId}/${message.id}_${uniqueId}_${cleanName}`;

            let streamSize = size;
            let uploadStream: Readable | Buffer;

            // Video Trimming Logic
            if (type === 'video') {
                const tempInput = path.join(os.tmpdir(), `${uniqueId}_input.mp4`);
                const tempOutput = path.join(os.tmpdir(), `${uniqueId}_output.mp4`);

                try {
                    // Save stream to file
                    const fileStream = fs.createWriteStream(tempInput);

                    // Logic to get stream/buffer
                    if (!size || size === 0) {
                        const buffer = await response.arrayBuffer();
                        fs.writeFileSync(tempInput, Buffer.from(buffer));
                    } else {
                        if (!response.body) throw new Error('Response body is null');
                        const nodeStream = this.convertWebStreamToNodeStream(response.body);
                        await new Promise((resolve, reject) => {
                            nodeStream.pipe(fileStream);
                            nodeStream.on('end', resolve);
                            nodeStream.on('error', reject);
                        });
                    }

                    // Process with ffmpeg
                    await new Promise((resolve, reject) => {
                        ffmpeg(tempInput)
                            .ffprobe((err, metadata) => {
                                if (err) return reject(err);
                                const duration = metadata.format.duration || 0;
                                if (duration > 60) {
                                    this.logger.log(`Trimming video ${cleanName} (Duration: ${duration}s)`);
                                    ffmpeg(tempInput)
                                        .setDuration(60)
                                        .output(tempOutput)
                                        .on('end', resolve)
                                        .on('error', reject)
                                        .run();
                                } else {
                                    fs.copyFileSync(tempInput, tempOutput);
                                    resolve(null);
                                }
                            });
                    });

                    // Read back for upload
                    const processedBuffer = fs.readFileSync(tempOutput);
                    streamSize = processedBuffer.length;
                    uploadStream = PassThrough.from(processedBuffer);

                    // Cleanup
                    await unlinkAsync(tempInput).catch(() => { });
                    await unlinkAsync(tempOutput).catch(() => { });

                } catch (videoError) {
                    this.logger.error(`FFmpeg processing failed for ${url}: ${videoError.message}. Uploading original.`);
                    if (fs.existsSync(tempInput)) await unlinkAsync(tempInput).catch(() => { });
                    if (fs.existsSync(tempOutput)) await unlinkAsync(tempOutput).catch(() => { });
                    return false;
                }
            } else {
                // Image or other
                if (!size || size === 0) {
                    const buffer = await response.arrayBuffer();
                    streamSize = buffer.byteLength;
                    uploadStream = Buffer.from(buffer);
                } else {
                    if (!response.body) throw new Error('Response body is null');
                    // Need to cast response.body to ReadableStream<any>
                    uploadStream = this.convertWebStreamToNodeStream(response.body as unknown as ReadableStream<any>);
                }
            }

            await this.minioService.uploadFile(objectName, streamSize === 0 ? Buffer.alloc(0) : (uploadStream as any), streamSize, {
                'Content-Type': contentType || (type === 'video' ? 'video/mp4' : 'image/jpeg'),
                'x-discord-message-id': message.id,
            });

            const minioUrl = this.minioService.getFileUrl(objectName);

            await this.mediaService.create({
                type,
                minioUrl: minioUrl,
                discordMessageId: message.id,
                originalChannel: message.channelId,
                content: contentOverride ?? message.content,
                discordCreatedAt: message.createdAt
            });

            this.logger.log(`Saved ${type}: ${cleanName}`);
            return true;
        } catch (err) {
            if (err.code === '23505') { // Unique violation
                // this.logger.debug(`Skipping duplicate: ${message.id}`);
                return true;
            } else {
                this.logger.error(`Error processing media ${url}: ${err.message}`, err.stack);
                return false;
            }
        }
    }

    private convertWebStreamToNodeStream(webStream: ReadableStream<any>): Readable {
        const nodeStream = new PassThrough();
        const reader = webStream.getReader();

        const pump = async () => {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) {
                        nodeStream.end();
                        break;
                    }
                    nodeStream.write(Buffer.from(value));
                }
            } catch (err) {
                nodeStream.destroy(err);
            }
        };

        pump();
        return nodeStream;
    }
}
