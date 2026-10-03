import React from 'react';

/**
 * Reusable Glassmorphism Card Container with standard border, blur, and padding
 */
export default function GlassCard({
  children,
  className = '',
  hoverEffect = false,
  padding = 'p-6 sm:p-8',
  ...props
}) {
  return (
    <div
      className={`relative rounded-3xl overflow-hidden glass-panel border border-white/20 bg-slate-950/90 shadow-2xl ${padding} ${
        hoverEffect ? 'hover:border-white/30 hover:scale-[1.01] transition-all duration-300' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
