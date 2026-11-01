import React from 'react';
import { soundManager } from '../../utils/audio';

/**
 * Reusable Button Component with consistent padding, animations, and sound effects
 */
export default function Button({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'glass' | 'danger'
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  disabled = false,
  loading = false,
  className = '',
  playSound = true,
  type = 'button',
  ...props
}) {
  const handleClick = (e) => {
    if (disabled || loading) return;
    if (playSound) soundManager.playClick();
    if (onClick) onClick(e);
  };

  const baseStyles = 'inline-flex items-center justify-center font-bold transition-all cursor-pointer select-none disabled:opacity-40 disabled:pointer-events-none active:scale-95';

  const sizeStyles = {
    sm: 'px-4 py-2 text-xs rounded-xl gap-2',
    md: 'px-6 py-3 text-xs sm:text-sm rounded-2xl gap-2.5',
    lg: 'px-8 py-4 text-sm sm:text-base rounded-2xl gap-3',
    xl: 'px-10 py-5 text-base sm:text-lg rounded-full font-display font-black gap-3.5 shadow-2xl'
  };

  const variantStyles = {
    primary: 'btn-primary text-white shadow-xl shadow-pink-500/20 hover:scale-[1.02]',
    secondary: 'bg-slate-900 hover:bg-slate-800 text-white border border-white/15 shadow-lg',
    outline: 'border border-white/20 text-slate-300 hover:text-white hover:bg-white/10 shadow-sm',
    glass: 'glass-panel bg-slate-900/80 hover:bg-slate-800/90 text-slate-200 hover:text-white border border-white/15 shadow-xl',
    danger: 'bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-300 hover:text-white shadow-lg shadow-rose-600/20'
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size] || sizeStyles.md} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      ) : (
        LeftIcon && <LeftIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
      )}

      <span>{children}</span>

      {!loading && RightIcon && <RightIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />}
    </button>
  );
}
