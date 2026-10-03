import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Eye, EyeOff, Save, X, Sparkles, Layers, Upload } from 'lucide-react';
import { generateMockPhoto } from '../../utils/canvasRenderer';
import { Button } from '../common';

export default function FrameVisualEditor({ frame, onSave, onCancel }) {
  const [name, setName] = useState(frame?.name || '');
  const [printSize, setPrintSize] = useState(frame?.print_size || '4x6');
  const [description, setDescription] = useState(frame?.description || '');
  const [isActive, setIsActive] = useState(frame?.is_active ?? true);
  const [width, setWidth] = useState(frame?.width || 1200);
  const [height, setHeight] = useState(frame?.height || 1800);
  const [imageUrl, setImageUrl] = useState(frame?.image_url || '');
  const [imageFile, setImageFile] = useState(null);
  const [photoSlots, setPhotoSlots] = useState(
    frame?.photo_slots && frame.photo_slots.length > 0
      ? frame.photo_slots
      : [
        { order: 1, x: 80, y: 80, width: 480, height: 600 },
        { order: 2, x: 640, y: 80, width: 480, height: 600 }
      ]
  );

  const [selectedSlotIndex, setSelectedSlotIndex] = useState(0);
  const [showDummyPreview, setShowDummyPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Dragging & Resizing state
  const canvasContainerRef = useRef(null);
  const [dragAction, setDragAction] = useState(null);

  // Handle PNG image upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.name.endsWith('.png')) {
      alert('Please upload a transparent PNG image file.');
      return;
    }

    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImageUrl(objectUrl);

    // Read natural dimensions
    const img = new Image();
    img.onload = () => {
      setWidth(img.naturalWidth || 1200);
      setHeight(img.naturalHeight || 1800);
    };
    img.src = objectUrl;
  };

  // Add a new photo slot
  const handleAddSlot = () => {
    const newOrder = photoSlots.length + 1;
    const newSlot = {
      order: newOrder,
      x: 100,
      y: 100 + (photoSlots.length * 120) % (height - 400),
      width: Math.min(500, width - 200),
      height: 400
    };
    setPhotoSlots([...photoSlots, newSlot]);
    setSelectedSlotIndex(photoSlots.length);
  };

  // Delete slot
  const handleDeleteSlot = (index) => {
    const updated = photoSlots.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    setPhotoSlots(updated);
    setSelectedSlotIndex(Math.max(0, index - 1));
  };

  // Update specific field on slot
  const handleSlotChange = (index, field, value) => {
    const val = parseInt(value, 10) || 0;
    const updated = [...photoSlots];
    updated[index] = { ...updated[index], [field]: val };
    setPhotoSlots(updated);
  };

  // Preset layouts helper
  const applyPresetLayout = (type) => {
    if (type === '3-strip') {
      setWidth(600);
      setHeight(1800);
      setPrintSize('2x6');
      setPhotoSlots([
        { order: 1, x: 50, y: 80, width: 500, height: 380 },
        { order: 2, x: 50, y: 500, width: 500, height: 380 },
        { order: 3, x: 50, y: 920, width: 500, height: 380 }
      ]);
    } else if (type === '4-grid') {
      setWidth(1200);
      setHeight(1800);
      setPrintSize('4x6');
      setPhotoSlots([
        { order: 1, x: 80, y: 80, width: 490, height: 600 },
        { order: 2, x: 630, y: 80, width: 490, height: 600 },
        { order: 3, x: 80, y: 720, width: 490, height: 600 },
        { order: 4, x: 630, y: 720, width: 490, height: 600 }
      ]);
    } else if (type === '2-duo') {
      setWidth(1200);
      setHeight(1800);
      setPrintSize('4x6');
      setPhotoSlots([
        { order: 1, x: 100, y: 120, width: 1000, height: 680 },
        { order: 2, x: 100, y: 860, width: 1000, height: 680 }
      ]);
    }
  };

  // Pointer drag events for interactive visual editing
  const startDrag = (e, index, type, handle = null) => {
    e.stopPropagation();
    setSelectedSlotIndex(index);
    setDragAction({
      type,
      slotIndex: index,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initialSlot: { ...photoSlots[index] }
    });
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragAction || !canvasContainerRef.current) return;

      const rect = canvasContainerRef.current.getBoundingClientRect();
      const scaleX = width / rect.width;
      const scaleY = height / rect.height;

      const deltaX = Math.round((e.clientX - dragAction.startX) * scaleX);
      const deltaY = Math.round((e.clientY - dragAction.startY) * scaleY);

      const slot = { ...dragAction.initialSlot };

      if (dragAction.type === 'move') {
        slot.x = Math.max(0, Math.min(width - slot.width, slot.x + deltaX));
        slot.y = Math.max(0, Math.min(height - slot.height, slot.y + deltaY));
      } else if (dragAction.type === 'resize') {
        if (dragAction.handle?.includes('r')) {
          slot.width = Math.max(50, slot.width + deltaX);
        }
        if (dragAction.handle?.includes('b')) {
          slot.height = Math.max(50, slot.height + deltaY);
        }
        if (dragAction.handle?.includes('l')) {
          const newW = Math.max(50, slot.width - deltaX);
          slot.x = slot.x + (slot.width - newW);
          slot.width = newW;
        }
        if (dragAction.handle?.includes('t')) {
          const newH = Math.max(50, slot.height - deltaY);
          slot.y = slot.y + (slot.height - newH);
          slot.height = newH;
        }
      }

      const updated = [...photoSlots];
      updated[dragAction.slotIndex] = slot;
      setPhotoSlots(updated);
    };

    const handlePointerUp = () => {
      if (dragAction) {
        setDragAction(null);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragAction, width, height, photoSlots]);

  // Submit form
  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please provide a frame name.');
      return;
    }
    if (!imageUrl) {
      alert('Please upload a frame PNG overlay image.');
      return;
    }
    if (photoSlots.length === 0) {
      alert('Please add at least 1 photo slot coordinate.');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('print_size', printSize);
      formData.append('description', description);
      formData.append('is_active', isActive);
      formData.append('width', width);
      formData.append('height', height);
      formData.append('photo_slots', JSON.stringify(photoSlots));

      if (imageFile) {
        formData.append('frame_image', imageFile);
      } else {
        formData.append('image_url', imageUrl);
      }

      await onSave(frame?.id, formData);
    } catch (err) {
      console.error('Save frame error:', err);
      alert('Failed to save frame: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedSlot = photoSlots[selectedSlotIndex] || photoSlots[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col p-8 sm:p-10 overflow-hidden">
      {/* Top Navbar */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10">
        <div className="flex items-center gap-5">
          <div className="p-4 rounded-2xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
            <Layers className="w-7 h-7" />
          </div>
          <div>
            <h2 className="font-display font-black text-2xl sm:text-3xl text-white">
              {frame ? 'Edit Frame Coordinates & Slots' : 'Create New Frame Template'}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Upload PNG overlay with transparent holes and visually define photo placement coordinates
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowDummyPreview(!showDummyPreview)}
            className={`px-8 py-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2.5 border transition cursor-pointer ${showDummyPreview
              ? 'bg-pink-500/20 text-pink-300 border-pink-500/40 shadow-xl'
              : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
              }`}
          >
            {showDummyPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span>{showDummyPreview ? 'Hide Dummy Photos' : 'Show Dummy Photos'}</span>
          </button>

          <button
            onClick={onCancel}
            className="p-3.5 rounded-xl bg-slate-900 border border-white/15 text-slate-400 hover:text-white hover:bg-slate-800 transition shadow-md cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Workspace: Left is Interactive Visual Canvas, Right is Settings / Slot Inspector */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 pt-8 overflow-hidden">
        {/* Left: Interactive Visual Canvas Area */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center glass-panel rounded-3xl p-8 overflow-hidden relative shadow-2xl">
          {/* Quick Layout Presets Bar */}
          <div className="absolute top-6 left-6 z-20 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl border border-white/15 shadow-2xl">
            <span className="text-xs font-bold text-slate-400 px-3">Presets:</span>
            <button
              onClick={() => applyPresetLayout('3-strip')}
              className="text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition"
            >
              2x6 (3-Strip)
            </button>
            <button
              onClick={() => applyPresetLayout('4-grid')}
              className="text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition"
            >
              4x6 (4-Grid)
            </button>
            <button
              onClick={() => applyPresetLayout('2-duo')}
              className="text-xs sm:text-sm font-bold px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition"
            >
              4x6 (2-Duo)
            </button>
          </div>

          {/* Interactive Bounding Box Canvas Container */}
          <div
            ref={canvasContainerRef}
            className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/25 bg-slate-900 select-none max-h-[66vh] max-w-full"
            style={{
              aspectRatio: `${width}/${height}`
            }}
          >
            {/* Transparent checkerboard background */}
            <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:12px_12px] opacity-40"></div>

            {/* Render Dummy Photos or Slot Visual Rectangles behind frame overlay */}
            {photoSlots.map((slot, idx) => {
              const isSelected = selectedSlotIndex === idx;
              const relX = (slot.x / width) * 100;
              const relY = (slot.y / height) * 100;
              const relW = (slot.width / width) * 100;
              const relH = (slot.height / height) * 100;

              return (
                <div
                  key={idx}
                  onPointerDown={(e) => startDrag(e, idx, 'move')}
                  className={`absolute cursor-move transition-shadow ${isSelected ? 'ring-2 ring-pink-500 z-30 shadow-2xl' : 'ring-1 ring-violet-400/60 z-20'
                    }`}
                  style={{
                    left: `${relX}%`,
                    top: `${relY}%`,
                    width: `${relW}%`,
                    height: `${relH}%`
                  }}
                >
                  {/* Dummy Portrait Image or Colorful Slot Background */}
                  {showDummyPreview ? (
                    <img
                      src={generateMockPhoto(slot.order || idx + 1)}
                      alt={`Slot ${slot.order}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-violet-600/40 flex items-center justify-center text-white font-bold text-xs">
                      Slot #{slot.order || idx + 1}
                    </div>
                  )}

                  {/* Slot Order Badge */}
                  <div className="absolute top-2 left-2 bg-pink-600 text-white font-black text-xs px-2.5 py-1 rounded shadow-lg">
                    #{slot.order || idx + 1}
                  </div>

                  {/* Resize Handles (Corners) for Selected Slot */}
                  {isSelected && (
                    <>
                      <div
                        onPointerDown={(e) => startDrag(e, idx, 'resize', 'tl')}
                        className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-pink-400 border-2 border-white rounded-full cursor-nwse-resize shadow-lg"
                      />
                      <div
                        onPointerDown={(e) => startDrag(e, idx, 'resize', 'tr')}
                        className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-pink-400 border-2 border-white rounded-full cursor-nesw-resize shadow-lg"
                      />
                      <div
                        onPointerDown={(e) => startDrag(e, idx, 'resize', 'bl')}
                        className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-pink-400 border-2 border-white rounded-full cursor-nesw-resize shadow-lg"
                      />
                      <div
                        onPointerDown={(e) => startDrag(e, idx, 'resize', 'br')}
                        className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-pink-400 border-2 border-white rounded-full cursor-nwse-resize shadow-lg"
                      />
                    </>
                  )}
                </div>
              );
            })}

            {/* Frame PNG Overlay Layer */}
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Frame Overlay"
                className="relative z-25 w-full h-full object-contain pointer-events-none"
              />
            )}
          </div>
        </div>

        {/* Right: Frame Settings & Slot Inspector Form */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-1">
          {/* Section 1: Frame Metadata */}
          <div className="flex flex-col rounded-3xl p-8 border border-white/15 gap-3 shadow-2xl" style={{ padding: '10px' }}>
            <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-pink-400" />
              <span>Frame Information</span>
            </h3>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Frame Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g. Retro Party Strip"
                className="w-full bg-slate-900 border border-white/15 px-6 py-3.5 h-10 rounded-xl text-xs sm:text-sm text-white focus:border-violet-500 outline-none shadow-inner"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Print Size</label>
                <select
                  value={printSize}
                  onChange={(e) => setPrintSize(e.target.value)}
                  className="w-full bg-slate-900 border border-white/15 px-6 py-3.5 h-10 rounded-xl text-xs sm:text-sm text-white focus:border-violet-500 outline-none shadow-inner cursor-pointer"
                >
                  <option value="2x6">2x6 Strip</option>
                  <option value="4x6">4x6 Postcard</option>
                  <option value="6x6">6x6 Square</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Status</label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-full py-3.5 rounded-xl  h-10 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                >
                  <span>{isActive ? '● Active in Kiosk' : '○ Inactive (Hidden)'}</span>
                </button>
              </div>
            </div>

            {/* Upload PNG file */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-2">Frame Image (PNG with Alpha)</label>
              <label className="flex items-center justify-center gap-3 p-5 rounded-2xl border border-dashed border-white/25 bg-slate-900/60 hover:bg-slate-800 cursor-pointer text-xs font-bold text-slate-300 transition shadow-inner">
                <Upload className="w-5 h-5 text-violet-400" />
                <span className="truncate">{imageFile ? imageFile.name : 'Upload New PNG...'}</span>
                <input type="file" accept="image/png,image/webp" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 pt-1">
              <div>Canvas Width: <span className="text-white font-mono font-bold">{width}px</span></div>
              <div>Canvas Height: <span className="text-white font-mono font-bold">{height}px</span></div>
            </div>
          </div>

          {/* Section 2: Photo Slots Coordinates Manager */}
          <div className="flex flex-col rounded-3xl p-8 border border-white/15 gap-3 shadow-2xl" style={{ padding: '10px' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-violet-400" />
                <span>Photo Slots ({photoSlots.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddSlot}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Slot</span>
              </button>
            </div>

            {/* Slots List Pills */}
            <div className="flex gap-2.5 overflow-x-auto pb-2">
              {photoSlots.map((slot, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedSlotIndex(idx)}
                  className={`px-6 py-3 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 cursor-pointer ${selectedSlotIndex === idx
                    ? 'bg-pink-500 text-white shadow-xl'
                    : 'bg-slate-900 text-slate-400 border border-white/10 hover:text-white hover:bg-slate-800'
                    }`}
                  style={{ padding: '4px 8px' }}
                >
                  <span>Slot #{slot.order || idx + 1}</span>
                </button>
              ))}
            </div>

            {/* Selected Slot Coordinate Inputs */}
            {selectedSlot && (
              <div className="space-y-4 bg-slate-900/90 p-5 rounded-2xl border border-white/15 shadow-inner" style={{ padding: '8px' }}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <span className="text-xs font-black text-pink-300">
                    Slot #{selectedSlot.order || selectedSlotIndex + 1} Coordinates:
                  </span>
                  {photoSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(selectedSlotIndex)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">X Position (px)</label>
                    <input
                      type="number"
                      value={selectedSlot.x}
                      onChange={(e) => handleSlotChange(selectedSlotIndex, 'x', e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-pink-500 shadow-inner"
                      style={{ padding: '4px' }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Y Position (px)</label>
                    <input
                      type="number"
                      value={selectedSlot.y}
                      onChange={(e) => handleSlotChange(selectedSlotIndex, 'y', e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-pink-500 shadow-inner"
                      style={{ padding: '4px' }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Width (px)</label>
                    <input
                      type="number"
                      value={selectedSlot.width}
                      onChange={(e) => handleSlotChange(selectedSlotIndex, 'width', e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-pink-500 shadow-inner"
                      style={{ padding: '4px' }}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 block mb-1">Height (px)</label>
                    <input
                      type="number"
                      value={selectedSlot.height}
                      onChange={(e) => handleSlotChange(selectedSlotIndex, 'height', e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 px-4 py-2.5 rounded-xl text-xs font-mono font-bold text-white outline-none focus:border-pink-500 shadow-inner"
                      style={{ padding: '4px' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="pt-2 mt-auto">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="w-full"
            >
              <div className='flex gap-2'>
                <Save className="w-5 h-5" />
                <span>{isSaving ? 'Saving Frame...' : 'Save Frame & Coordinates'}</span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
