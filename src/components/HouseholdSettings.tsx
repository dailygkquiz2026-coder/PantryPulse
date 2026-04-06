import React from 'react';
import { HouseholdInfo } from '../types';
import { Users, Settings, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';

interface HouseholdSettingsProps {
  info: HouseholdInfo;
  onUpdate: (info: HouseholdInfo) => void;
}

export default function HouseholdSettings({ info, onUpdate }: HouseholdSettingsProps) {
  const [members, setMembers] = React.useState(info.members);
  const [newPreference, setNewPreference] = React.useState('');

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...info, members });
  };

  const addPreference = () => {
    if (!newPreference) return;
    onUpdate({ ...info, preferences: [...info.preferences, newPreference] });
    setNewPreference('');
  };

  const removePreference = (pref: string) => {
    onUpdate({ ...info, preferences: info.preferences.filter(p => p !== pref) });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="cred-card p-8 space-y-8"
    >
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl shadow-lg">
          <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        <h2 className="text-3xl font-black tracking-tighter">Household Settings</h2>
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
