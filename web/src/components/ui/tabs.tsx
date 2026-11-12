import * as R from '@radix-ui/react-tabs';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const Tabs = R.Root;

export function TabsList({ className, ...p }: ComponentProps<typeof R.List>) {
  return <R.List className={cn('flex gap-7 overflow-x-auto border-b border-line [scrollbar-width:none]', className)} {...p} />;
}

export function TabsTrigger({ className, ...p }: ComponentProps<typeof R.Trigger>) {
  return (
    <R.Trigger
      className={cn(
        'relative flex-none pb-3.5 pt-3 font-heading text-[14.5px] text-muted transition-colors hover:text-ink data-[state=active]:font-medium data-[state=active]:text-ink',
        'after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:bg-transparent data-[state=active]:after:bg-ink',
        className,
      )}
      {...p}
    />
  );
}

export function TabsContent({ className, ...p }: ComponentProps<typeof R.Content>) {
  return <R.Content className={cn('pt-6 outline-none', className)} {...p} />;
}
