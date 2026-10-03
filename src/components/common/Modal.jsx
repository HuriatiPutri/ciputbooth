import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Reusable Modal Dialog Component with backdrop blur, smooth animation, and escape key listener
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  maxWidth = 'max-w-md',
  padding = 'p-8',
  showCloseButton = true
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 sm:p-8 animate-fade-in">
      <div
        className={`relative bg-slate-900 border border-white/20 rounded-3xl ${padding} w-full ${maxWidth} shadow-2xl animate-count-pop flex flex-col items-center justify-center`}
      >
        {/* Close Button */}
        {showCloseButton && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Modal Header */}
        {(title || Icon) && (
          <div className="w-full flex flex-col items-center justify-center text-center mb-6">
            {Icon && (
              <div className="w-16 h-16 rounded-2xl bg-violet-600/20 border border-violet-500/30 text-violet-400 flex items-center justify-center mb-4 shadow-lg shadow-violet-600/10">
                <Icon className="w-8 h-8" />
              </div>
            )}
            {title && <h3 className="font-display font-black text-2xl sm:text-3xl text-white tracking-tight">{title}</h3>}
            {subtitle && <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed max-w-sm mx-auto">{subtitle}</p>}
          </div>
        )}

        {/* Modal Body Content */}
        <div className="w-full flex flex-col items-center justify-center">
          {children}
        </div>
      </div>
    </div>
  );
}
