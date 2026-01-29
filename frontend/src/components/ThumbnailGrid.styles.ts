import styled from 'styled-components';

// ============ Grid & Thumbnail ============

export const GridContainer = styled.div`
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

export const Thumbnail = styled.div`
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

export const CollageImage = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

export const CollageVideo = styled.video`
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
`;

// ============ Badges ============

export const TypeBadge = styled.div`
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

export const CountBadge = styled.div`
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

export const DurationBadge = styled.div`
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

// ============ Horizontal Scroll ============

export const HorizontalScroll = styled.div`
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

export const HorizontalItem = styled.div`
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

// ============ Loading ============

export const Loading = styled.div`
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

// ============ Modal / Overlay ============

export const Overlay = styled.div`
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

export const ModalContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
`;

export const ModalContentWrapper = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-height: 85vh; /* Reserve space for info panel */
  position: relative;
`;

export const MediaContent = styled.div`
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

export const InfoPanel = styled.div`
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
  transition: transform 0.3s ease-in-out;

  &.hidden {
    transform: translateY(100%);
  }
`;

export const MessageText = styled.div`
  margin: 0 0 12px 0;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  color: #e6edf3;
  max-height: 100px;
  overflow-y: auto;
`;

export const ButtonLink = styled.a`
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

export const NavButton = styled.button`
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

export const CloseButton = styled.button`
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

// ============ Feed (Swipe Mode) ============

export const FeedContainer = styled.div`
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

export const FeedItem = styled.div`
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

export const FeedContent = styled.div`
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

// ============ Twitter/Infinite Feed Style ============

export const TwitterCardContainer = styled.div`
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

export const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  color: #8b949e;
`;

export const CardContent = styled.div`
  margin-bottom: 12px;
  white-space: pre-wrap;
  font-size: 15px;
  line-height: 1.5;
  color: #e6edf3;
  word-break: break-word; /* Prevent overflow */
`;

export const AttachmentScroll = styled.div`
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

export const AttachmentItem = styled.div<{ $isSingle?: boolean }>`
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

// ============ Controls / Header ============

export const Header = styled.header`
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

export const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

export const ToggleButton = styled.button<{ $active?: boolean; $disabled?: boolean }>`
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

export const Separator = styled.div`
  width: 1px;
  height: 20px;
  background: #30363d;
  margin: 0 4px;
`;

export const SliderLabel = styled.label`
  color: #c9d1d9;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const RangeInput = styled.input`
  cursor: pointer;
  accent-color: #238636;
`;
