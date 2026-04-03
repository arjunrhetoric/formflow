import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'icon';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-[0.75rem] text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background shadow-sm active:scale-[0.99]',
          {
            'bg-primary text-primary-foreground hover:bg-primary/92 hover:shadow-md': variant === 'primary',
            'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/85': variant === 'secondary',
            'border border-border bg-background text-foreground hover:bg-secondary hover:border-foreground/15': variant === 'outline',
            'text-foreground hover:bg-secondary/80 hover:text-foreground shadow-none': variant === 'ghost' || variant === 'icon',
            'bg-destructive text-white hover:bg-destructive/92 hover:shadow-md': variant === 'destructive',
          },
          {
            'h-10 px-4 py-2': size === 'default' && variant !== 'icon',
            'h-9 px-3.5 text-[13px]': size === 'sm',
            'h-11 px-8 text-base': size === 'lg',
            'h-10 w-10': size === 'icon' || variant === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
