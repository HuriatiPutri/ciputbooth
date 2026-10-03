import React, { useState } from 'react';
import { Layers, Image as ImageIcon, Sliders, Camera, ShieldCheck, CalendarDays } from 'lucide-react';
import { useBooth } from '../../context/BoothContext';
import { useAuth } from '../../context/AuthContext';
import EventManager from './EventManager';
import FrameManager from './FrameManager';
import SessionGallery from './SessionGallery';
import SettingsView from './SettingsView';
import RevenueReport from './RevenueReport';
import UserManager from './UserManager';
import { TabGroup, Badge, Button } from '../common';
import { LineChart, Users } from 'lucide-react';

const VENDOR_TABS = [
  { id: 'events', label: 'Events', icon: CalendarDays },
  { id: 'frames', label: 'Frame Templates & Coordinates', icon: Layers },
  { id: 'gallery', label: 'Customer Captures Gallery', icon: ImageIcon },
  { id: 'reports', label: 'Revenue & Reports', icon: LineChart },
  { id: 'settings', label: 'Hardware & Studio Settings', icon: Sliders }
];

export default function AdminDashboard() {
  const { setStep } = useBooth();
  const { isAdmin, user } = useAuth();
  const [activeTab, setActiveTab] = useState('events');

  const tabs = [
    ...(isAdmin ? [{ id: 'users', label: 'Super Admin Dashboard & Users', icon: Users }] : []),
    ...VENDOR_TABS
  ];

  return (
    <div className="w-full h-full overflow-y-auto py-8 pb-20 px-8 sm:px-14 bg-slate-950 text-slate-50">
      <div className="flex flex-col gap-4 p-8">
        {/* Top Breadcrumb & Return to Kiosk */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-2xl bg-gradient-to-tr from-violet-600 to-pink-600 text-white shadow-xl shadow-pink-600/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="font-display font-black text-2xl sm:text-4xl text-white">Studio Admin Console</h1>
                <Badge variant="violet" size="sm">
                  {isAdmin ? 'Manager Mode' : user?.name}
                </Badge>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                Manage dynamic frames, visual coordinates, customer captures, and studio hardware
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="lg"
            leftIcon={Camera}
            onClick={() => setStep('welcome')}
            className="self-start sm:self-auto hover:scale-105"
          >
            Launch Mode
          </Button>
        </div>

        {/* Navigation Tabs */}
        <TabGroup
          className='flex gap-2'
          tabs={tabs}
          activeTab={activeTab}
          onChange={setActiveTab}
          size="md"
        />

        {/* Tab Content Panels */}
        <div className="pt-4">
          {activeTab === 'events' && <EventManager />}
          {isAdmin && activeTab === 'users' && <UserManager />}
          {activeTab === 'frames' && <FrameManager />}
          {activeTab === 'gallery' && <SessionGallery />}
          {activeTab === 'reports' && <RevenueReport />}
          {activeTab === 'settings' && <SettingsView />}
        </div>
      </div>
    </div>
  );
}
