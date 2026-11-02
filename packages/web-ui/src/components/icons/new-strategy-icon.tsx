import type { LucideIcon, LucideProps } from 'lucide-react';
import { forwardRef } from 'react';

const VIEW_BOX = 21;
const LUCIDE_VIEW_BOX = 24;

/** A pencil over a page, for writing a new strategy. `strokeWidth` is in Lucide's 24-unit grid, so it matches the other icons. */
export const NewStrategyIcon: LucideIcon = forwardRef<SVGSVGElement, LucideProps>(function NewStrategyIcon(
  { size = 24, color = 'currentColor', strokeWidth = 2, absoluteStrokeWidth: _absoluteStrokeWidth, ...rest },
  ref,
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW_BOX} ${VIEW_BOX}`}
      fill="none"
      stroke={color}
      strokeWidth={(Number(strokeWidth) * VIEW_BOX) / LUCIDE_VIEW_BOX}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      <path d="M10 4.5H5.5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V11" />
      <path d="M17.5 3.467a1.46 1.46 0 0 1-.017 2.05L10.5 12.5l-3 1l1-3l6.987-7.046a1.41 1.41 0 0 1 1.885-.104zm-2 2.033l.953 1" />
    </svg>
  );
});
