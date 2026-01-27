import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { MediaModule } from '../media/media.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [MediaModule, MinioModule],
  providers: [DiscordService],
})
export class DiscordModule { }
