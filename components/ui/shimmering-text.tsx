// ------------------------------------------------------------------------------------------------
//                shimmering-text.tsx - Animated text placeholder component
// ------------------------------------------------------------------------------------------------

'use client';

import * as React from 'react';
import { motion, useInView, type UseInViewOptions, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export interface ShimmeringTextProps extends Omit<HTMLMotionProps<'span'>, 'ref'> {
  readonly shimmer?: boolean;
  readonly text?: string;
  readonly children?: React.ReactNode;
  readonly startOnView?: boolean;
  readonly duration?: number;
  readonly delay?: number;
  readonly repeat?: boolean;
  readonly repeatDelay?: number;
  readonly once?: boolean;
  readonly inViewMargin?: UseInViewOptions['margin'];
  readonly spread?: number;
  readonly color?: string;
  readonly shimmeringColor?: string;
}

export function ShimmeringText({
  className,
  shimmer = true,
  text,
  children,
  startOnView = false,
  duration = 2.4,
  delay = 0,
  repeat = true,
  repeatDelay = 0,
  once = false,
  inViewMargin,
  spread = 2,
  color,
  shimmeringColor,
  ...props
}: ShimmeringTextProps): React.ReactElement {
  const ref = React.useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once, margin: inViewMargin });

  const { style: motionStyle, ...restProps } = props;

  const content = text ?? children;
  const textContent = typeof content === 'string' ? content : String(content ?? '');

  const dynamicSpread = React.useMemo(() => {
    return textContent.length * spread;
  }, [textContent, spread]);

  const shouldAnimate = !startOnView || isInView;

  if (!shimmer) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 font-medium text-muted-foreground', className)}
        style={motionStyle as React.CSSProperties | undefined}
        {...(restProps as React.HTMLAttributes<HTMLSpanElement>)}
      >
        {content}
      </span>
    );
  }

  return (
    <motion.span
      ref={ref}
      className={cn(
        'relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent',
        '[--base-color:hsl(var(--muted-foreground,215_16%_47%))] [--shimmer-color:hsl(var(--foreground,222.2_84%_4.9%))]',
        '[background-repeat:no-repeat,padding-box]',
        '[--shimmer-bg:linear-gradient(90deg,transparent_calc(50%-var(--spread)),var(--shimmer-color),transparent_calc(50%+var(--spread)))]',
        'dark:[--base-color:hsl(var(--muted-foreground,215_16%_47%))] dark:[--shimmer-color:hsl(var(--foreground,210_40%_98%))]',
        className
      )}
      style={{
        '--spread': `${dynamicSpread}px`,
        ...(color && { '--base-color': color }),
        ...(shimmeringColor && { '--shimmer-color': shimmeringColor }),
        backgroundImage: `var(--shimmer-bg), linear-gradient(var(--base-color), var(--base-color))`,
        ...(motionStyle ?? {}),
      } as React.CSSProperties}
      initial={{
        backgroundPosition: '100% center',
        opacity: 0,
      }}
      animate={
        shouldAnimate
          ? {
              backgroundPosition: '0% center',
              opacity: 1,
            }
          : {}
      }
      transition={{
        backgroundPosition: {
          repeat: repeat ? Infinity : 0,
          duration,
          delay,
          repeatDelay,
          ease: 'linear',
        },
        opacity: {
          duration: 0.3,
          delay,
        },
      }}
      {...restProps}
    >
      {textContent}
    </motion.span>
  );
}
