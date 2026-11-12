import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-heading font-medium transition-colors duration-300 ease-ds disabled:cursor-default',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-white hover:bg-[#262626] disabled:bg-surface-2 disabled:text-muted-2',
        quiet: 'bg-white text-ink shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] hover:bg-surface disabled:text-muted-2 disabled:hover:bg-white',
        ghost: 'text-muted hover:bg-black/5 hover:text-ink disabled:text-muted-2',
        danger: 'bg-white text-bad shadow-[inset_0_0_0_1px_rgba(179,38,30,0.35)] hover:bg-bad-soft disabled:text-muted-2',
      },
      size: {
        md: 'h-[46px] px-[22px] text-[14.5px]',
        sm: 'h-[38px] px-4 text-[13.5px]',
        xs: 'h-8 px-3 text-[13px]',
        icon: 'h-[38px] w-[38px] p-0',
      },
      dot: {
        true: "before:h-[7px] before:w-[7px] before:flex-none before:rounded-full before:bg-current before:content-['']",
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', dot: false },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, dot, asChild, loading, disabled, children, ...props }, ref) => {
  if (asChild) {
    return <Slot ref={ref} className={cn(buttonVariants({ variant, size, dot }), className)} {...props}>{children}</Slot>;
  }
  return (
    <button ref={ref} className={cn(buttonVariants({ variant, size, dot }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
});
Button.displayName = 'Button';

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('animate-spin', className)} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
