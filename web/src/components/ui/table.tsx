import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Table({ className, ...p }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full border-collapse text-[14px]', className)} {...p} />
    </div>
  );
}

export const THead = (p: HTMLAttributes<HTMLTableSectionElement>) => <thead {...p} />;
export const TBody = (p: HTMLAttributes<HTMLTableSectionElement>) => <tbody {...p} />;

export function TR({ className, ...p }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn('border-b border-line last:border-0', className)} {...p} />;
}

export function TH({ className, num, ...p }: ThHTMLAttributes<HTMLTableCellElement> & { num?: boolean }) {
  return <th scope="col" className={cn('whitespace-nowrap border-b border-line px-3 pb-2.5 pt-1 text-left font-heading text-[12.5px] font-semibold text-ink first:pl-0 last:pr-0', num && 'text-right', className)} {...p} />;
}

export function TD({ className, num, ...p }: TdHTMLAttributes<HTMLTableCellElement> & { num?: boolean }) {
  return <td className={cn('px-3 py-3 align-middle first:pl-0 last:pr-0', num && 'tnum whitespace-nowrap text-right', className)} {...p} />;
}
