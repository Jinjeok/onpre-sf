// Types for ThumbnailGrid components
export interface MediaItem {
    id: string;
    type: string;
    minioUrl: string;
    thumbnailUrl?: string;
    duration?: number;
    originalChannel: string;
    discordMessageId: string;
    content?: string;
    discordCreatedAt?: string;
}

export interface GroupedMedia {
    discordMessageId: string;
    originalChannel: string;
    content: string;
    createdAt: string;
    discordCreatedAt?: string;
    media: MediaItem[];
}
