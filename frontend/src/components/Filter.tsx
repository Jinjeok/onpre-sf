import styled from 'styled-components';

const Container = styled.div`
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 20px;
  border-radius: 24px;
  backdrop-filter: blur(8px);
  display: flex;
  gap: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 6px rgba(0,0,0,0.2);
`;

const Label = styled.label`
  color: white;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.8;
  }
`;

const Checkbox = styled.input`
  accent-color: #5865F2; /* Discord Blurple */
  width: 16px;
  height: 16px;
  cursor: pointer;
`;

interface FilterProps {
    filter: { video: boolean; image: boolean };
    onChange: (key: 'video' | 'image') => void;
}

export const Filter = ({ filter, onChange }: FilterProps) => {
    return (
        <Container>
            <Label>
                <Checkbox
                    type="checkbox"
                    checked={filter.video}
                    onChange={() => onChange('video')}
                />
                Video
            </Label>
            <Label>
                <Checkbox
                    type="checkbox"
                    checked={filter.image}
                    onChange={() => onChange('image')}
                />
                Image
            </Label>
        </Container>
    );
};
