import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class FailedUrl {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true })
    url: string;

    @Column()
    reason: string;

    @Column({ default: 1 })
    attempts: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    lastAttempt: Date;
}
