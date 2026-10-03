import React, { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Check, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import { useBooth } from '../../context/BoothContext';
import { AmbientBackground, Badge, TabGroup, Button } from '../common';

export default function FrameSelectScreen() {
  const { frames, selectedFrame, chooseFrame, confirmFrame, isLoading, settings } = useBooth();
  const [filterSize, setFilterSize] = useState(settings?.printLayout || 'all'); // all | 2x6 | 4x6
  const carouselRef = useRef(null);

  const filterTabs = [
    { id: 'all', label: `All Frames (${frames.length})` },
    { id: '2x6', label: '2x6 Strips' },
    { id: '4x6', label: '4x6 Postcards / Grids' }
  ];

  const filteredFrames = frames.filter((f) => {
    if (filterSize === 'all') return true;
    return f.print_size === filterSize;
  });

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 360;
      carouselRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between items-center py-4 px-6 sm:px-12 overflow-hidden bg-slate-950 select-none relative">
      {/* Background ambient lighting */}
      <AmbientBackground primaryColor="bg-violet-600/15" secondaryColor="bg-pink-600/15" />

      {/* Top Header Section */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center text-center z-10 flex-shrink-0">
        <Badge variant="violet" icon={Layers} className="mb-2">
          Step 1 of 3: Frame Selection
        </Badge>
        <h2 className="font-display font-black text-3xl sm:text-4xl text-white tracking-tight mb-2">
          Choose Your Photo Frame
        </h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-lg mb-4">
          Select your favorite template layout. Each frame holds a specific number of camera shots.
        </p>

        {/* Filter Tabs */}
        <TabGroup
          tabs={filterTabs}
          activeTab={filterSize}
          onChange={setFilterSize}
          size="md"
          className="flex bg-slate-900/90 h-10 p-2 rounded-2xl border border-white/15 gap-2 shadow-inner "
        />
      </div>

      {/* Main Full-Height Center Carousel Stage (Centered!) */}
      <div className="relative w-full max-w-6xl mx-auto z-10 flex-1 flex items-center justify-center min-h-0 my-auto p-4 overflow-hidden">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={() => scrollCarousel('left')}
          className="hidden md:flex absolute left-0 z-20 w-14 h-14 rounded-full bg-slate-900/95 border border-white/25 text-white items-center justify-center shadow-2xl hover:bg-slate-800 hover:scale-110 active:scale-95 transition cursor-pointer"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        {/* Carousel Viewport with justify-center */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm font-bold">Loading studio frames...</p>
          </div>
        ) : filteredFrames.length === 0 ? (
          <div className="py-16 text-center text-slate-400 glass-panel rounded-3xl p-10 max-w-md shadow-2xl">
            <ImageIcon className="w-14 h-14 text-slate-600 mx-auto mb-4" />
            <h4 className="font-bold text-white text-lg">No active frames found</h4>
            <p className="text-xs text-slate-400 mt-1">Please enable or upload frames in the Admin Dashboard.</p>
          </div>
        ) : (
          <div
            ref={carouselRef}
            className="w-full overflow-x-auto py-4 px-4 sm:px-12 no-scrollbar scroll-smooth snap-x snap-mandatory h-full flex items-center"
          >
            <div className="flex items-center gap-6 sm:gap-8 mx-auto min-w-max px-4 py-2">
              {filteredFrames.map((frame) => {
                const isSelected = selectedFrame?._id === frame._id;
                const slotCount = frame.photo_slots?.length || 0;

                return (
                  <div
                    key={frame.id}
                    onClick={() => chooseFrame(frame)}
                    className={`relative flex-shrink-0 cursor-pointer snap-center transition-all duration-300 transform group ${isSelected
                      ? 'scale-105 ring-4 ring-pink-500 shadow-2xl shadow-pink-500/40 rounded-3xl'
                      : 'scale-95 opacity-75 hover:opacity-100 hover:scale-100'
                      }`}
                    style={{ width: frame.print_size === '2x6' ? '250px' : '290px' }}
                  >
                    {/* Frame Visual Card with generous padding */}
                    <div className="relative rounded-3xl overflow-hidden glass-panel border border-white/20 p-6 flex flex-col items-center bg-slate-950/95 shadow-2xl">
                      {/* Selected Check Indicator */}
                      {isSelected && (
                        <div className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-xl animate-count-pop">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                      )}

                      {/* Frame Visual Image & Slot Overlay */}
                      <div
                        className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-white/15 flex items-center justify-center p-3 shadow-inner"
                        style={{
                          aspectRatio: frame.width && frame.height ? `${frame.width}/${frame.height}` : '2/3',
                          maxHeight: '38vh'
                        }}
                      >
                        {/* Checkerboard transparency pattern */}
                        <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:10px_10px] opacity-40"></div>

                        {/* Frame Image Layer */}
                        <img
                          src={frame.image_url}
                          alt={frame.name}
                          className="relative z-10 w-full h-full object-contain pointer-events-none"
                        />
                      </div>

                      {/* Frame Card Details with generous spacing & padding */}
                      <div className="w-full mt-4 px-3 pb-1 text-left space-y-1.5" style={{ padding: '10px' }}>
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-white truncate">{frame.name}</h3>
                          <Badge variant="pink" size="sm">
                            {frame.print_size}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span>{slotCount} Photo {slotCount === 1 ? 'Shot' : 'Shots'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={() => scrollCarousel('right')}
          className="hidden md:flex absolute right-0 z-20 w-14 h-14 rounded-full bg-slate-900/95 border border-white/25 text-white items-center justify-center shadow-2xl hover:bg-slate-800 hover:scale-110 active:scale-95 transition cursor-pointer"
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>

      {/* Bottom Floating Action Dock (Centered) */}
      <div className="w-full mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 px-8 py-4 shadow-2xl bg-slate-900/90 backdrop-blur-xl z-10 flex-shrink-0">
        <div className="text-left flex flex-col justify-center">
          <p className="text-xs text-slate-400 font-bold tracking-wide">Selected Template Layout:</p>
          <p className="text-base sm:text-lg font-black text-white flex items-center gap-2.5 mt-0.5">
            <span className="w-3 h-3 rounded-full bg-pink-500 animate-pulse"></span>
            <span>{selectedFrame?.name || 'Please select a frame'}</span>
            {selectedFrame && (
              <Badge variant="pink" size="sm">
                {selectedFrame.photo_slots?.length || 0} Shots
              </Badge>
            )}
          </p>
        </div>

        <Button
          variant="primary"
          size="xl"
          rightIcon={ChevronRight}
          onClick={confirmFrame}
          disabled={!selectedFrame}
        >
          CONFIRM & START POSING
        </Button>
      </div>
    </div>
  );
}
