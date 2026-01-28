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

  img, video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
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
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  z-index: 2;
  font-family: monospace;
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
  font-size: 30px;
  cursor: pointer;
  padding: 20px;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1005;
  border-radius: 50%;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;

  &:hover { background: rgba(255,255,255,0.2); }
  
  &.prev { left: 10px; }
  &.next { right: 10px; }
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
    const { ref, inView } = useInView({
        threshold: 0.6,
    });

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = 0.5;
            if (inView) {
                videoRef.current.play().catch(() => {
                    // Autoplay might be blocked if no user interaction yet
                });
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0; // Optional: Reset to start when out of view
            }
        }
    }, [inView, index]);

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIndex((prev) => (prev + 1) % group.media.length);
    };

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIndex((prev) => (prev - 1 + group.media.length) % group.media.length);
    };

    // Keyboard Navigation (Horizontal)
    useEffect(() => {
        if (!inView) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setIndex((prev) => (prev - 1 + group.media.length) % group.media.length);
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                setIndex((prev) => (prev + 1) % group.media.length);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [inView, group.media.length]);

    const currentItem = group.media[index];

    return (
        <FeedItem ref={ref}>
            <FeedContent>
                {group.media.length > 1 && (
                    <CountBadge style={{ top: '10px', right: '10px', fontSize: '12px', padding: '4px 8px' }}>
                        {index + 1}/{group.media.length}
                    </CountBadge>
                )}
                {group.media.length > 1 && (
                    <NavButton className="prev" onClick={handlePrev}>‹</NavButton>
                )}

                {currentItem.type === 'video' ? (
                    <video
                        ref={videoRef}
                        src={getFullUrl(currentItem.minioUrl)}
                        controls
                        loop
                        playsInline
                        onError={() => onReportError(currentItem.id)}
                    />
                ) : (
                    <img
                        src={getFullUrl(currentItem.minioUrl)}
                        alt="feed"
                        onError={() => onReportError(currentItem.id)}
                    />
                )}

                {currentItem.type === 'video' && currentItem.duration && (
                    <DurationBadge style={{ bottom: '20px', right: '20px', fontSize: '13px', padding: '4px 8px' }}>
                        {formatDuration(currentItem.duration)}
                    </DurationBadge>
                )}

                {group.media.length > 1 && (
                    <NavButton className="next" onClick={handleNext}>›</NavButton>
                )}
            </FeedContent>

        </FeedItem>
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
    const [errorInfo, setErrorInfo] = useState<string | null>(null);

    // Header States
    const [showVideos, setShowVideos] = useState(true);
    const [showImages, setShowImages] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'feed'>('list');

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
    }, [viewMode, loadFeed]); // loadFeed depends on filters, so this triggers on filter change too

    useEffect(() => {
        if (viewMode === 'list' && inView && hasMore && !loading) {
            loadList();
        }
        if (viewMode === 'feed' && feedInView && !feedLoading) {
            loadFeed();
        }
    }, [inView, feedInView, hasMore, loading, feedLoading, viewMode, loadFeed]);

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
                    type: typeParam
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

    const handleGroupClick = (group: GroupedMedia) => {
        setSelectedGroup(group);
        setSelectedIndex(0);
    };

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!selectedGroup) return;
        setSelectedIndex(prev => (prev + 1) % selectedGroup.media.length);
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        if (!selectedGroup) return;
        setSelectedIndex(prev => (prev - 1 + selectedGroup.media.length) % selectedGroup.media.length);
    };

    // Touch Handling for Swipe
    const touchStartX = useRef(0);
    const touchEndX = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.targetTouches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.targetTouches[0].clientX;
    };

    const handleTouchEnd = () => {
        if (!touchStartX.current || !touchEndX.current) return;
        const diff = touchStartX.current - touchEndX.current;
        const threshold = 50;

        if (diff > threshold) {
            handleNext();
        } else if (diff < -threshold) {
            handlePrev();
        }
        touchStartX.current = 0;
        touchEndX.current = 0;
    };

    // Keyboard Navigation for Feed
    useEffect(() => {
        if (viewMode !== 'feed') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const container = document.querySelector('.feed-container');
                if (container) {
                    container.scrollBy({ top: window.innerHeight, behavior: 'smooth' });

                    // Pre-load trigger if near bottom
                    const remaining = container.scrollHeight - (container.scrollTop + container.clientHeight);
                    if (remaining < window.innerHeight * 2) { // Determine if within 2 screens of bottom
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

            // Update State
            const updatedMedia = group.media.filter(m => m.id !== id);

            if (updatedMedia.length === 0) {
                // Remove entire group if empty
                setGroups(prev => prev.filter(g => g.discordMessageId !== group.discordMessageId));
                setSelectedGroup(null);
            } else {
                // Update group
                const newGroup = { ...group, media: updatedMedia };
                setGroups(prev => prev.map(g => g.discordMessageId === group.discordMessageId ? newGroup : g));
                setSelectedGroup(newGroup);
                // Adjust index if needed
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

    return (
        <>
            <Header>
                <ControlGroup>
                    <ToggleButton
                        $active={viewMode === 'list'}
                        onClick={() => setViewMode('list')}
                    >
                        List
                    </ToggleButton>
                    <ToggleButton
                        $active={viewMode === 'feed'}
                        onClick={() => setViewMode('feed')}
                    >
                        Feed
                    </ToggleButton>

                    <Separator />

                    <ToggleButton
                        $active={showVideos}
                        onClick={() => setShowVideos(!showVideos)}
                    >
                        Videos
                    </ToggleButton>
                    <ToggleButton
                        $active={showImages}
                        onClick={() => setShowImages(!showImages)}
                    >
                        Images
                    </ToggleButton>
                </ControlGroup>

                {viewMode === 'list' && (
                    <ControlGroup>
                        <SliderLabel>
                            Size:
                            <RangeInput
                                type="range"
                                min="80"
                                max="500"
                                step="10"
                                value={gridSize}
                                onChange={(e) => setGridSize(Number(e.target.value))}
                            />
                        </SliderLabel>
                    </ControlGroup>
                )}
            </Header>

            {viewMode === 'list' ? (
                <GridContainer style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${gridSize}px, 1fr))` }}>
                    {groups.map(group => {
                        const cover = group.media[0];
                        return (
                            <Thumbnail key={group.discordMessageId} onClick={() => handleGroupClick(group)}>
                                <TypeBadge>{cover.type}</TypeBadge>
                                {group.media.length > 1 && (
                                    <CountBadge>1/{group.media.length}</CountBadge>
                                )}
                                {cover.type === 'video' && cover.duration && (
                                    <DurationBadge>{formatDuration(cover.duration)}</DurationBadge>
                                )}
                                {cover.thumbnailUrl ? (
                                    <img src={getFullUrl(cover.thumbnailUrl)} alt="cover" loading="lazy" />
                                ) : cover.type === 'video' ? (
                                    <video src={getFullUrl(cover.minioUrl)} muted loop />
                                ) : (
                                    <img src={getFullUrl(cover.minioUrl)} alt="cover" loading="lazy" />
                                )}
                            </Thumbnail>
                        );
                    })}

                    {hasMore && (
                        <Loading ref={ref} onClick={() => loadList()}>
                            {errorInfo ? <span style={{ color: '#ff4444' }}>{errorInfo}</span> : (loading ? 'Loading...' : 'Tap for more')}
                        </Loading>
                    )}

                    {!loading && !errorInfo && groups.length === 0 && (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px', color: '#8b949e' }}>
                            No results found.
                        </div>
                    )}
                </GridContainer>
            ) : (
                <FeedContainer className="feed-container">
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
                    {errorInfo && <div style={{ color: '#ff4444', textAlign: 'center', padding: '20px' }}>{errorInfo}</div>}
                </FeedContainer>
            )}

            {selectedGroup && viewMode === 'list' && (
                <Overlay onClick={() => setSelectedGroup(null)}>
                    <CloseButton onClick={(e) => { e.stopPropagation(); setSelectedGroup(null); }}>×</CloseButton>

                    <ModalContainer
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {selectedGroup.media.length > 1 && (
                            <NavButton className="prev" onClick={handlePrev}>‹</NavButton>
                        )}

                        <ModalContentWrapper>
                            <MediaContent onClick={e => e.stopPropagation()}>
                                {(() => {
                                    const item = selectedGroup.media[selectedIndex];
                                    return item.type === 'video' ? (
                                        <video
                                            key={item.id}
                                            src={getFullUrl(item.minioUrl)}
                                            controls
                                            autoPlay
                                            loop
                                            playsInline
                                            ref={el => { if (el) el.volume = 0.5; }}
                                        />
                                    ) : (
                                        <img src={getFullUrl(item.minioUrl)} alt="full" />
                                    );
                                })()}
                            </MediaContent>
                        </ModalContentWrapper>

                        {selectedGroup.media.length > 1 && (
                            <NavButton className="next" onClick={handleNext}>›</NavButton>
                        )}

                        <InfoPanel onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1, marginRight: '16px' }}>
                                    <small style={{ color: '#8b949e', display: 'block', marginBottom: '8px' }}>
                                        {/* Use discordCreatedAt if available, else createdAt */}
                                        {new Date(selectedGroup.discordCreatedAt || selectedGroup.createdAt).toLocaleString()} • {selectedIndex + 1}/{selectedGroup.media.length}
                                    </small>
                                    <MessageText>{selectedGroup.content || '(No Text Content)'}</MessageText>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                                    <ButtonLink
                                        href={`https://discord.com/channels/@me/${selectedGroup.originalChannel}/${selectedGroup.discordMessageId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Discord
                                    </ButtonLink>
                                    <button
                                        style={{
                                            background: '#2ba44e',
                                            border: 'none',
                                            color: 'white',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                        onClick={() => handleRedownload(selectedGroup.media[selectedIndex].id)}
                                    >
                                        Re-download
                                    </button>
                                    <button
                                        style={{
                                            background: '#da3633',
                                            border: 'none',
                                            color: 'white',
                                            padding: '6px 12px',
                                            borderRadius: '6px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            fontWeight: 'bold'
                                        }}
                                        onClick={() => handleDelete(selectedGroup.media[selectedIndex].id, selectedGroup)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </InfoPanel>
                    </ModalContainer>
                </Overlay>
            )}
        </>
    );
};
