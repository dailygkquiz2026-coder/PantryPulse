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
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-8"
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-purple-50 rounded-lg">
          <Settings className="w-5 h-5 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Household Settings</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Number of People
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              value={members}
              onChange={(e) => setMembers(Number(e.target.value))}
              min="1"
              className="w-24 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
            <button
              onClick={handleUpdate}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl transition-colors"
            >
              Update
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Dietary Preferences & Notes</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPreference}
              onChange={(e) => setNewPreference(e.target.value)}
              placeholder="e.g. Vegetarian, Gluten-free"
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
            <button
              onClick={addPreference}
              className="p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-xl transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {info.preferences.map((pref, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm font-medium flex items-center gap-2"
              >
                {pref}
                <button onClick={() => removePreference(pref)}>
                  <X className="w-4 h-4 hover:text-purple-800" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
