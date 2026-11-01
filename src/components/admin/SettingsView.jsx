import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2, Sliders, Printer, Cloud } from 'lucide-react';
import { Button } from '../common';
import { useBooth } from '../../context/BoothContext';
import { useAuth } from '../../context/AuthContext';
import PrinterSettings from './PrinterSettings';
import GoogleDriveSettings from './GoogleDriveSettings';

export default function SettingsView() {
  const { authFetch } = useAuth();
  const { settings: globalSettings, updateBoothSettings } = useBooth();
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'printer' | 'cloud'
  const [settings, setSettings] = useState(globalSettings || {
    studioName: 'Ciput Studio Booth',
    countdownSeconds: 3,
    autoPrint: false,
    copiesCount: 1,
    enableStickers: true,
    enableFilters: true,
    printLayout: '2x6'
  });
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    authFetch('/api/settings')
      .then((data) => {
        if (data) {
          setSettings(data);
          updateBoothSettings(data);
        }
      })
      .catch((e) => console.error(e));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await authFetch('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      if (data) {
        updateBoothSettings(settings);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl w-full space-y-8">
      <div>
        <h2 className="font-display font-black text-2xl sm:text-3xl text-white">Photobooth System Settings</h2>
        <p className="text-slate-400 text-xs sm:text-sm mt-1">
          Configure kiosk studio defaults, countdown delays, and thermal printer integration
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'general'
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>General Kiosk</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('printer')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'printer'
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Printer className="w-4 h-4" />
          <span>Printer Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition ${
            activeTab === 'cloud'
              ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Cloud Storage (Google Drive)</span>
        </button>
      </div>

      {activeTab === 'printer' ? (
        <PrinterSettings />
      ) : activeTab === 'cloud' ? (
        <GoogleDriveSettings />
      ) : (
        <form onSubmit={handleSave} className="max-w-2xl bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-white/10 space-y-6 shadow-2xl">
          <div>
            <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2.5">Studio / Brand Name</label>
            <input
              type="text"
              value={settings.studioName}
              onChange={(e) => setSettings({ ...settings, studioName: e.target.value })}
              className="w-full bg-slate-950 border border-white/15 px-4 py-3 sm:py-3.5 rounded-2xl text-sm text-white focus:border-pink-500 outline-none shadow-inner"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2.5">Countdown Delay (Seconds)</label>
              <select
                value={settings.countdownSeconds}
                onChange={(e) => setSettings({ ...settings, countdownSeconds: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-950 border border-white/15 px-4 py-3 sm:py-3.5 rounded-2xl text-sm text-white focus:border-pink-500 outline-none shadow-inner cursor-pointer"
              >
                <option value={3}>3 Seconds (Fast)</option>
                <option value={5}>5 Seconds (Recommended)</option>
                <option value={10}>10 Seconds (Group Poses)</option>
              </select>
            </div>

            <div>
              <label className="text-xs sm:text-sm font-bold text-slate-300 block mb-2.5">Default Print Size</label>
              <select
                value={settings.printLayout}
                onChange={(e) => setSettings({ ...settings, printLayout: e.target.value })}
                className="w-full bg-slate-950 border border-white/15 px-4 py-3 sm:py-3.5 rounded-2xl text-sm text-white focus:border-pink-500 outline-none shadow-inner cursor-pointer"
              >
                <option value="2x6">2x6 Photo Strip</option>
                <option value="4x6">4x6 Postcard / Card</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="flex items-center gap-4 cursor-pointer p-5 sm:p-6 rounded-2xl bg-slate-950/70 border border-white/15 hover:bg-slate-800 transition shadow-inner">
              <input
                type="checkbox"
                checked={settings.enableStickers}
                onChange={(e) => setSettings({ ...settings, enableStickers: e.target.checked })}
                className="w-5 h-5 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
              />
              <div>
                <p className="text-sm sm:text-base font-bold text-white">Enable Fun Sticker Overlay</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Allows users to drag emojis and props onto their final strip</p>
              </div>
            </label>

            <label className="flex items-center gap-4 cursor-pointer p-5 sm:p-6 rounded-2xl bg-slate-950/70 border border-white/15 hover:bg-slate-800 transition shadow-inner">
              <input
                type="checkbox"
                checked={settings.enableFilters}
                onChange={(e) => setSettings({ ...settings, enableFilters: e.target.checked })}
                className="w-5 h-5 rounded text-pink-600 focus:ring-pink-500 cursor-pointer"
              />
              <div>
                <p className="text-sm sm:text-base font-bold text-white">Enable Color Filters</p>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Allows users to choose Vintage, B&W, Cyber, and Glow filters</p>
              </div>
            </label>
          </div>

          <div className="pt-6 flex items-center justify-between border-t border-white/10">
            {isSaved && (
              <span className="text-xs sm:text-sm font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Settings saved successfully!</span>
              </span>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              <div className="flex items-center justify-center gap-2">
                <Save className="w-5 h-5" />
                <span>{isLoading ? 'Saving...' : 'Save Settings'}</span>
              </div>
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
