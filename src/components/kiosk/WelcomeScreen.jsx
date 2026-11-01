import React from 'react';
import { Sparkles, Camera, Printer, QrCode, ArrowRight } from 'lucide-react';
import { useBooth } from '../../context/BoothContext';
import { AmbientBackground, GlassCard, Badge } from '../common';

export default function WelcomeScreen() {
  const { startSession, settings } = useBooth();

  const studioName = settings?.studioName || 'CIPUTBOOTH';
  const words = studioName.trim().split(' ');
  const part1 = words.length > 1 ? words.slice(0, Math.ceil(words.length / 2)).join(' ') : studioName.slice(0, Math.ceil(studioName.length / 2));
  const part2 = words.length > 1 ? words.slice(Math.ceil(words.length / 2)).join(' ') : studioName.slice(Math.ceil(studioName.length / 2));

  return (
    <div
      onClick={startSession}
      className="relative w-full h-full flex flex-col items-center justify-between p-5 sm:p-8 md:p-10 overflow-hidden cursor-pointer select-none"
    >
      {/* Dynamic Ambient Background Elements */}
      <AmbientBackground primaryColor="bg-violet-600/25" secondaryColor="bg-pink-600/20" />

      {/* Top Section */}
      <div className="w-full flex justify-center pt-4 sm:pt-6 md:pt-8 z-10 flex-shrink-0">
        <Badge variant="violet" icon={Sparkles} size="md">
          {studioName}
        </Badge>
      </div>

      {/* Center Hero Section */}
      <div className="flex flex-col items-center text-center z-10 max-w-3xl px-4 sm:px-6 my-auto">
        {/* Animated Badge */}
        <div className="relative mb-4 md:mb-6">
          <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl bg-gradient-to-tr from-violet-600 via-pink-500 to-amber-400 p-[2px] shadow-2xl shadow-pink-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Camera className="w-10 h-10 sm:w-14 sm:h-14 text-white animate-bounce" style={{ animationDuration: '2.5s' }} />
            </div>
          </div>
          <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] sm:text-xs font-black px-3 py-1 sm:px-4 sm:py-1.5 rounded-full shadow-lg">
            HD 4K
          </span>
        </div>

        <h1 className="font-display font-black text-3xl sm:text-5xl md:text-6xl lg:text-7xl tracking-tight leading-none mb-3 sm:mb-5 uppercase">
          <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mr-2 sm:mr-3">
            {part1}
          </span>
          <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            {part2}
          </span>
        </h1>

        <p className="text-slate-400 text-sm sm:text-base md:text-lg max-w-xl font-normal leading-relaxed mb-6 sm:mb-10 px-4">
          Pick your favorite custom frame, strike your best poses, and take home glossy studio prints in seconds!
        </p>

        {/* Pulsing Start Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            startSession();
          }}
          className="group relative inline-flex items-center justify-center gap-3 sm:gap-5 px-10 py-5 sm:px-14 sm:py-6 md:px-20 md:py-6 rounded-full btn-primary text-base sm:text-xl font-display font-black shadow-2xl transition-all cursor-pointer hover:scale-105"
        >
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-violet-600 via-pink-500 to-amber-400 opacity-60 blur-lg group-hover:opacity-100 transition duration-500"></span>
          <span className="relative flex items-center gap-3 sm:gap-4">
            <span className="tracking-wide">TOUCH SCREEN TO START</span>
            <ArrowRight className="w-6 h-6 sm:w-7 sm:h-7 group-hover:translate-x-2 transition-transform stroke-[2.5]" />
          </span>
        </button>
      </div>

      {/* Bottom Feature Badges */}
      <div className="w-full max-w-6xl grid grid-cols-3 gap-3 sm:gap-4 md:gap-6 z-10 pb-4 sm:pb-6 px-2 sm:px-6">
        <GlassCard padding="p-4 sm:p-6 md:p-8" className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 md:gap-6 text-center sm:text-left shadow-2xl">
          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center p-2 sm:p-3 md:p-3.5 flex-shrink-0 shadow-inner">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-xs sm:text-base md:text-lg truncate">Dynamic Frames</h4>
            <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm mt-0.5 leading-relaxed hidden sm:block">Custom artist layouts</p>
          </div>
        </GlassCard>

        <GlassCard padding="p-4 sm:p-6 md:p-8" className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 md:gap-6 text-center sm:text-left shadow-2xl">
          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center p-2 sm:p-3 md:p-3.5 flex-shrink-0 shadow-inner">
            <Printer className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-xs sm:text-base md:text-lg truncate">Instant Printing</h4>
            <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm mt-0.5 leading-relaxed hidden sm:block">EcoTank / DNP Thermal</p>
          </div>
        </GlassCard>

        <GlassCard padding="p-4 sm:p-6 md:p-8" className="flex flex-col sm:flex-row items-center sm:items-center gap-2 sm:gap-4 md:gap-6 text-center sm:text-left shadow-2xl">
          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl sm:rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center p-2 sm:p-3 md:p-3.5 flex-shrink-0 shadow-inner">
            <QrCode className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-white text-xs sm:text-base md:text-lg truncate">Digital QR Code</h4>
            <p className="text-slate-400 text-[10px] sm:text-xs md:text-sm mt-0.5 leading-relaxed hidden sm:block">Direct to your phone</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
