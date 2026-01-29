import styled from 'styled-components';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import api from '../api';

import axios from 'axios';

const GridContainer = styled.div`
  display: grid;
  // Mobile first: smaller thumbs (2-3 per row)
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 8px;
  padding: 8px;
  background-color: #0d1117;
  min-height: 100vh;

  // PC: larger thumbs
  @media (min-width: 768px) {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    padding: 16px;
  }
`;

const Thumbnail = styled.div`
  aspect-ratio: 1;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background-color: #222;
  cursor: pointer;
  border: 1px solid #333;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 10;
  }

  /* Collage Support */
  display: grid;
  &.collage-1 { grid-template-columns: 1fr; }
  &.collage-2 { grid-template-columns: 1fr 1fr; }
  &.collage-3 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; } 
  &.collage-3 > :first-child { grid-row: 1 / -1; } /* Left half big */
  &.collage-4 { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; }

  /* 5-9: 3x3 grid */
  &.collage-multi { 
      grid-template-columns: repeat(3, 1fr); 
      grid-template-rows: repeat(3, 1fr); 
  }
`;

const CollageImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

const CollageVideo = styled.video`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

const TypeBadge = styled.div`
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  text-transform: uppercase;
  z-index: 2;
`;

const CountBadge = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  z-index: 2;
`;

const DurationBadge = styled.div`
  position: absolute;
  bottom: 6px;
  right: 6px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(2px);
  color: white;
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  z-index: 5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  letter-spacing: 0.5px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.3);
`;

const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (h > 0) parts.push(h);
    parts.push(h > 0 ? String(m).padStart(2, '0') : m);
    parts.push(String(s).padStart(2, '0'));

    return parts.join(':');
};

const HorizontalScroll = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  cursor: grab;
  &:active { cursor: grabbing; }
`;

const HorizontalItem = styled.div`
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
`;

/**
 * Custom hook to enable dragging scroll with mouse
 */
const useDraggableScroll = () => {
    const ref = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const onMouseDown = (e: React.MouseEvent) => {
        if (!ref.current) return;
        setIsDragging(true);
        setStartX(e.pageX - ref.current.offsetLeft);
        setScrollLeft(ref.current.scrollLeft);
    };

    const onMouseLeave = () => {
        setIsDragging(false);
    };

    const onMouseUp = () => {
        setIsDragging(false);
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !ref.current) return;
        e.preventDefault();
        const x = e.pageX - ref.current.offsetLeft;
        const walk = (x - startX) * 4; // scroll-fast x2
        ref.current.scrollLeft = scrollLeft - walk;
    };

    return {
        ref,
        onMouseDown,
        onMouseLeave,
        onMouseUp,
        onMouseMove
    };
};

const Loading = styled.div`
  grid-column: 1 / -1;
  text-align: center;
  padding: 30px;
  color: #8b949e;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.96);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const ModalContentWrapper = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-height: 85vh; /* Reserve space for info panel */
  position: relative;
`;

// Only this element stops propagation (the actual content)
const MediaContent = styled.div`
  max-width: 100%;
  max-height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;

  img, video {
    max-width: 100%;
    max-height: 80vh; 
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 0 30px rgba(0,0,0,0.6);
  }
`;

const InfoPanel = styled.div`
  background: #161b22;
  padding: 16px;
  border-top: 1px solid #30363d;
  width: 100%;
  color: #c9d1d9;
  z-index: 1002;
  /* Make panel sit at bottom properly */
  min-height: 15vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const MessageText = styled.div`
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: #e6edf3;
  max-height: 100px;
  overflow-y: auto;
`;

const ButtonLink = styled.a`
  display: inline-block;
  background: #238636;
  color: white;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  
  &:hover {
    background: #2ea043;
  }
`;

const NavButton = styled.button`
  background: rgba(0,0,0,0.3);
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1005;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover { background: rgba(255,255,255,0.2); }
  
  &.prev { left: 10px; }
  &.next { right: 10px; }

  @media (max-width: 768px) {
    display: none;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
  z-index: 2000;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
`;

const FeedContainer = styled.div`
  width: 100%;
  height: calc(100vh - 65px); // Header height approx
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  overscroll-behavior-y: contain;
  background: #000;
  position: relative;

  /* Hide scrollbar */
  &::-webkit-scrollbar { display: none; }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const FeedItem = styled.div`
  width: 100%;
  height: 100%;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #000;
`;

const FeedContent = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    position: relative;

    img, video {
        max-width: 100%;
        max-height: 100%;
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
`;


// Helper component for individual feed card
const FeedCard = ({ group, getFullUrl, onReportError }: { group: GroupedMedia, getFullUrl: (u: string) => string, onReportError: (id: string) => void }) => {
    const [index, setIndex] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { ref: inViewRef, inView } = useInView({ threshold: 0.6 });
    const { ref: scrollRef, ...dragProps } = useDraggableScroll();

    // Sync index based on scroll position
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        const newIndex = Math.round(target.scrollLeft / target.clientWidth);
        if (newIndex !== index) setIndex(newIndex);
    };

    // Keep video logic, but only for the CURRENT item in visual field
    useEffect(() => {
        // Pause ALL videos in this card first to prevent overlap
        if (inView) { // Assuming we can access the container via a ref or query selector
            // We'll rely on side-effect of videoRef being the ONLY one active?
            // No, we need to pause others.
            // Let's use `inViewRef` (which is the FeedItem root) to find all videos.
            // However, `inViewRef` from `useInView` might not expose the underlying node directly if it's a callback ref.
            // `react-intersection-observer`'s `ref` IS a callback.
            // We need to capture the node.
        }
    }, [inView, index]);

    // Better approach: Capture node in a separate ref like TwitterFeedCard
    const [cardNode, setCardNode] = useState<HTMLDivElement | null>(null);
    const setRefs = useCallback((node: HTMLDivElement | null) => {
        inViewRef(node);
        setCardNode(node);
    }, [inViewRef]);

    useEffect(() => {
        if (!cardNode) return;

        const videos = cardNode.querySelectorAll('video');
        videos.forEach(video => {
            // We can identify the current video by checking if it matches videoRef.current
            // OR we can just pause all, and then play videoRef.current
            video.pause();
        });

        if (inView && videoRef.current) {
            videoRef.current.volume = 0.5;
            videoRef.current.play().catch(() => { });
        }
    }, [inView, index, cardNode]);

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
                handlePrev({ stopPropagation: () => { } } as any);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext({ stopPropagation: () => { } } as any);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inView, index, group.media.length]);

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
        </FeedItem>
    );
};

// Twitter/Infinite Feed Style Components
const TwitterCardContainer = styled.div`
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 12px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  width: 100%;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #8b949e;
`;

const CardContent = styled.div`
  margin-bottom: 12px;
  white-space: pre-wrap;
  font-size: 15px;
  line-height: 1.5;
  color: #e6edf3;
  word-break: break-word; /* Prevent overflow */
`;

const AttachmentScroll = styled.div`
  display: flex;
  overflow-x: auto;
  gap: 8px;
  scroll-behavior: smooth;
  padding-bottom: 4px; /* Space for scrollbar */
  
  &::-webkit-scrollbar { height: 10px; }
  &::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
  &::-webkit-scrollbar-thumb { background: #30363d; border-radius: 5px; border: 2px solid #161b22; }
  &::-webkit-scrollbar-thumb:hover { background: #58a6ff; }
  cursor: grab;
  &:active { cursor: grabbing; }
`;

const AttachmentItem = styled.div<{ $isSingle?: boolean }>`
  flex: 0 0 auto;
  width: ${props => props.$isSingle ? '100%' : '85%'};
  max-height: 600px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #30363d;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0d1117;
`;

const TwitterFeedCard = ({ group, getFullUrl, onZoom }: { group: GroupedMedia, getFullUrl: (url: string) => string, onZoom: (url: string, type: 'image' | 'video') => void }) => {
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
            if (inView) {
                // Try playing. Muted is usually required for auto-play
                video.play().catch(() => { });
            } else {
                video.pause();
            }
        });
    }, [inView, cardNode]);


    // Drag Scroll Logic
    const scrollRef = useRef<HTMLDivElement>(null);
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollRef.current) return;
        setIsDown(true);
        setStartX(e.pageX - scrollRef.current.offsetLeft);
        setScrollLeft(scrollRef.current.scrollLeft);
    };

    const handleMouseLeave = () => setIsDown(false);
    const handleMouseUp = () => setIsDown(false);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDown || !scrollRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll-fast
        scrollRef.current.scrollLeft = scrollLeft - walk;
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
                                muted // Required for auto-play
                                style={{ maxWidth: '100%', maxHeight: '600px', display: 'block' }}
                            />
                        ) : (
                            <img
                                src={getFullUrl(item.minioUrl)}
                                alt="attachment"
                                loading="lazy"
                                style={{ maxWidth: '100%', maxHeight: '600px', display: 'block', cursor: 'zoom-in' }}
                                onClick={() => onZoom(getFullUrl(item.minioUrl), 'image')}
                                onDragStart={(e) => e.preventDefault()} // Prevent image drag
                            />
                        )}
                    </AttachmentItem>
                ))}
            </AttachmentScroll>
        </TwitterCardContainer>
    );
};

// Controls Bar
const Header = styled.header`
  padding: 12px 16px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 100;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const ToggleButton = styled.button<{ $active?: boolean; $disabled?: boolean }>`
  background: ${props => props.$active ? '#238636' : '#21262d'};
  color: ${props => props.$active ? 'white' : '#c9d1d9'};
  border: 1px solid ${props => props.$active ? '#2ea043' : '#30363d'};
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.5 : 1};
  transition: all 0.2s;

  &:hover {
    background: ${props => props.$disabled ? '#21262d' : (props.$active ? '#2ea043' : '#30363d')};
  }
`;

const Separator = styled.div`
  width: 1px;
  height: 20px;
  background: #30363d;
  margin: 0 4px;
`;

const SliderLabel = styled.label`
  color: #c9d1d9;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RangeInput = styled.input`
  cursor: pointer;
  accent-color: #238636;
`;

interface MediaItem {
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

interface GroupedMedia {
    discordMessageId: string;
    originalChannel: string;
    content: string;
    createdAt: string;
    discordCreatedAt?: string;
    media: MediaItem[];
}

export const ThumbnailGrid = () => {
    const [groups, setGroups] = useState<GroupedMedia[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<GroupedMedia | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [gridSize, setGridSize] = useState(200); // Default px size
    const [sortBy, setSortBy] = useState<'fetch' | 'discord'>('fetch');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
    const [errorInfo, setErrorInfo] = useState<string | null>(null);
    const [isZoomed, setIsZoomed] = useState(false); // Zoom state for detail view
    const [searchQuery, setSearchQuery] = useState('');

    // Header States
    const [showVideos, setShowVideos] = useState(true);
    const [showImages, setShowImages] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'swipe' | 'feed'>('list');

    // Feed Mode States
    const [feedItems, setFeedItems] = useState<GroupedMedia[]>([]);
    const [feedLoading, setFeedLoading] = useState(false);
    const excludeIdsRef = useRef<string[]>([]);

    // List Observer
    const [ref, inView] = useInView({
        threshold: 0.1,
        rootMargin: '400px', // Load earlier
        triggerOnce: false,
    });

    // Feed Observer
    const [feedRef, feedInView] = useInView({
        threshold: 0.1,
        rootMargin: '800px', // Preload aggressive
        triggerOnce: false
    });

    const loadingRef = useRef(false);

    const loadFeed = useCallback(async () => {
        if (loadingRef.current) return;
        // setFeedLoading(true); // Rely on ref to prevent double-fetch strictness
        // Actually feedLoading state is used for UI spinner, but let's use a ref for logic safety if needed.
        // Re-using feedLoading state is fine if we check it.

        // We need to access the LATEST state in this callback? 
        // loadFeed closure will be refreshed if we put dependencies in useCallback.

        // Let's rely on refs for exclusion logic which is already there.
        // showVideos/showImages are state.

        loadingRef.current = true;
        setFeedLoading(true);

        try {
            let typeParam: string | undefined = undefined;
            if (showVideos && !showImages) typeParam = 'video';
            if (!showVideos && showImages) typeParam = 'image';
            if (!showVideos && !showImages) {
                setFeedItems([]);
                return;
            }

            // Exclude last 20 loaded IDs to avoid frequent repeats
            const excludes = excludeIdsRef.current.slice(-20).join(',');

            const response = await api.get('/feed/random', {
                params: {
                    limit: 5,
                    type: typeParam,
                    exclude: excludes
                }
            });
            const newItems = response.data;

            if (newItems.length > 0) {
                setFeedItems(prev => [...prev, ...newItems]);
                const newIds = newItems.map((g: GroupedMedia) => g.discordMessageId);
                excludeIdsRef.current = [...excludeIdsRef.current, ...newIds];
            }
        } catch (err: any) {
            console.error(err);
            if (!axios.isCancel(err)) {
                if (err.response?.status === 502 || err.code === 'ERR_NETWORK') {
                    setErrorInfo('Backend Unavailable (502). Retrying stopped.');
                    // Stop further random fetches? Maybe just show error.
                    // For feed, we might want to let user retry manually?
                }
            }
        } finally {
            setFeedLoading(false);
            loadingRef.current = false;
        }
    }, [showVideos, showImages]);

    // Initial load and mode/filter change
    useEffect(() => {
        setGroups([]);
        setFeedItems([]);
        setHasMore(true);
        setErrorInfo(null);
        excludeIdsRef.current = [];
        loadingRef.current = false;

        if (viewMode === 'list') {
            loadList(true);
        } else {
            loadFeed();
        }
    }, [viewMode, loadFeed, sortBy, sortOrder]); // Added sortOrder

    useEffect(() => {
        if (viewMode === 'list' && inView && hasMore && !loading) {
            loadList();
        }
        if ((viewMode === 'feed' || viewMode === 'swipe') && feedInView && !feedLoading) {
            loadFeed();
        }
    }, [inView, feedInView, hasMore, loading, feedLoading, viewMode, loadFeed, sortBy, sortOrder]);

    // Swipe Mode Keyboard Navigation (Global)
    const feedContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (viewMode !== 'swipe') return;
        const handleKeys = (e: KeyboardEvent) => {
            if (!feedContainerRef.current) return;
            const container = feedContainerRef.current;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                container.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [viewMode]);

    const loadList = async (isReset = false) => {
        if (loadingRef.current || (!hasMore && !isReset)) return;
        loadingRef.current = true;
        setLoading(true);

        try {
            const currentOffset = isReset ? 0 : groups.length;
            const limit = 20;

            // Determine type filter
            let typeParam: string | undefined = undefined;
            if (showVideos && !showImages) typeParam = 'video';
            if (!showVideos && showImages) typeParam = 'image';
            if (!showVideos && !showImages) {
                setGroups([]);
                setHasMore(false);
                return;
            }

            const response = await api.get('/feed/list', {
                params: {
                    limit,
                    offset: currentOffset,
                    type: typeParam,
                    sort: sortBy,
                    order: sortOrder,
                    search: searchQuery || undefined
                }
            });
            const newGroups = response.data;

            if (newGroups.length === 0) {
                if (isReset) setGroups([]);
                setHasMore(false);
            } else {
                if (newGroups.length < limit) setHasMore(false);

                setGroups(prev => {
                    const base = isReset ? [] : prev;
                    const existingIds = new Set(base.map(g => g.discordMessageId));
                    const uniqueNew = newGroups.filter((g: GroupedMedia) => !existingIds.has(g.discordMessageId));
                    return [...base, ...uniqueNew];
                });
            }
        } catch (err: any) {
            console.error(err);
            if (!axios.isCancel(err)) {
                if (err.response?.status === 502 || err.code === 'ERR_NETWORK') {
                    setErrorInfo('Failed to connect to backend (502 / Network Error).');
                    setHasMore(false); // Stop infinite scroll
                }
            }
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    };

    const handleReportError = async (id: string) => {
        console.warn(`[ThumbnailGrid] Reporting media error for id: ${id}`);
        try {
            await api.get(`/feed/error/${id}`);
        } catch (e) {
            console.error('[ThumbnailGrid] Failed to report error:', e);
        }

        if (viewMode === 'feed') {
            setFeedItems(prev => {
                return prev.map(g => ({
                    ...g,
                    media: g.media.filter(m => m.id !== id)
                })).filter(g => g.media.length > 0);
            });
        }
    };

    const getFullUrl = (url: string) => {
        let finalUrl = url;
        const token = localStorage.getItem('token');
        const tokenSuffix = token ? `&token=${token}` : '';

        if (finalUrl.includes('/feed/media/') && !finalUrl.includes('?key=')) {
            const parts = finalUrl.split('/feed/media/');
            if (parts.length === 2) {
                const key = parts[1];
                finalUrl = `/feed/media?key=${encodeURIComponent(key)}${tokenSuffix}`;
            }
        } else if (finalUrl.includes('/feed/media?key=')) {
            // Already converted but might need token
            if (!finalUrl.includes('&token=')) {
                finalUrl += tokenSuffix;
            }
        }

        if (finalUrl.startsWith('http')) return finalUrl;
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        return `${baseUrl}${finalUrl}`;
    };

    const isFeedLoadingRef = useRef(false);

    const { ref: modalScrollRef, onMouseUp: onModalMouseUp, onMouseDown: onModalMouseDown, onMouseMove: onModalMouseMove, onMouseLeave: onModalMouseLeave } = useDraggableScroll();
    const modalDragProps = { onMouseUp: onModalMouseUp, onMouseDown: onModalMouseDown, onMouseMove: onModalMouseMove, onMouseLeave: onModalMouseLeave };

    // Sync modal index on scroll
    const handleModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.clientWidth === 0) return;
        const newIndex = Math.round(target.scrollLeft / target.clientWidth);
        if (newIndex !== selectedIndex && !isZoomed) {
            setSelectedIndex(newIndex);
        }
    };

    const modalScrollTo = (idx: number) => {
        if (modalScrollRef.current) {
            modalScrollRef.current.scrollTo({
                left: idx * modalScrollRef.current.clientWidth,
                behavior: 'smooth'
            });
        }
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!selectedGroup) return;
        const next = (selectedIndex + 1) % selectedGroup.media.length;
        modalScrollTo(next);
        setIsZoomed(false);
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!selectedGroup) return;
        const prev = (selectedIndex - 1 + selectedGroup.media.length) % selectedGroup.media.length;
        modalScrollTo(prev);
        setIsZoomed(false);
    };

    // Keyboard Navigation for Feed and Modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedGroup) return;

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'Escape') {
                setSelectedGroup(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedGroup, selectedIndex]);
    // Keyboard Navigation for Feed
    useEffect(() => {
        if (viewMode !== 'feed') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const container = document.querySelector('.feed-container');
                if (container) {
                    container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });
                    const remaining = container.scrollHeight - (container.scrollTop + container.clientHeight);
                    if (remaining < window.innerHeight * 2) {
                        loadFeed();
                    }
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const container = document.querySelector('.feed-container');
                if (container) {
                    container.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, loadFeed]);

    const handleDelete = async (id: string, group: GroupedMedia) => {
        if (!window.confirm('Are you sure you want to delete this media? This cannot be undone.')) return;
        try {
            await api.delete(`/feed/${id}`);
            const updatedMedia = group.media.filter(m => m.id !== id);
            if (updatedMedia.length === 0) {
                setGroups(prev => prev.filter(g => g.discordMessageId !== group.discordMessageId));
                setFeedItems(prev => prev.filter(g => g.discordMessageId !== group.discordMessageId));
                setSelectedGroup(null);
            } else {
                const newGroup = { ...group, media: updatedMedia };
                setGroups(prev => prev.map(g => g.discordMessageId === group.discordMessageId ? newGroup : g));
                setFeedItems(prev => prev.map(g => g.discordMessageId === group.discordMessageId ? newGroup : g));
                setSelectedGroup(newGroup);
                if (selectedIndex >= updatedMedia.length) {
                    setSelectedIndex(Math.max(0, updatedMedia.length - 1));
                }
            }
        } catch (err) {
            console.error('Failed to delete media:', err);
            alert('Failed to delete media.');
        }
    };

    const handleRedownload = async (id: string) => {
        if (!confirm('Re-download this media? This will delete the current file and fetch it again from Discord.')) return;
        try {
            await api.post(`/feed/${id}/redownload`);
            alert('Redownload started! Please refresh in a moment.');
        } catch (err) {
            console.error('Failed to redownload:', err);
            alert('Failed to redownload.');
        }
    };

    const handleGroupClick = (group: GroupedMedia) => {
        setSelectedGroup(group);
        setSelectedIndex(0);
        if (modalScrollRef.current) modalScrollRef.current.scrollLeft = 0;
    };

    return (
        <>
            <Header>
                <ControlGroup>
                    <ToggleButton $active={viewMode === 'list'} onClick={() => setViewMode('list')}>List</ToggleButton>
                    <ToggleButton $active={viewMode === 'swipe'} onClick={() => setViewMode('swipe')}>Swipe</ToggleButton>
                    <ToggleButton $active={viewMode === 'feed'} onClick={() => setViewMode('feed')}>Feed</ToggleButton>

                    <Separator />
                    <ToggleButton $active={showVideos} onClick={() => setShowVideos(!showVideos)}>Videos</ToggleButton>
                    <ToggleButton $active={showImages} onClick={() => setShowImages(!showImages)}>Images</ToggleButton>
                </ControlGroup>

                {viewMode === 'list' && (
                    <ControlGroup>
                        <ToggleButton
                            $active={sortBy === 'fetch'}
                            onClick={() => {
                                if (sortBy === 'fetch') setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC');
                                else { setSortBy('fetch'); setSortOrder('DESC'); }
                                setGroups([]); setHasMore(true);
                            }}
                        >
                            Sort: Fetch {sortBy === 'fetch' && (sortOrder === 'DESC' ? '↓' : '↑')}
                        </ToggleButton>
                        <ToggleButton
                            $active={sortBy === 'discord'}
                            onClick={() => {
                                if (sortBy === 'discord') setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC');
                                else { setSortBy('discord'); setSortOrder('DESC'); }
                                setGroups([]); setHasMore(true);
                            }}
                        >
                            Sort: Date {sortBy === 'discord' && (sortOrder === 'DESC' ? '↓' : '↑')}
                        </ToggleButton>
                    </ControlGroup>
                )}
                <SliderLabel>
                    Size:
                    <RangeInput
                        type="range" min="80" max="500" step="10"
                        value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))}
                    />
                </SliderLabel>
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            setGroups([]); setHasMore(true);
                        }
                    }}
                    style={{
                        marginLeft: '16px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid #30363d',
                        backgroundColor: '#0d1117',
                        color: 'white'
                    }}
                />
            </Header>

            {viewMode === 'list' && (
                <GridContainer style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize}px, 1fr))` }}>
                    {groups.map(group => {
                        const count = group.media.length;
                        let collageClass = 'collage-1';
                        if (count === 2) collageClass = 'collage-2';
                        else if (count === 3) collageClass = 'collage-3';
                        else if (count === 4) collageClass = 'collage-4';
                        else if (count >= 5) collageClass = 'collage-multi';

                        const displayItems = group.media.slice(0, 9);
                        const remainder = count - 9;

                        return (
                            <Thumbnail
                                key={group.discordMessageId}
                                onClick={() => handleGroupClick(group)}
                                className={collageClass}
                            >
                                {displayItems.map((item, idx) => {
                                    const isVideo = item.type === 'video';
                                    const showOverlay = idx === 8 && remainder > 0;
                                    return (
                                        <div key={item.id} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
                                            {item.thumbnailUrl ? (
                                                <CollageImage src={getFullUrl(item.thumbnailUrl)} alt="thumb" loading="lazy" />
                                            ) : isVideo ? (
                                                <CollageVideo src={getFullUrl(item.minioUrl)} muted loop />
                                            ) : (
                                                <CollageImage src={getFullUrl(item.minioUrl)} alt="thumb" loading="lazy" />
                                            )}
                                            {count === 1 && isVideo && item.duration && (
                                                <DurationBadge>{formatDuration(item.duration)}</DurationBadge>
                                            )}
                                            {showOverlay && (
                                                <div style={{
                                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '18px', fontWeight: 'bold'
                                                }}>
                                                    +{remainder}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                {count === 1 && <TypeBadge>{group.media[0].type}</TypeBadge>}
                                {count > 1 && <CountBadge>{count}</CountBadge>}
                            </Thumbnail>
                        );
                    })}
                    {hasMore && (
                        <Loading ref={ref} onClick={() => loadList()}>
                            {errorInfo ? <span style={{ color: '#ff4444' }}>{errorInfo}</span> : (loading ? 'Loading...' : 'Tap for more')}
                        </Loading>
                    )}
                </GridContainer>
            )}

            {
                viewMode === 'swipe' && (
                    <FeedContainer ref={feedContainerRef} className="feed-container">
                        {feedItems.map((group, idx) => (
                            <FeedCard
                                key={`${group.discordMessageId}-${idx}`}
                                group={group}
                                getFullUrl={getFullUrl}
                                onReportError={handleReportError}
                            />
                        ))}
                        <div ref={feedRef} style={{ height: '100px', width: '100%' }}></div>
                        {feedLoading && <div style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}>Loading more...</div>}
                    </FeedContainer>
                )
            }

            {
                viewMode === 'feed' && (
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
                        {feedItems.map((group, idx) => (
                            <TwitterFeedCard
                                key={`${group.discordMessageId}-feed-${idx}`}
                                group={group}
                                getFullUrl={getFullUrl}
                                onZoom={(url, type) => {
                                    setSelectedGroup(group);
                                }}
                            />
                        ))}
                        <div ref={feedRef} style={{ height: '50px', width: '100%' }}></div>
                        {feedLoading && <div style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}>Loading more...</div>}
                    </div>
                )
            }

            {
                selectedGroup && (
                    <Overlay onClick={() => setSelectedGroup(null)}>
                        <CloseButton onClick={(e) => { e.stopPropagation(); setSelectedGroup(null); }}>×</CloseButton>
                        <ModalContainer onClick={() => setSelectedGroup(null)} style={{ cursor: 'pointer' }}>
                            {/* Allow background click to close by removing stopPropagation from container, 
                        BUT properly stop it on interactive children */}
                            {selectedGroup.media.length > 1 && (
                                <NavButton className="prev" onClick={(e) => { e.stopPropagation(); handlePrev() }}>‹</NavButton>
                            )}
                            <ModalContentWrapper>
                                <HorizontalScroll
                                    ref={modalScrollRef}
                                    onScroll={handleModalScroll}
                                    {...modalDragProps}
                                >
                                    {selectedGroup.media.map((item, idx) => (
                                        <HorizontalItem key={item.id}>
                                            <MediaContent
                                                onClick={e => e.stopPropagation()}
                                                style={{
                                                    overflow: isZoomed && selectedIndex === idx ? 'auto' : 'hidden',
                                                    display: 'block'
                                                }}
                                            >
                                                {item.type === 'video' ? (
                                                    <video
                                                        key={item.id}
                                                        src={getFullUrl(item.minioUrl)}
                                                        controls autoPlay loop playsInline
                                                        ref={el => { if (el && idx === selectedIndex) el.volume = 0.5; }}
                                                        style={{ margin: 'auto', display: 'block', maxHeight: '80vh', maxWidth: '100%' }}
                                                    />
                                                ) : (
                                                    <img
                                                        src={getFullUrl(item.minioUrl)}
                                                        alt="full"
                                                        onClick={(e) => { e.stopPropagation(); setIsZoomed(!isZoomed); }}
                                                        style={{
                                                            cursor: isZoomed ? 'zoom-out' : 'zoom-in',
                                                            maxHeight: isZoomed ? 'none' : '80vh',
                                                            maxWidth: isZoomed ? 'none' : '100%',
                                                            width: isZoomed ? 'auto' : '100%',
                                                            display: 'block', margin: 'auto'
                                                        }}
                                                    />
                                                )}
                                            </MediaContent>
                                        </HorizontalItem>
                                    ))}
                                </HorizontalScroll>
                            </ModalContentWrapper>
                            {selectedGroup.media.length > 1 && (
                                <NavButton className="next" onClick={(e) => { e.stopPropagation(); handleNext() }}>›</NavButton>
                            )}
                            <InfoPanel onClick={e => e.stopPropagation()}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1, marginRight: '16px' }}>
                                        <small style={{ color: '#8b949e', display: 'block', marginBottom: '8px' }}>
                                            {new Date(selectedGroup.discordCreatedAt || selectedGroup.createdAt).toLocaleString()} • {selectedIndex + 1}/{selectedGroup.media.length}
                                        </small>
                                        <MessageText>{selectedGroup.content || '(No Text Content)'}</MessageText>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                        <ButtonLink
                                            href={`https://discord.com/channels/@me/${selectedGroup.originalChannel}/${selectedGroup.discordMessageId}`}
                                            target="_blank" rel="noopener noreferrer"
                                        >Discord</ButtonLink>
                                        <button style={{ background: '#2ba44e', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                            onClick={() => handleRedownload(selectedGroup.media[selectedIndex].id)}
                                        >Re-download</button>
                                        <button style={{ background: '#da3633', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                            onClick={() => handleDelete(selectedGroup.media[selectedIndex].id, selectedGroup)}
                                        >Delete</button>
                                    </div>
                                </div>
                            </InfoPanel>
                        </ModalContainer>
                    </Overlay>
                )
            }
        </>
    );
};
