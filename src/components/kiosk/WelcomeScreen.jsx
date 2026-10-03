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
      className="relative w-full h-full flex flex-col items-center justify-between p-8 sm:p-12 overflow-hidden cursor-pointer select-none"
    >
      {/* Dynamic Ambient Background Elements */}
      <AmbientBackground primaryColor="bg-violet-600/25" secondaryColor="bg-pink-600/20" />

      {/* Top Section */}
      <div className="w-full flex justify-center pt-8 sm:pt-10 z-10">
        <Badge variant="violet" icon={Sparkles} size="md">
          {studioName}
        </Badge>
      </div>

      {/* Center Hero Section */}
      <div className="flex flex-col items-center text-center z-10 max-w-3xl px-6 my-auto">
        {/* Animated Badge */}
        <div className="relative mb-6">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-violet-600 via-pink-500 to-amber-400 p-[2px] shadow-2xl shadow-pink-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
              <Camera className="w-14 h-14 text-white animate-bounce" style={{ animationDuration: '2.5s' }} />
            </div>
          </div>
          <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
            HD 4K
          </span>
        </div>

        <h1 className="font-display font-black text-5xl sm:text-7xl tracking-tight leading-none mb-5 uppercase">
          <span className="bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent mr-3">
            {part1}
          </span>
          <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
            {part2}
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-xl font-normal leading-relaxed mb-10 px-4">
          Pick your favorite custom frame, strike your best poses, and take home glossy studio prints in seconds!
        </p>

        {/* Pulsing Start Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            startSession();
          }}
          className="group relative inline-flex items-center justify-center gap-5 px-14 py-6 sm:px-20 sm:py-6 rounded-full btn-primary text-xl font-display font-black shadow-2xl transition-all cursor-pointer hover:scale-105"
        >
          <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-violet-600 via-pink-500 to-amber-400 opacity-60 blur-lg group-hover:opacity-100 transition duration-500"></span>
          <span className="relative flex items-center gap-4">
            <span className="tracking-wide">TOUCH SCREEN TO START</span>
            <ArrowRight className="w-7 h-7 group-hover:translate-x-2 transition-transform stroke-[2.5]" />
          </span>
        </button>
      </div>

      {/* Bottom Feature Badges */}
      <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-3 gap-6 z-10 pb-6 px-6">
        <GlassCard padding="p-8" className="flex items-center gap-6 text-left shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center p-3.5 flex-shrink-0 shadow-inner">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="font-bold text-white text-base sm:text-lg truncate">Dynamic Frames</h4>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5 leading-relaxed">Custom artist layouts</p>
          </div>
        </GlassCard>

        <GlassCard padding="p-8" className="flex items-center gap-6 text-left shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center p-3.5 flex-shrink-0 shadow-inner">
            <Printer className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="font-bold text-white text-base sm:text-lg truncate">Instant Printing</h4>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5 leading-relaxed">EcoTank / DNP Thermal</p>
          </div>
        </GlassCard>

        <GlassCard padding="p-8" className="flex items-center gap-6 text-left shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center p-3.5 flex-shrink-0 shadow-inner">
            <QrCode className="w-7 h-7" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="font-bold text-white text-base sm:text-lg truncate">Digital QR Code</h4>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5 leading-relaxed">Direct to your phone</p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
