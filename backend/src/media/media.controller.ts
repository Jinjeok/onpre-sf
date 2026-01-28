import { Controller, Get, Post, Delete, Query, Param, Res, Req, UseGuards } from '@nestjs/common';
import { MediaService } from './media.service';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MinioService } from '../minio/minio.service';

import { DiscordService } from '../discord/discord.service';

@Controller('feed')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly minioService: MinioService,
    private readonly discordService: DiscordService
  ) { }

  @Post(':id/redownload')
  @UseGuards(JwtAuthGuard)
  async redownload(@Param('id') id: string) {
    return this.discordService.redownloadMedia(id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getFeed(@Query('type') type?: string, @Query('limit') limit?: number) {
    return this.mediaService.findRandom(type, limit ? Number(limit) : 50);
  }

  @Get('list')
  @UseGuards(JwtAuthGuard)
  getList(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('type') type?: string,
    @Query('sort') sort?: 'fetch' | 'discord',
    @Query('order') order?: 'ASC' | 'DESC'
  ) {
    return this.mediaService.findAllGrouped(
      limit ? Number(limit) : 20,
      offset ? Number(offset) : 0,
      type,
      sort,
      order
    );
  }

  @Get('random')
  @UseGuards(JwtAuthGuard)
  getRandomFeed(
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('exclude') exclude?: string
  ) {
    const excludeIds = exclude ? exclude.split(',') : [];
    return this.mediaService.findRandomGrouped(
      limit ? Number(limit) : 5,
      excludeIds,
      type
    );
  }

  @Get('error/:id')
  @UseGuards(JwtAuthGuard)
  async reportError(@Param('id') id: string) {
    console.warn(`[MediaController] Reporting media error (403/404): ${id}`);
    return this.mediaService.markUnavailable(id);
  }

  @Get('media')
  @UseGuards(JwtAuthGuard)
  async getMedia(@Query('key') key: string, @Req() req: Request, @Res() res: Response) {
    if (!key) {
      return res.status(400).send('Missing key');
    }

    try {
      const stats = await this.minioService.getFileStat(key);
      const fileSize = stats.size;
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;

        const stream = await this.minioService.getPartialStream(key, start, chunksize);

        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': (stats.metaData as any)?.['content-type'] || 'application/octet-stream',
        };

        res.writeHead(206, head);
        stream.pipe(res);
      } else {
        const head = {
          'Content-Length': fileSize,
          'Content-Type': (stats.metaData as any)?.['content-type'] || 'application/octet-stream',
        };
        res.writeHead(200, head);
        const stream = await this.minioService.getFileStream(key);
        stream.pipe(res);
      }
    } catch (error) {
      console.error(`[MediaController] Error serving media: ${key}`, error);
      if (!res.headersSent) res.status(404).send('Media not found');
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteMedia(@Param('id') id: string) {
    return this.mediaService.deleteMedia(id);
  }
}
