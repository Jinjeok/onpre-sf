import { useState, useRef, useEffect, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import styled from 'styled-components';
import { useDraggableScroll } from './useDraggableScroll';
import type { GroupedMedia } from './thumbnailGrid.types';
import {
    FeedItem,
    FeedContent,
    HorizontalScroll,
    HorizontalItem,
    CountBadge,
    NavButton
} from './ThumbnailGrid.styles';

// Progress bar styles
const ProgressBarContainer = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
`;

const ProgressBarFill = styled.div<{ $progress: number }>`
    height: 100%;
    background: linear-gradient(90deg, #8b5cf6 0%, #a855f7 50%, #c084fc 100%);
    width: ${props => props.$progress}%;
    transition: width 0.1s linear;
    box-shadow: 0 0 8px rgba(168, 85, 247, 0.6);
`;

interface FeedCardProps {
    group: GroupedMedia;
    getFullUrl: (url: string) => string;
    onReportError: (id: string) => void;
    globalVolume: number;
}

/**
 * FeedCard - Individual card for Swipe mode
 * Displays media in a horizontal scrollable carousel
 */
export const FeedCard = ({ group, getFullUrl, onReportError, globalVolume }: FeedCardProps) => {
    const [index, setIndex] = useState(0);
    const [videoProgress, setVideoProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const animationRef = useRef<number | null>(null);
    const { ref: inViewRef, inView } = useInView({ threshold: 0.6 });
    const { ref: scrollRef, ...dragProps } = useDraggableScroll();

    // Sync index based on scroll position
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const newIndex = Math.round(target.scrollLeft / target.clientWidth);
        if (newIndex !== index) setIndex(newIndex);
    };

    // Better approach: Capture node in a separate ref like TwitterFeedCard
    const [cardNode, setCardNode] = useState<HTMLDivElement | null>(null);
    const setRefs = useCallback((node: HTMLDivElement | null) => {
        inViewRef(node);
        setCardNode(node);
    }, [inViewRef]);

    useEffect(() => {
        if (!cardNode) return;

        const videos = cardNode.querySelectorAll('video');

        if (!inView) {
            // Not in view: pause ALL videos in this card
            videos.forEach(video => {
                video.pause();
                video.muted = true;
            });
        } else {
            // In view: pause all except current, play current
            videos.forEach((video, idx) => {
                if (idx === index) {
                    video.muted = false;
                    video.volume = globalVolume;
                    video.play().catch(() => { });
                } else {
                    video.pause();
                    video.muted = true;
                }
            });
        }
    }, [inView, index, cardNode, globalVolume]);

    const scrollTo = (idx: number) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                left: idx * scrollRef.current.clientWidth,
                behavior: 'smooth'
            });
        }
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        const next = (index + 1) % group.media.length;
        scrollTo(next);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        const prev = (index - 1 + group.media.length) % group.media.length;
        scrollTo(prev);
    };

    // Keyboard Navigation (Horizontal)
    useEffect(() => {
        if (!inView) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev({ stopPropagation: () => { } } as React.MouseEvent);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext({ stopPropagation: () => { } } as React.MouseEvent);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inView, index, group.media.length]);

    // Video Progress Tracking for Progress Bar
    useEffect(() => {
        const currentMedia = group.media[index];
        const isCurrentVideo = currentMedia?.type === 'video';

        if (!inView || !isCurrentVideo || !cardNode) {
            setVideoProgress(0);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            return;
        }

        const updateProgress = () => {
            const videos = cardNode.querySelectorAll('video');
            const currentVideo = videos[index] as HTMLVideoElement | undefined;

            if (currentVideo && currentVideo.duration && isFinite(currentVideo.duration)) {
                const progress = (currentVideo.currentTime / currentVideo.duration) * 100;
                setVideoProgress(progress);
            }

            animationRef.current = requestAnimationFrame(updateProgress);
        };

        animationRef.current = requestAnimationFrame(updateProgress);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [inView, index, cardNode, group.media]);

    return (
        <FeedItem ref={setRefs}>
            <HorizontalScroll
                ref={scrollRef}
                onScroll={handleScroll}
                {...dragProps}
            >
                {group.media.map((item, mIdx) => (
                    <HorizontalItem key={item.id}>
                        <FeedContent>
                            {item.type === 'video' ? (
                                <video
                                    ref={mIdx === index ? videoRef : null}
                                    src={getFullUrl(item.minioUrl)}
                                    controls
                                    loop
                                    playsInline
                                    onError={() => onReportError(item.id)}
                                />
                            ) : (
                                <img
                                    src={getFullUrl(item.minioUrl)}
                                    alt="feed"
                                    onError={() => onReportError(item.id)}
                                />
                            )}


                        </FeedContent>
                    </HorizontalItem>
                ))}
            </HorizontalScroll>

            {group.media.length > 1 && (
                <>
                    <CountBadge style={{ top: '10px', right: '10px', fontSize: '12px', padding: '4px 8px', pointerEvents: 'none' }}>
                        {index + 1}/{group.media.length}
                    </CountBadge>
                    <NavButton className="prev" onClick={handlePrev} style={{ zIndex: 10 }}>‹</NavButton>
                    <NavButton className="next" onClick={handleNext} style={{ zIndex: 10 }}>›</NavButton>
                </>
            )}

            {/* Video Progress Bar - Only show when current item is a video */}
            {group.media[index]?.type === 'video' && (
                <ProgressBarContainer>
                    <ProgressBarFill $progress={videoProgress} />
                </ProgressBarContainer>
            )}
        </FeedItem>
    );
};
