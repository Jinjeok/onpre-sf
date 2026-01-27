import styled from 'styled-components';
import { useEffect, useState, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import api from '../api';
import { MediaItem } from './MediaItem';
import { Filter } from './Filter';

const FeedContainer = styled.main`
  height: 100dvh;
  width: 100%;
  overflow-y: scroll;
  scroll-snap-type: y mandatory;
  background-color: #000;
  
  /* Hide scrollbar for immersive feel */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
`;

const Loading = styled.div`
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  scroll-snap-align: start;
`;

interface Media {
    id: string; // Updated to match UUID
    type: string;
    minioUrl: string;
    discordMessageId: string;
    originalChannel?: string;
}

export const Feed = () => {
    const [items, setItems] = useState<Media[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState({ video: true, image: true });
    const [ref, inView] = useInView();

    // Use a ref-based lock or simple check? 
    // State 'loading' is fine if we don't include it in dep array of the EFFECT calling it, 
    // OR we use the functional update form and verify carefully.
    // Better: Pass a signal or just check state.

    // Actually, the main issue is likely `fetchFeed` changing on every render because of `loading` dependency.
    // Let's remove `loading` from useCallback deps and use a ref for the lock.
    const loadingRef = useRef(false);

    const loadMore = async (isInitial = false) => {
        if (loadingRef.current) return;
        loadingRef.current = true;
        setLoading(true);

        try {
            let params: any = { limit: 50 };
            if (filter.video && !filter.image) params.type = 'video';
            else if (!filter.video && filter.image) params.type = 'image';
            else if (!filter.video && !filter.image) {
                setItems([]);
                loadingRef.current = false;
                setLoading(false);
                return;
            }

            const response = await api.get('/feed', { params });
            const newItems = response.data;

            setItems(prev => {
                if (isInitial) return newItems;
                // De-dupe
                const existingIds = new Set(prev.map(i => i.id));
                const uniqueNew = newItems.filter((i: Media) => !existingIds.has(i.id));
                return [...prev, ...uniqueNew];
            });
        } catch (error) {
            console.error('Failed to fetch feed', error);
        } finally {
            loadingRef.current = false;
            setLoading(false);
        }
    };

    useEffect(() => {
        // Initial load
        setItems([]);
        loadMore(true);
    }, [filter]);

    useEffect(() => {
        if (inView) {
            loadMore();
        }
    }, [inView]);

    const handleFilterChange = (key: 'video' | 'image') => {
        setFilter(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <>
            <Filter filter={filter} onChange={handleFilterChange} />
            <FeedContainer>
                {items.map(item => (
                    <MediaItem key={item.id} item={item} />
                ))}
                <Loading ref={ref}>
                    {loading ? 'Loading...' : 'Load More'}
                </Loading>
            </FeedContainer>
        </>
    );
};
