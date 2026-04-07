import React, { useState, useEffect } from 'react';
import { HouseholdInfo } from '../types';
import { Users, Settings, Plus, X, CheckCircle2, Bell, BellOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HouseholdSettingsProps {
  info: HouseholdInfo;
  onUpdate: (info: HouseholdInfo) => void;
}

export default function HouseholdSettings({ info, onUpdate }: HouseholdSettingsProps) {
  const [members, setMembers] = React.useState(info.members);
  const [newPreference, setNewPreference] = React.useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      new Notification("PantryPulse", {
        body: "Notifications enabled! We'll alert you when items are running low.",
        icon: "/favicon.ico"
      });
    }
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...info, members });
    setShowSuccess(true);
  };

  const addPreference = () => {
    if (!newPreference) return;
    onUpdate({ ...info, preferences: [...info.preferences, newPreference] });
    setNewPreference('');
    setShowSuccess(true);
  };

  const removePreference = (pref: string) => {
    onUpdate({ ...info, preferences: info.preferences.filter(p => p !== pref) });
    setShowSuccess(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="cred-card p-8 space-y-8 relative"
    >
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 right-8 flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl shadow-lg z-10"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-widest">Settings Updated</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl shadow-lg">
            <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter">Household Settings</h2>
        </div>

        <button
          onClick={requestNotificationPermission}
          className={`p-3 rounded-2xl transition-all flex items-center gap-2 ${
            notificationPermission === 'granted' 
              ? 'bg-green-50 dark:bg-green-950/20 text-green-600' 
              : 'bg-gray-50 dark:bg-cred-gray text-gray-400 hover:text-black dark:hover:text-white'
          }`}
          title={notificationPermission === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
        >
          {notificationPermission === 'granted' ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
            {notificationPermission === 'granted' ? 'Alerts On' : 'Enable Alerts'}
          </span>
        </button>
      </div>

      <div className="space-y-8">
        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
            <Users className="w-3 h-3" />
            Number of People
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={members}
              onChange={(e) => setMembers(Number(e.target.value))}
              min="1"
              className="cred-input w-32"
            />
            <button
              onClick={handleUpdate}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-purple-200 dark:shadow-none"
            >
              Update
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2">Dietary Preferences & Notes</label>
          <div className="flex gap-3">
            <input
              type="text"
              value={newPreference}
              onChange={(e) => setNewPreference(e.target.value)}
              placeholder="e.g. Vegetarian, Gluten-free"
              className="cred-input flex-1"
            />
            <button
              onClick={addPreference}
              className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-all rounded-2xl"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {info.preferences.map((pref, index) => (
              <span
                key={index}
                className="px-4 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl text-sm font-bold flex items-center gap-2 border border-purple-100 dark:border-purple-900/40"
              >
                {pref}
                <button onClick={() => removePreference(pref)} className="hover:text-purple-800 dark:hover:text-purple-200">
                  <X className="w-4 h-4" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
