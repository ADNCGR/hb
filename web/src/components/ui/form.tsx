import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, cloneElement, isValidElement, type ReactElement } from 'react';
import { cn } from '@/lib/cn';

const fieldBase =
  'block w-full min-w-0 rounded-field border border-field bg-surface text-[15px] text-ink outline-none transition-colors placeholder:text-black/40 focus:border-field-focus focus:bg-white disabled:opacity-60 aria-[invalid=true]:border-bad/60 max-sm:text-[16px]';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(fieldBase, 'h-[46px] px-3.5', className)} {...p} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, 'min-h-[96px] resize-y px-3.5 py-[11px] leading-normal', className)} {...p} />
));
Textarea.displayName = 'Textarea';

const chevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='1.8' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, style, ...p }, ref) => (
  <select
    ref={ref}
    className={cn(fieldBase, 'h-[46px] cursor-pointer appearance-none pl-3.5 pr-9', className)}
    style={{ background: undefined, backgroundImage: chevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '14px', ...style }}
    {...p}
  />
));
Select.displayName = 'Select';

export function Field({ label, hint, error, children, className, optional }: { label: ReactNode; hint?: ReactNode; error?: string; children: ReactElement; className?: string; optional?: boolean }) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })
    : children;
  return (
    <div className={cn('block min-w-0', className)}>
      <label htmlFor={id} className="mb-1.5 block font-heading text-[13.5px] font-semibold">
        {label}
        {optional ? <span className="ml-1 font-sans font-normal text-muted">(facultatif)</span> : null}
      </label>
      {control}
      {error ? (
        <p id={`${id}-err`} className="mt-1.5 text-[13px] font-medium leading-snug text-bad">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] leading-snug text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-field bg-bad-soft px-3.5 py-2.5 text-[14px] font-medium leading-snug text-bad">
      {message}
    </p>
  );
}
