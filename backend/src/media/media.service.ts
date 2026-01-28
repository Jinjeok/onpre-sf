import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media } from './entities/media.entity';
import { MinioService } from '../minio/minio.service';

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
    private minioService: MinioService,
  ) { }

  async create(media: Partial<Media>) {
    return this.mediaRepository.save(media);
  }

  async findOne(id: string) {
    return this.mediaRepository.findOneBy({ id });
  }

  async existsByDiscordMessageId(discordMessageId: string): Promise<boolean> {
    const count = await this.mediaRepository.count({
      where: { discordMessageId },
    });
    return count > 0;
  }

  async existsByHash(hash: string): Promise<boolean> {
    const count = await this.mediaRepository.count({
      where: { hash },
    });
    return count > 0;
  }

  async findRandom(type?: string, limit: number = 50) {
    const query = this.mediaRepository.createQueryBuilder('media');
    if (type) {
      query.where('media.type = :type', { type });
    }
    query.orderBy('RANDOM()');
    query.limit(limit);
    return query.getMany();
  }

  async findAll(limit: number = 100, offset: number = 0) {
    return this.mediaRepository.find({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }

  async findAllGrouped(limit: number, offset: number, type?: string, sortBy: 'fetch' | 'discord' = 'fetch', order: 'ASC' | 'DESC' = 'DESC') {
    // 1. Get distinct message IDs with pagination
    const query = this.mediaRepository.createQueryBuilder('media')
      .select('media.discordMessageId', 'discord_message_id')
      .addSelect('MAX(media.originalChannel)', 'original_channel')
      .addSelect('MAX(media.content)', 'content')
      .addSelect('MAX(media.createdAt)', 'latest_fetch')
      .addSelect('MAX(media.discordCreatedAt)', 'latest_discord')
      .where('media.isDeleted = false')
      .groupBy('media.discordMessageId')
      .limit(limit)
      .offset(offset);

    if (sortBy === 'discord') {
      query.orderBy('latest_discord', order);
    } else {
      query.orderBy('latest_fetch', order);
    }

    const messageIdsResult = await query.getRawMany();
    const messageIds = messageIdsResult.map(r => r.media_discordMessageId);

    if (messageIds.length === 0) return [];

    // 2. Fetch all media for these IDs
    const itemsQuery = this.mediaRepository.createQueryBuilder('media')
      .where('media.discordMessageId IN (:...ids)', { ids: messageIds })
      .orderBy('media.createdAt', 'DESC'); // Order media within group (always DESC for consistency?)

    if (type) {
      itemsQuery.andWhere('media.type = :type', { type });
    }

    const mediaItems = await itemsQuery.getMany();

    // 3. Group by ID
    const grouped = messageIds.map(id => {
      const items = mediaItems.filter(m => m.discordMessageId === id);
      return {
        discordMessageId: id,
        originalChannel: items[0]?.originalChannel,
        content: items[0]?.content,
        discordCreatedAt: items[0]?.discordCreatedAt || items[0]?.createdAt, // Fallback
        createdAt: items[0]?.createdAt,
        media: items
      };
    });

    return grouped;
  }

  async findRandomGrouped(limit: number = 5, excludeIds: string[] = [], type?: string) {
    // 1. Get Random Discord Message IDs (Filtered)
    const query = this.mediaRepository.createQueryBuilder('media')
      .select('media.discordMessageId')
      .where('media.isAvailable = :isAvailable', { isAvailable: true });

    if (type) {
      query.andWhere('media.type = :type', { type });
    }

    if (excludeIds.length > 0) {
      query.andWhere('media.discordMessageId NOT IN (:...excludeIds)', { excludeIds });
    }

    // Group by ID to get distinct Messages, then Order by Random
    query.groupBy('media.discordMessageId')
      .orderBy('RANDOM()')
      .limit(limit);

    const messageIdsResult = await query.getRawMany();
    const messageIds = messageIdsResult.map(r => r.media_discordMessageId);

    if (messageIds.length === 0) return [];

    // 2. Fetch all media for these IDs
    return this.findAllGroupedByIds(messageIds);
  }

  // Helper to reuse grouping logic
  private async findAllGroupedByIds(messageIds: string[]) {
    const itemsQuery = this.mediaRepository.createQueryBuilder('media')
      .where('media.discordMessageId IN (:...ids)', { ids: messageIds })
      .orderBy('media.createdAt', 'DESC'); // Order media within group

    const mediaItems = await itemsQuery.getMany();

    return messageIds.map(id => {
      const items = mediaItems.filter(m => m.discordMessageId === id);
      return {
        discordMessageId: id,
        originalChannel: items[0]?.originalChannel,
        content: items[0]?.content,
        discordCreatedAt: items[0]?.discordCreatedAt || items[0]?.createdAt,
        createdAt: items[0]?.createdAt,
        media: items
      };
    });
  }

  async markUnavailable(id: string) {
    return this.mediaRepository.update(id, { isAvailable: false });
  }

  async getLatestDiscordMessageId(channelId: string): Promise<string | null> {
    const latest = await this.mediaRepository.findOne({
      where: { originalChannel: channelId },
      order: { discordMessageId: 'DESC' },
    });
    return latest ? latest.discordMessageId : null;
  }

  async getMediaStream(key: string) {
    return this.minioService.getFileStream(key);
  }

  async deleteMedia(id: string) {
    const media = await this.mediaRepository.findOneBy({ id });
    if (!media) {
      throw new Error('Media not found');
    }

    // Try to extract object key. The minioUrl is stored as `/feed/media?key=...`
    // We need the raw object name.
    let objectName = media.minioUrl;
    if (objectName.includes('?key=')) {
      objectName = decodeURIComponent(objectName.split('?key=')[1]);
    } else if (objectName.startsWith('http')) {
      // Fallback if it was a full URL (legacy)
      const parts = objectName.split('/');
      // Assuming structure channelId/filename
      objectName = parts.slice(-2).join('/');
    }

    try {
      await this.minioService.deleteFile(objectName);
    } catch (e) {
      console.warn(`Failed to delete MinIO object ${objectName}: ${e.message}`);
      // Proceed to delete DB record anyway
    }

    return this.mediaRepository.delete(id);
  }
}
