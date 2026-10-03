import React from 'react';

/**
 * Reusable Badge/Pill component for steps, tags, and status badges
 */
export default function Badge({
  children,
  variant = 'violet', // 'violet' | 'pink' | 'emerald' | 'amber' | 'slate' | 'cyan'
  size = 'md', // 'sm' | 'md'
  icon: Icon,
  className = ''
}) {
  const variantStyles = {
    violet: 'bg-violet-500/20 border-violet-500/40 text-violet-300',
    pink: 'bg-pink-500/20 border-pink-500/40 text-pink-300',
    emerald: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    amber: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
    cyan: 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
    slate: 'bg-slate-800/90 border-white/15 text-slate-300'
  };

  const sizeStyles = {
    sm: 'px-3 py-1 text-[10px] font-black uppercase tracking-wider',
    md: 'px-5 py-2 text-xs sm:text-sm font-black uppercase tracking-wider'
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border backdrop-blur-md shadow-lg ${variantStyles[variant] || variantStyles.violet} ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />}
      <span>{children}</span>
    </div>
  );
}
