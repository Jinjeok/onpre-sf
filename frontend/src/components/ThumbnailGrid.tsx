import { useEffect, useState, useRef, useCallback } from 'react';
import { useInView } from 'react-intersection-observer';
import api from '../api';
import axios from 'axios';

// Types
import type { GroupedMedia } from './thumbnailGrid.types';

// Utils
import { formatDuration, getFullMediaUrl } from './thumbnailGrid.utils';

// Styles
import {
    GridContainer,
    Thumbnail,
    CollageImage,
    CollageVideo,
    TypeBadge,
    CountBadge,
    DurationBadge,
    Loading,
    FeedContainer,
    Header,
    ControlGroup,
    ToggleButton,
    Separator,
    SliderLabel,
    RangeInput
} from './ThumbnailGrid.styles';

// Components
import { FeedCard } from './FeedCard';
import { TwitterFeedCard } from './TwitterFeedCard';
import { MediaModal } from './MediaModal';

export const ThumbnailGrid = () => {
    const [groups, setGroups] = useState<GroupedMedia[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<GroupedMedia | null>(null);
    const [gridSize, setGridSize] = useState(() => Number(localStorage.getItem('grid-size') || 200));
    const [globalVolume, setGlobalVolume] = useState(() => Number(localStorage.getItem('media-volume') || 0.5));
    const [sortBy, setSortBy] = useState<'fetch' | 'discord'>('fetch');
    const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
    const [errorInfo, setErrorInfo] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Persistence Effects
    useEffect(() => { localStorage.setItem('grid-size', String(gridSize)); }, [gridSize]);
    useEffect(() => { localStorage.setItem('media-volume', String(globalVolume)); }, [globalVolume]);

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
        rootMargin: '400px',
        triggerOnce: false,
    });

    // Feed Observer
    const [feedRef, feedInView] = useInView({
        threshold: 0.1,
        rootMargin: '800px',
        triggerOnce: false
    });

    const loadingRef = useRef(false);

    const loadFeed = useCallback(async () => {
        if (loadingRef.current) return;

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
    }, [viewMode, loadFeed, sortBy, sortOrder]);

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
                // Check if near bottom and load more
                const remaining = container.scrollHeight - (container.scrollTop + container.clientHeight);
                if (remaining < window.innerHeight * 2) {
                    loadFeed();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                container.scrollBy({ top: -window.innerHeight, behavior: 'smooth' });
            }
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [viewMode, loadFeed]);

    const loadList = async (isReset = false) => {
        if (loadingRef.current || (!hasMore && !isReset)) return;
        loadingRef.current = true;
        setLoading(true);

        try {
            const currentOffset = isReset ? 0 : groups.length;
            const limit = 20;

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
                    setHasMore(false);
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <SliderLabel>
                        Vol:
                        <RangeInput
                            type="range" min="0" max="1" step="0.05"
                            value={globalVolume} onChange={(e) => setGlobalVolume(Number(e.target.value))}
                            title={`Volume: ${Math.round(globalVolume * 100)}%`}
                            style={{ width: '80px' }}
                        />
                    </SliderLabel>

                    {viewMode === 'list' && (
                        <SliderLabel>
                            Size:
                            <RangeInput
                                type="range" min="80" max="500" step="10"
                                value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))}
                                style={{ width: '80px' }}
                            />
                        </SliderLabel>
                    )}
                </div>
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
            </Header >

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
                                                <CollageImage src={getFullMediaUrl(item.thumbnailUrl)} alt="thumb" loading="lazy" />
                                            ) : isVideo ? (
                                                <CollageVideo src={getFullMediaUrl(item.minioUrl)} muted loop />
                                            ) : (
                                                <CollageImage src={getFullMediaUrl(item.minioUrl)} alt="thumb" loading="lazy" />
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

            {viewMode === 'swipe' && (
                <FeedContainer ref={feedContainerRef} className="feed-container">
                    {feedItems.map((group, idx) => (
                        <FeedCard
                            key={`${group.discordMessageId}-${idx}`}
                            group={group}
                            getFullUrl={getFullMediaUrl}
                            onReportError={handleReportError}
                            globalVolume={globalVolume}
                        />
                    ))}
                    <div ref={feedRef} style={{ height: '100px', width: '100%' }}></div>
                    {feedLoading && <div style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}>Loading more...</div>}
                </FeedContainer>
            )}

            {viewMode === 'feed' && (
                <div style={{ display: 'flex', flexDirection: 'column', padding: '16px', maxWidth: '800px', margin: '0 auto' }}>
                    {feedItems.map((group, idx) => (
                        <TwitterFeedCard
                            key={`${group.discordMessageId}-feed-${idx}`}
                            group={group}
                            getFullUrl={getFullMediaUrl}
                            onZoom={() => {
                                setSelectedGroup(group);
                            }}
                            globalVolume={globalVolume}
                        />
                    ))}
                    <div ref={feedRef} style={{ height: '50px', width: '100%' }}></div>
                    {feedLoading && <div style={{ color: '#8b949e', textAlign: 'center', padding: '20px' }}>Loading more...</div>}
                </div>
            )}

            {selectedGroup && (
                <MediaModal
                    group={selectedGroup}
                    getFullUrl={getFullMediaUrl}
                    globalVolume={globalVolume}
                    onClose={() => setSelectedGroup(null)}
                    onDelete={handleDelete}
                    onRedownload={handleRedownload}
                />
            )}
        </>
    );
};
