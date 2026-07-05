import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground hover:opacity-90 active:opacity-80',
  secondary: 'bg-muted text-foreground hover:bg-muted/80',
  ghost: 'bg-transparent text-muted-foreground hover:text-foreground',
};

/** Touch-friendly button (min 44px height) with shadcn-style variants. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex min-h-11 w-full items-center justify-center rounded-md px-4',
        'text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
