import React from 'react';
import { soundManager } from '../../utils/audio';

/**
 * Reusable TabGroup Component for filter tabs, navigation tabs, and segments
 */
export default function TabGroup({
  tabs = [], // [{ id: 'all', label: 'All Frames', count?: 4, icon?: Icon }]
  activeTab,
  onChange,
  className = '',
  buttonClassName = '',
  fullWidth = false,
  size = 'md' // 'sm' | 'md'
}) {
  const handleTabClick = (id) => {
    if (id === activeTab) return;
    soundManager.playClick();
    onChange(id);
  };

  const sizeStyles = {
    sm: 'px-5 py-2 text-xs rounded-lg gap-2',
    md: 'px-6 py-3.5 text-xs sm:text-sm rounded-xl gap-2.5'
  };

  return (
    <div className={className}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            className={`font-bold transition-all cursor-pointer inline-flex items-center justify-center ${fullWidth ? 'flex-1' : ''
              } ${sizeStyles[size] || sizeStyles.md} ${isActive
                ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-xl shadow-pink-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
              } ${buttonClassName}`}
          >
            {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'
                  }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
