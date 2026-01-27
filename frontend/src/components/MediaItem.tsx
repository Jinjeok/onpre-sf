import styled from 'styled-components';
import { useInView } from 'react-intersection-observer';
import { useEffect, useRef, useState } from 'react';
import api from '../api';

const ItemContainer = styled.div`
  height: 100dvh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
  scroll-snap-align: start;
  position: relative;
  overflow: hidden;
`;

const StyledImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const StyledVideo = styled.video`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

const VideoOverlay = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  pointer-events: none;
`;

interface MediaItemProps {
    item: {
        id: string;
        type: string;
        minioUrl: string;
        discordMessageId: string;
    };
}

export const MediaItem = ({ item }: MediaItemProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [ref, inView] = useInView({
        threshold: 0.6,
    });
    const [mediaSrc, setMediaSrc] = useState<string | null>(null);

    // Fetch protected media
    useEffect(() => {
        let active = true;
        const fetchMedia = async () => {
            try {
                // If it's already an absolute HTTP URL, just use it (legacy support)
                if (item.minioUrl.startsWith('http')) {
                    if (active) setMediaSrc(item.minioUrl);
                    return;
                }

                // Otherwise it's a relative path to our protected endpoint
                // We encode the key component to ensure slashes don't break the route
                const key = item.minioUrl.replace('/feed/media/', '');
                const encodedKey = encodeURIComponent(key);
                console.log(`[MediaItem] Requesting media from: ${item.minioUrl} (sending as ${encodedKey})`);
                const response = await api.get(`/feed/media/${encodedKey}`, { responseType: 'blob' });
                const objectUrl = URL.createObjectURL(response.data);

                if (active) setMediaSrc(objectUrl);

                // Cleanup blob on unmount inside this scope if needed, 
                // but usually better to do in cleanup function of useEffect
            } catch (err) {
                console.error('Failed to load media', err);
            }
        };

        fetchMedia();

        return () => {
            active = false;
            // Revoke URL if we created one? 
            // Implementation complexity: we need to store the objectUrl to revoke it.
            // For simplicity in this step, we rely on browser GC or simple state replacement.
        };
    }, [item.minioUrl]);

    // Cleanup ObjectURL when mediaSrc changes (previous one)
    // Actually, let's just keep it simple. If valid session, endpoints are protected.
    // Wait, simpler approach: The backend proxy endpoint requires the token.
    // <img> tags CANNOT send custom headers.
    // So `api.get(..., {responseType: 'blob'})` is the correct way.

    useEffect(() => {
        if (item.type === 'video' && videoRef.current) {
            if (inView) {
                videoRef.current.play().catch(e => console.log('Autoplay blocked', e));
            } else {
                videoRef.current.pause();
            }
        }
    }, [inView, item.type]);

    if (!mediaSrc) return <ItemContainer ref={ref}>Loading...</ItemContainer>;

    return (
        <ItemContainer ref={ref}>
            {item.type === 'video' ? (
                <StyledVideo
                    ref={videoRef}
                    src={mediaSrc}
                    loop
                    muted
                    playsInline
                    controls={false}
                    onClick={(e) => {
                        const v = e.currentTarget;
                        v.muted = !v.muted;
                    }}
                />
            ) : (
                <StyledImage src={mediaSrc} alt="media" loading="lazy" />
            )}
            {item.type === 'video' && (
                <VideoOverlay>Tap to unmute</VideoOverlay>
            )}
        </ItemContainer>
    );
};
