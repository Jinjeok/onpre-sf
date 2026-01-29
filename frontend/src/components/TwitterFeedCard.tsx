import { useState, useRef, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import type { GroupedMedia } from './thumbnailGrid.types';
import {
    TwitterCardContainer,
    CardHeader,
    CardContent,
    AttachmentScroll,
    AttachmentItem
} from './ThumbnailGrid.styles';

interface TwitterFeedCardProps {
    group: GroupedMedia;
    getFullUrl: (url: string) => string;
    onZoom: (url: string, type: 'image' | 'video') => void;
    globalVolume: number;
}

/**
 * TwitterFeedCard - Card component for Feed mode (Twitter/Infinite scroll style)
 */
export const TwitterFeedCard = ({ group, getFullUrl, onZoom, globalVolume }: TwitterFeedCardProps) => {
    const isSingle = group.media.length === 1;

    // Auto-play on focus
    const { ref: cardRef, inView } = useInView({
        threshold: 0.6, // Play when 60% visible (focused)
    });

    const [cardNode, setCardNode] = useState<HTMLDivElement | null>(null);

    // Merge refs
    const setRefs = useCallback((node: HTMLDivElement | null) => {
        // useInView Ref
        cardRef(node);
        setCardNode(node);
    }, [cardRef]);

    useEffect(() => {
        if (!cardNode) return;
        const videos = cardNode.querySelectorAll('video');
        videos.forEach(video => {
            // Always update volume
            video.volume = globalVolume;

            if (inView) {
                // Browsers often block auto-play with audio. 
                // We attempt to play unmuted, but might need to mute if it fails.
                const playPromise = video.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn("Auto-play with audio blocked:", error);
                    });
                }
            } else {
                video.pause();
            }
        });
    }, [inView, cardNode, globalVolume]);


    // Drag Scroll Logic
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const dragDistance = useRef(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDown(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
        dragDistance.current = 0;
    };

    const handleMouseLeave = () => setIsDown(false);
    const handleMouseUp = () => setIsDown(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDown || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast

        const diff = Math.abs(x - startX);
        dragDistance.current += diff;

        scrollRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleZoomClick = (url: string, type: 'image' | 'video') => {
        // If dragged more than 5px, don't trigger zoom
        if (dragDistance.current > 10) return;
        onZoom(url, type);
    };

    return (
        <TwitterCardContainer ref={setRefs}>
            <CardHeader>
                <span>{new Date(group.discordCreatedAt || group.createdAt).toLocaleString()}</span>
            </CardHeader>
            {group.content && <CardContent>{group.content}</CardContent>}

            {/* Drag Events */}
            <AttachmentScroll
                ref={scrollRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
            >
                {group.media.map(item => (
                    <AttachmentItem key={item.id} $isSingle={isSingle}>
                        {item.type === 'video' ? (
                            <video
                                src={getFullUrl(item.minioUrl)}
                                controls
                                loop
                                playsInline
                                style={{ maxWidth: '100%', maxHeight: '600px', display: 'block', pointerEvents: 'auto' }}
                            />
                        ) : (
                            <img
                                src={getFullUrl(item.minioUrl)}
                                alt="attachment"
                                loading="lazy"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '600px',
                                    display: 'block',
                                    cursor: 'zoom-in',
                                    userSelect: 'none'
                                }}
                                onClick={() => handleZoomClick(getFullUrl(item.minioUrl), 'image')}
                                onDragStart={(e) => e.preventDefault()} // Prevent image drag
                            />
                        )}
                    </AttachmentItem>
                ))}
            </AttachmentScroll>
        </TwitterCardContainer>
    );
};
