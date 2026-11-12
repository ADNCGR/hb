import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const badge = cva('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[12.5px] font-medium leading-[1.35]', {
  variants: {
    tone: {
      neutral: 'bg-surface-2 text-ink',
      ok: 'bg-ok-soft text-ok',
      wait: 'bg-wait-soft text-wait',
      bad: 'bg-bad-soft text-bad',
      ink: 'bg-ink text-white',
      line: 'bg-white text-muted shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export type BadgeTone = NonNullable<VariantProps<typeof badge>['tone']>;

export function Badge({ tone, dot, className, children, ...p }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge> & { dot?: boolean }) {
  return (
    <span className={cn(badge({ tone }), className)} {...p}>
      {dot ? <span className="h-1.5 w-1.5 flex-none rounded-full bg-current" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
