import * as D from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

export function Dialog({ open, onOpenChange, title, description, children, footer, wide }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <D.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100svh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border border-line bg-white',
            wide ? 'max-w-[860px]' : 'max-w-[520px]',
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <D.Title className="font-heading text-[19px] font-semibold tracking-[-0.02em]">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-[14px] text-muted">{description}</D.Description> : <D.Description className="sr-only">{typeof title === 'string' ? title : 'Fenêtre'}</D.Description>}
            </div>
            <D.Close className="-mr-2 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-ink" aria-label="Fermer">
              <Icon name="close" />
            </D.Close>
          </div>
          <div className="min-h-0 overflow-y-auto px-6 py-5">{children}</div>
          {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div> : null}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
