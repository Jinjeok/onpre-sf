import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import { Media } from './entities/media.entity';
import { MinioModule } from '../minio/minio.module';
import { DiscordModule } from '../discord/discord.module';
import { FailedUrl } from './entities/failed-url.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Media, FailedUrl]), MinioModule, forwardRef(() => DiscordModule)],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule { }
