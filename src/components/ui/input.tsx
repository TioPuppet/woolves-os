import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'min-h-11 w-full rounded-md border border-border bg-card px-3 text-sm',
      'text-foreground placeholder:text-muted-foreground',
      'focus:outline-none focus:ring-2 focus:ring-primary/60',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
