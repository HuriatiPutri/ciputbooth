import React from 'react';

/**
 * Reusable Ambient Background with glowing color orbs and subtle grid pattern
 */
export default function AmbientBackground({
  primaryColor = 'bg-violet-600/15',
  secondaryColor = 'bg-pink-600/15',
  showGrid = true
}) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      {/* Primary Ambient Orb */}
      <div
        className={`absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] ${primaryColor} rounded-full blur-3xl`}
      />

      {/* Secondary Ambient Orb */}
      <div
        className={`absolute -bottom-20 right-10 w-96 h-96 ${secondaryColor} rounded-full blur-3xl`}
      />

      {/* Radial Grid Pattern */}
      {showGrid && (
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />
      )}
    </div>
  );
}
