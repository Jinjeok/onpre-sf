import { useState, useRef, useEffect } from 'react';
import type { GroupedMedia } from './thumbnailGrid.types';
import {
    Overlay,
    ModalContainer,
    ModalContentWrapper,
    MediaContent,
    InfoPanel,
    MessageText,
    ButtonLink,
    NavButton,
    CloseButton,
    HorizontalScroll,
    HorizontalItem
} from './ThumbnailGrid.styles';

interface MediaModalProps {
    group: GroupedMedia;
    initialIndex?: number;
    getFullUrl: (url: string) => string;
    globalVolume: number;
    onClose: () => void;
    onDelete: (id: string, group: GroupedMedia) => void;
    onRedownload: (id: string) => void;
}

/**
 * MediaModal - Full screen media viewer modal
 * Supports zoom, pan, and navigation for images and videos
 */
export const MediaModal = ({
    group,
    initialIndex = 0,
    getFullUrl,
    globalVolume,
    onClose,
    onDelete,
    onRedownload
}: MediaModalProps) => {
    const [selectedIndex, setSelectedIndex] = useState(initialIndex);
    const modalScrollRef = useRef<HTMLDivElement>(null);

    // Zoom & Pan State
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [origin, setOrigin] = useState({ x: 50, y: 50 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const panStartRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
    const dragDistance = useRef(0);

    // Reset Zoom/Pan on slide change
    useEffect(() => {
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
        setOrigin({ x: 50, y: 50 });
    }, [selectedIndex]);

    // Sync modal index on scroll
    const handleModalScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        if (target.clientWidth === 0) return;
        const newIndex = Math.round(target.scrollLeft / target.clientWidth);
        if (newIndex !== selectedIndex && zoomLevel <= 1) {
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
        const next = (selectedIndex + 1) % group.media.length;
        modalScrollTo(next);
        modalScrollTo(next);
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
        setOrigin({ x: 50, y: 50 });
    };

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        const prev = (selectedIndex - 1 + group.media.length) % group.media.length;
        modalScrollTo(prev);
        setZoomLevel(1);
        setPan({ x: 0, y: 0 });
        setOrigin({ x: 50, y: 50 });
    };

    const handleZoomToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Prevent zoom toggle if dragged
        if (dragDistance.current > 10) return;

        if (zoomLevel > 1) {
            setZoomLevel(1);
            setPan({ x: 0, y: 0 });
            // Keep origin for smooth zoom out
        } else {
            // Get the actual image element's size (not the container)
            const img = e.target as HTMLImageElement;
            const rect = img.getBoundingClientRect();

            // Calculate dynamic zoom level based on image size vs screen size
            // Consider both height and width, use the smaller zoom to prevent overflow
            const targetHeight = window.innerHeight * 0.9;
            const targetWidth = window.innerWidth * 0.9;
            const zoomByHeight = targetHeight / rect.height;
            const zoomByWidth = targetWidth / rect.width;
            let calculatedZoom = Math.min(zoomByHeight, zoomByWidth);

            // Apply slight magnification (1.2x of fit) to ensure it feels "zoomed in"
            calculatedZoom = calculatedZoom * 1.2;

            // Clamp zoom between 1.2x and 3.5x
            calculatedZoom = Math.min(Math.max(calculatedZoom, 1.2), 3.5);

            // Set origin to click position
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            setOrigin({ x, y });
            setZoomLevel(calculatedZoom);
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (zoomLevel <= 1) return;
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        panStartRef.current = { ...pan };
        dragDistance.current = 0;
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !dragStartRef.current) return;
        e.preventDefault();
        const dx = e.clientX - dragStartRef.current.x;
        const dy = e.clientY - dragStartRef.current.y;
        dragDistance.current = Math.sqrt(dx * dx + dy * dy);

        setPan({
            x: panStartRef.current.x + dx,
            y: panStartRef.current.y + dy
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        dragStartRef.current = null;
    };

    // Keyboard Navigation with Debounce
    const lastKeyTimeRef = useRef(0);
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();
            if (now - lastKeyTimeRef.current < 200) return; // 200ms debounce

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                lastKeyTimeRef.current = now;
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                lastKeyTimeRef.current = now;
                handleNext();
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex]);

    const currentItem = group.media[selectedIndex];

    return (
        <Overlay onClick={onClose}>
            <CloseButton onClick={(e) => { e.stopPropagation(); onClose(); }}>×</CloseButton>
            <ModalContainer onClick={onClose} style={{ cursor: 'pointer' }}>
                {group.media.length > 1 && (
                    <NavButton className="prev" onClick={(e) => { e.stopPropagation(); handlePrev(); }}>‹</NavButton>
                )}
                <ModalContentWrapper className={zoomLevel > 1 ? 'zoomed' : ''}>
                    <HorizontalScroll
                        ref={modalScrollRef}
                        onScroll={handleModalScroll}
                    >
                        {group.media.map((item, idx) => (
                            <HorizontalItem key={item.id} style={{ touchAction: zoomLevel > 1 ? 'none' : 'pan-x' }}>
                                <MediaContent
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        overflow: zoomLevel > 1 ? 'visible' : 'hidden',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
                                    }}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                >
                                    {item.type === 'video' ? (
                                        <video
                                            key={item.id}
                                            src={getFullUrl(item.minioUrl)}
                                            controls autoPlay loop playsInline
                                            ref={el => { if (el && idx === selectedIndex) el.volume = globalVolume; }}
                                            style={{
                                                margin: 'auto', display: 'block', maxHeight: '80vh', maxWidth: '100%',
                                                pointerEvents: 'auto' // Ensure video controls work
                                            }}
                                        />
                                    ) : (
                                        <img
                                            src={getFullUrl(item.minioUrl)}
                                            alt="full"
                                            onClick={handleZoomToggle}
                                            style={{
                                                maxHeight: zoomLevel > 1 ? '95vh' : '80vh',
                                                maxWidth: zoomLevel > 1 ? '95vw' : '100%',
                                                display: 'block',
                                                transform: `scale(${idx === selectedIndex ? zoomLevel : 1}) translate(${idx === selectedIndex ? pan.x / zoomLevel : 0}px, ${idx === selectedIndex ? pan.y / zoomLevel : 0}px)`,
                                                transformOrigin: `${origin.x}% ${origin.y}%`,
                                                transition: isDragging ? 'none' : 'transform 0.2s',
                                                userSelect: 'none'
                                            }}
                                        />
                                    )}
                                </MediaContent>
                            </HorizontalItem>
                        ))}
                    </HorizontalScroll>
                </ModalContentWrapper>
                {group.media.length > 1 && (
                    <NavButton className="next" onClick={(e) => { e.stopPropagation(); handleNext(); }}>›</NavButton>
                )}
                <InfoPanel onClick={e => e.stopPropagation()} className={zoomLevel > 1 ? 'hidden' : ''}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, marginRight: '16px' }}>
                            <small style={{ color: '#8b949e', display: 'block', marginBottom: '8px' }}>
                                {new Date(group.discordCreatedAt || group.createdAt).toLocaleString()} • {selectedIndex + 1}/{group.media.length}
                            </small>
                            <MessageText>{group.content || '(No Text Content)'}</MessageText>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
                            <ButtonLink
                                href={`https://discord.com/channels/@me/${group.originalChannel}/${group.discordMessageId}`}
                                target="_blank" rel="noopener noreferrer"
                            >Discord</ButtonLink>
                            <button style={{ background: '#2ba44e', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                onClick={() => onRedownload(currentItem.id)}
                            >Re-download</button>
                            <button style={{ background: '#da3633', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                                onClick={() => onDelete(currentItem.id, group)}
                            >Delete</button>
                        </div>
                    </div>
                </InfoPanel>
            </ModalContainer>
        </Overlay>
    );
};
