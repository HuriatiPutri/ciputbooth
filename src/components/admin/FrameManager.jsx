import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, Sparkles, Layers, Image as ImageIcon } from 'lucide-react';
import FrameVisualEditor from './FrameVisualEditor';
import { Button } from '../common';
import { useAuth } from '../../context/AuthContext';

export default function FrameManager() {
  const { authFetch, isAdmin } = useAuth();
  const [frames, setFrames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingFrame, setEditingFrame] = useState(null);

  const loadFrames = async () => {
    try {
      setIsLoading(true);
      const data = await authFetch('/api/frames');
      setFrames(data || []);
    } catch (err) {
      console.error('Error fetching frames:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFrames();
  }, []);

  const handleToggleActive = async (frame) => {
    try {
      const updatedStatus = !frame.is_active;
      const data = await authFetch(`/api/frames/${frame.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: updatedStatus })
      });
      if (data) {
        setFrames(frames.map((f) => (f.id === frame.id ? { ...f, is_active: updatedStatus } : f)));
      }
    } catch (err) {
      console.error('Toggle frame error:', err);
    }
  };

  const handleDeleteFrame = async (id) => {
    if (!window.confirm('Are you sure you want to delete this frame template?')) return;
    try {
      await authFetch(`/api/frames/${id}`, { method: 'DELETE' });
      setFrames(frames.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Delete frame error:', err);
    }
  };

  const handleSaveFrame = async (id, formData) => {
    const url = id ? `/api/frames/${id}` : '/api/frames';
    const method = id ? 'PUT' : 'POST';

    const data = await authFetch(url, {
      method,
      body: formData,
      headers: {
        // Leave headers empty to let the browser set multipart/form-data boundary
      }
    });

    if (!data) {
      throw new Error('Failed to save frame');
    }

    setEditingFrame(null);
    loadFrames();
  };

  const renderFrameCard = (frame) => {
    const slotCount = frame.photo_slots?.length || 0;

    return (
      <div
        key={frame.id}
        className="glass-panel rounded-3xl border border-white/15 overflow-hidden flex flex-col justify-between hover:border-violet-500/50 transition-all duration-300 group shadow-2xl"
      >
        {/* Frame Image Preview */}
        <div className="relative aspect-[3/4] bg-slate-900 flex items-center justify-center p-6 overflow-hidden border-b border-white/10">
          {/* Checkerboard transparency pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:10px_10px] opacity-40"></div>

          <img
            src={frame.image_url}
            alt={frame.name}
            className="relative z-10 max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
          />

          {/* Active status indicator badge */}
          <div className="absolute top-5 left-5 z-20">
            <span
              className={`text-[11px] font-bold px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-xl ${frame.is_active
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 backdrop-blur-md'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 backdrop-blur-md'
                }`}
            >
              <span className={`w-2 h-2 rounded-full ${frame.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              <span>{frame.is_active ? 'Active' : 'Disabled'}</span>
            </span>
          </div>

          {/* Print Size badge */}
          <div className="absolute top-5 right-5 z-20">
            <span className="text-[11px] font-black px-3.5 py-1.5 rounded-full bg-slate-950/90 text-pink-300 border border-white/15 backdrop-blur-md shadow-xl">
              {frame.print_size}
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-8 flex flex-col justify-between gap-2" style={{ padding: '10px' }}>
          <div>
            <h3 className="font-bold text-white text-lg truncate mb-1.5">{frame.name}</h3>
            <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2">
              <Layers className="w-4 h-4 text-violet-400" />
              <span>{slotCount} Photo Slots ({frame.width}x{frame.height}px)</span>
            </p>
          </div>

          {/* Actions Bar */}
          {(!frame.is_admin_frame || isAdmin) ? (
            <div className="flex items-center justify-between pt-5 mt-5 border-t border-white/10 gap-3" style={{ marginBottom: '5px' }}>
              {/* Toggle Active Button */}
              <button
                onClick={() => handleToggleActive(frame)}
                className={`text-xs font-bold px-6 py-3 rounded-xl border transition cursor-pointer ${frame.is_active
                  ? 'bg-slate-900 border-white/15 text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30'
                  }`}
              >
                {frame.is_active ? 'Disable' : 'Enable'}
              </button>

              <div className="flex items-center">
                {/* Edit Coordinates Button */}
                <button
                  onClick={() => setEditingFrame(frame)}
                  className="p-3 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600 hover:text-white transition shadow-md cursor-pointer"
                  title="Edit Slots & Coordinates"
                  style={{ padding: '5px' }}
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteFrame(frame.id)}
                  className="p-3 rounded-xl bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600 hover:text-white transition shadow-md cursor-pointer"
                  title="Delete Frame"
                  style={{ padding: '5px' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center pt-5 mt-5 border-t border-white/10 gap-3" style={{ marginBottom: '5px' }}>
              <span className="text-xs text-slate-500 italic">Provided by Admin</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-10">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white">Frame Template Management</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Configure dynamic frames, transparent overlay graphics, and photo slot coordinates
          </p>
        </div>
        <Button onClick={() => setEditingFrame('new')}>
          <div className='flex gap-2'>
            <Plus className="w-5 h-5 stroke-[3]" />
            Add New Frame Template
          </div>
        </Button>
      </div>

      {/* Frame Cards Grid */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-400">
          <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm font-bold">Loading frame templates...</p>
        </div>
      ) : frames.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl p-10 max-w-md mx-auto shadow-2xl">
          <ImageIcon className="w-14 h-14 text-slate-600 mx-auto mb-4" />
          <h4 className="font-bold text-white text-lg">No frames found</h4>
          <p className="text-xs text-slate-400 mt-1 mb-6">Click below to create your first dynamic frame.</p>
          <button
            onClick={() => setEditingFrame('new')}
            className="px-8 py-4 rounded-2xl btn-primary text-xs font-bold cursor-pointer"
          >
            Create New Frame
          </button>
        </div>
      ) : (
        <div className="space-y-12">

          {/* User Frames Section */}
          {frames.filter(f => !f.is_admin_frame).length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-2">Frame User (Custom)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {frames.filter(f => !f.is_admin_frame).map((frame) => renderFrameCard(frame))}
              </div>
            </div>
          )}
          {/* Admin Frames Section */}
          {frames.filter(f => f.is_admin_frame).length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-2">Frame Admin (Global)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                {frames.filter(f => f.is_admin_frame).map((frame) => renderFrameCard(frame))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Editor Modal */}
      {editingFrame && (
        <FrameVisualEditor
          frame={editingFrame === 'new' ? null : editingFrame}
          onSave={handleSaveFrame}
          onCancel={() => setEditingFrame(null)}
        />
      )}
    </div>
  );
}
