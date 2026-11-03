import { useTheme } from '@emotion/react';
import styled from '@emotion/styled';
import { AnimatePresence, motion } from 'framer-motion';
import { Maximize2, X } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface InspectorImageProps {
  readonly src: string;
  readonly alt: string;
  /** Wraps the image, such as with its section heading. Not drawn when the image does not load. */
  readonly frame: (image: ReactNode) => ReactNode;
}

const Thumbnail = styled.button`
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.glass.edge};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.color.canvas};
  cursor: zoom-in;
  & > img {
    display: block;
    width: 100%;
    height: auto;
  }
  &:hover > span,
  &:focus-visible > span {
    opacity: 1;
  }
`;

const ExpandHint = styled.span`
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: rgba(6, 7, 8, 0.72);
  color: ${({ theme }) => theme.color.text};
  opacity: 0;
  transition: opacity 0.14s ease;
`;

const Backdrop = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space(12)};
  background: rgba(4, 5, 6, 0.82);
  backdrop-filter: blur(12px);
  cursor: zoom-out;
`;

const FullImage = styled(motion.img)`
  max-width: 100%;
  max-height: 100%;
  border: 1px solid ${({ theme }) => theme.glass.edge};
  border-radius: ${({ theme }) => theme.radius.lg};
  box-shadow: 0 24px 80px -24px rgba(0, 0, 0, 0.8);
  cursor: default;
`;

const CloseFull = styled.button`
  position: absolute;
  top: ${({ theme }) => theme.space(4)};
  right: ${({ theme }) => theme.space(4)};
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid ${({ theme }) => theme.glass.edge};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: rgba(15, 16, 17, 0.8);
  color: ${({ theme }) => theme.color.text};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.color.surfaceRaised};
  }
`;

/**
 * An image in the inspector that opens full screen on a click. The close button, a click outside the image,
 * or Escape closes it. Escape is caught first, so it closes only the image, not the inspector under it.
 */
export function InspectorImage({ src, alt, frame }: InspectorImageProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape, true);
    return () => window.removeEventListener('keydown', closeOnEscape, true);
  }, [open]);
  if (failed) return null;
  return (
    <>
      {frame(
        <Thumbnail type="button" aria-label={`Open ${alt} full screen`} onClick={() => setOpen(true)}>
          <img src={src} alt={alt} onError={() => setFailed(true)} />
          <ExpandHint>
            <Maximize2 size={14} />
          </ExpandHint>
        </Thumbnail>,
      )}
      {createPortal(
        <AnimatePresence>
          {open && (
            <Backdrop
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={theme.motion.fast}
              onClick={() => setOpen(false)}
            >
              <FullImage
                src={src}
                alt={alt}
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.96 }}
                transition={theme.motion.spring}
                onClick={(event) => event.stopPropagation()}
              />
              <CloseFull type="button" aria-label="Close the screenshot" onClick={() => setOpen(false)}>
                <X size={18} />
              </CloseFull>
            </Backdrop>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
