import { Module, forwardRef } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { MediaModule } from '../media/media.module';
import { MinioModule } from '../minio/minio.module';

@Module({
  imports: [forwardRef(() => MediaModule), MinioModule],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule { }
