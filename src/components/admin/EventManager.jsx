import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, Pencil, Trash2, Link as LinkIcon, Check, Wallet, Gift, Play } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Modal, Button, Badge } from '../common';

const EMPTY_FORM = {
  event_name: '',
  payment_type: 'free',
  price_per_photo: '',
  photo_flow: 'choose_frame',
  available_frames: [],
  default_frame_id: '',
  enable_live_picture: true
};

const FIELD_CLASS =
  'w-full bg-slate-950 border border-white/15 text-white px-5 py-3 rounded-2xl outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20';

const formatRupiah = (n) => `Rp ${Number(n).toLocaleString('id-ID')}`;

function OptionGroup({ label, value, options, onChange }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-xs font-bold text-slate-300 mb-1">{label}</legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`text-left p-4 rounded-2xl border transition cursor-pointer ${
              value === opt.value
                ? 'border-violet-500 bg-violet-500/15 text-white'
                : 'border-white/15 bg-slate-950 text-slate-400 hover:text-white'
            }`}
          >
            <p className="font-bold text-sm">{opt.title}</p>
            <p className="text-[11px] mt-0.5 text-slate-400">{opt.hint}</p>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function EventManager() {
  const { authFetch, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [frames, setFrames] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null); // null = modal closed
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [eventData, frameData] = await Promise.all([
        authFetch('/api/events'),
        authFetch('/api/frames')
      ]);
      setEvents(eventData);
      setFrames(frameData || []);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const frameName = (id) => frames.find((f) => f.id === id)?.name || 'Unknown frame';

  const openCreate = () => {
    setEditingId(null);
    setError('');
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (event) => {
    setEditingId(event.id);
    setError('');
    setForm({
      event_name: event.event_name,
      payment_type: event.payment_type,
      price_per_photo: event.price_per_photo || '',
      photo_flow: event.photo_flow,
      available_frames: event.available_frames,
      default_frame_id: event.default_frame_id || '',
      enable_live_picture: event.enable_live_picture !== false
    });
  };

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const toggleFrame = (id) =>
    update({
      available_frames: form.available_frames.includes(id)
        ? form.available_frames.filter((f) => f !== id)
        : [...form.available_frames, id]
    });

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    try {
      const url = editingId ? `/api/events/${editingId}` : '/api/events';
      await authFetch(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...form,
          price_per_photo: form.payment_type === 'paid' ? Number(form.price_per_photo) : 0
        })
      });
      setForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete event "${event.event_name}"?`)) return;
    try {
      await authFetch(`/api/events/${event.id}`, { method: 'DELETE' });
      setEvents((prev) => prev.filter((ev) => ev.id !== event.id));
    } catch (err) {
      alert(err.message);
    }
  };

  const copyKioskLink = (event) => {
    navigator.clipboard.writeText(`${window.location.origin}/?event=${event.id}`);
    setCopiedId(event.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const startEvent = (event) => {
    // Navigate and hard-refresh to reset booth context state for the new event
    window.location.href = `/?event=${event.id}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white">Events</h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Each event has its own payment type and photo flow. Share its kiosk link to start it.
          </p>
        </div>
        <Button variant="primary" size="lg" leftIcon={CalendarPlus} onClick={openCreate}>
          New Event
        </Button>
      </div>

      {isLoading ? (
        <p className="py-16 text-center text-slate-400 text-sm font-bold">Loading events...</p>
      ) : events.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 text-center max-w-md mx-auto">
          <CalendarPlus className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="font-bold text-white">No events yet</h3>
          <p className="text-xs text-slate-400 mt-1">Create your first event to get a kiosk link.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {events.map((event) => (
            <article key={event.id} className="glass-panel rounded-3xl border border-white/15 p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg text-white truncate">{event.event_name}</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Created {new Date(event.created_at).toLocaleDateString()}
                    {isAdmin && ` · owner ${event.user_id.slice(-6)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={event.enable_live_picture !== false ? 'pink' : 'gray'} size="sm">
                    {event.enable_live_picture !== false ? 'Live Picture ✨' : 'Photo Only 📷'}
                  </Badge>
                  {event.payment_type === 'paid' ? (
                    <Badge variant="violet" size="sm" icon={Wallet}>
                      {formatRupiah(event.price_per_photo)}
                    </Badge>
                  ) : (
                    <Badge variant="violet" size="sm" icon={Gift}>
                      Free
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-300">
                {event.photo_flow === 'default_frame'
                  ? `Quick flow · ${frameName(event.default_frame_id)}`
                  : `Customer picks from ${event.available_frames.length} frame(s)`}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="primary" size="sm" leftIcon={Play} onClick={() => startEvent(event)}>
                  Start Kiosk
                </Button>
                <Button variant="secondary" size="sm" leftIcon={copiedId === event.id ? Check : LinkIcon} onClick={() => copyKioskLink(event)}>
                  {copiedId === event.id ? 'Copied!' : 'Copy Link'}
                </Button>
                <Button variant="outline" size="sm" leftIcon={Pencil} onClick={() => openEdit(event)}>
                  Edit
                </Button>
                <Button variant="danger" size="sm" leftIcon={Trash2} onClick={() => handleDelete(event)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={editingId ? 'Edit Event' : 'New Event'}
        subtitle="Configure payment and how customers choose a frame"
        icon={CalendarPlus}
        maxWidth="max-w-2xl"
      >
        {form && (
          <form onSubmit={handleSave} className="flex flex-col gap-5 w-full">
            <label className="flex flex-col gap-2 text-xs font-bold text-slate-300">
              Event name
              <input
                required
                value={form.event_name}
                onChange={(e) => update({ event_name: e.target.value })}
                placeholder="e.g. Rina & Dimas Wedding"
                className={FIELD_CLASS}
              />
            </label>

            <OptionGroup
              label="Payment"
              value={form.payment_type}
              onChange={(payment_type) => update({ payment_type })}
              options={[
                { value: 'free', title: 'Free (Vendor)', hint: 'Guests take photos without paying' },
                { value: 'paid', title: 'Paid', hint: 'Guests pay before the booth unlocks' }
              ]}
            />

            {form.payment_type === 'paid' && (
              <label className="flex flex-col gap-2 text-xs font-bold text-slate-300">
                Price per photo (IDR)
                <input
                  type="number"
                  min="1"
                  required
                  value={form.price_per_photo}
                  onChange={(e) => update({ price_per_photo: e.target.value })}
                  className={FIELD_CLASS}
                />
              </label>
            )}

            <OptionGroup
              label="Photo flow"
              value={form.photo_flow}
              onChange={(photo_flow) => update({ photo_flow })}
              options={[
                { value: 'choose_frame', title: 'Choose frame', hint: 'Guests pick from selected frames' },
                { value: 'default_frame', title: 'Quick (default)', hint: 'Straight to camera with one frame' }
              ]}
            />

            <OptionGroup
              label="Live Picture Feature"
              value={form.enable_live_picture ? 'enabled' : 'disabled'}
              onChange={(val) => update({ enable_live_picture: val === 'enabled' })}
              options={[
                { value: 'enabled', title: 'Enable Live Picture ✨', hint: 'Short video loops on preview & softcopy' },
                { value: 'disabled', title: 'Photo Strip Only 📷', hint: 'Standard photos only, no live video' }
              ]}
            />

            {frames.length === 0 ? (
              <p className="text-xs text-amber-300">No frames yet. Upload a frame first.</p>
            ) : form.photo_flow === 'default_frame' ? (
              <label className="flex flex-col gap-2 text-xs font-bold text-slate-300">
                Default frame
                <select
                  required
                  value={form.default_frame_id}
                  onChange={(e) => update({ default_frame_id: e.target.value })}
                  className={FIELD_CLASS}
                >
                  <option value="">Select a frame…</option>
                  {frames.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <fieldset className="flex flex-col gap-2">
                <legend className="text-xs font-bold text-slate-300 mb-1">Available frames</legend>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-56 overflow-y-auto">
                  {frames.map((f) => {
                    const selected = form.available_frames.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFrame(f.id)}
                        aria-pressed={selected}
                        className={`relative p-2 rounded-2xl border text-left transition cursor-pointer ${
                          selected ? 'border-pink-500 bg-pink-500/10' : 'border-white/15 bg-slate-950 hover:border-white/40'
                        }`}
                      >
                        <div className="aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                          <img src={f.image_url} alt={f.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <p className="text-[11px] font-bold text-white mt-2 truncate">{f.name}</p>
                        {selected && <Check className="absolute top-3 right-3 w-4 h-4 text-pink-400" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {error && (
              <p role="alert" className="text-rose-400 text-xs font-semibold">
                {error}
              </p>
            )}

            <div className="flex gap-4 pt-2">
              <Button variant="secondary" size="lg" onClick={() => setForm(null)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="lg" loading={isSaving} className="flex-1">
                {editingId ? 'Save Changes' : 'Create Event'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
