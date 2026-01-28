import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
    private minioClient: Minio.Client;
    private bucketName: string;
    private readonly logger = new Logger(MinioService.name);

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        this.minioClient = new Minio.Client({
            endPoint: this.configService.get<string>('MINIO_ENDPOINT') || 'localhost',
            port: parseInt(this.configService.get<string>('MINIO_PORT') || '9000'),
            useSSL: false,
            accessKey: this.configService.get<string>('MINIO_ROOT_USER') || '',
            secretKey: this.configService.get<string>('MINIO_ROOT_PASSWORD') || '',
        });

        this.bucketName = this.configService.get<string>('MINIO_BUCKET_NAME') || 'shorts-media';

        try {
            const exists = await this.minioClient.bucketExists(this.bucketName);
            if (!exists) {
                await this.minioClient.makeBucket(this.bucketName);
                this.logger.log(`Bucket ${this.bucketName} created`);

                const policy = {
                    Version: '2012-10-17',
                    Statement: [
                        {
                            Effect: 'Allow',
                            Principal: { AWS: ['*'] },
                            Action: ['s3:GetObject'],
                            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
                        },
                    ],
                };
                await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
                this.logger.log(`Bucket policy set to public read`);
            }
        } catch (err) {
            this.logger.error('Error initializing MinIO bucket', err);
        }
    }

    get client() {
        return this.minioClient;
    }

    get bucket() {
        return this.bucketName;
    }

    async uploadFile(objectName: string, stream: any, size: number, metaData: any = {}) {
        return this.minioClient.putObject(this.bucketName, objectName, stream, size, metaData);
    }

    async getFileStream(objectName: string) {
        return this.minioClient.getObject(this.bucketName, objectName);
    }

    async getFileStat(objectName: string) {
        return this.minioClient.statObject(this.bucketName, objectName);
    }

    async getPartialStream(objectName: string, offset: number, length: number) {
        return this.minioClient.getPartialObject(this.bucketName, objectName, offset, length);
    }

    getFileUrl(objectName: string) {
        // Points to backend proxy via Query Parameter to avoid slash routing issues
        return `/feed/media?key=${encodeURIComponent(objectName)}`;
    }

    async deleteFile(objectName: string) {
        return this.minioClient.removeObject(this.bucketName, objectName);
    }
}
