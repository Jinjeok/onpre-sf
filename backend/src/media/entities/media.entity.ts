import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class Media {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    type: string;

    @Column({ unique: true })
    minioUrl: string;

    @Column()
    originalChannel: string;

    @Column({ unique: false })
    discordMessageId: string;

    @Column({ nullable: true, type: 'text' })
    content: string;

    @Column({ nullable: true, type: 'timestamp' })
    discordCreatedAt: Date;

    @Column({ default: true })
    isAvailable: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
