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
          'inline-flex items-center justify-center gap-2 rounded-[0.5rem] text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background active:scale-[0.98] select-none',
          {
            'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md hover:-translate-y-[1px]': variant === 'primary',
            'bg-secondary text-secondary-foreground border border-border/50 hover:bg-secondary/80 hover:shadow-sm': variant === 'secondary',
            'border border-input bg-background/50 text-foreground hover:bg-accent hover:text-accent-foreground': variant === 'outline',
            'text-foreground hover:bg-accent hover:text-accent-foreground': variant === 'ghost' || variant === 'icon',
            'bg-destructive text-white hover:bg-destructive/90 shadow-sm hover:shadow-md': variant === 'destructive',
          },
          {
            'h-9 px-4 py-2': size === 'default' && variant !== 'icon',
            'h-8 px-3 text-xs rounded-md': size === 'sm',
            'h-11 px-8 text-base rounded-[0.625rem]': size === 'lg',
            'h-9 w-9': size === 'icon' || variant === 'icon',
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
