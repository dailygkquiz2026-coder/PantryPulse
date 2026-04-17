import React, { useState, useEffect } from 'react';
import { HouseholdInfo } from '../types';
import { Users, Settings, Plus, X, CheckCircle2, Bell, BellOff, User as UserIcon, MapPin, Phone, Info, MessageSquare, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GroceryItem } from '../types';
import { db, auth } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface HouseholdSettingsProps {
  info: HouseholdInfo;
  onUpdate: (info: HouseholdInfo) => void;
  inventory: GroceryItem[];
}

export default function HouseholdSettings({ info, onUpdate, inventory }: HouseholdSettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'household' | 'feedback'>('profile');
  const [adults, setAdults] = React.useState(info.adults || 2);
  const [children, setChildren] = React.useState(info.children || 0);
  const [name, setName] = useState(info.name || '');
  const [address, setAddress] = useState(info.address || '');
  const [phone, setPhone] = useState(info.phone || '');
  const [newPreference, setNewPreference] = React.useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

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
    onUpdate({ ...info, adults, children, members: adults + children, name, address, phone });
    setShowSuccess(true);
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim() || !auth.currentUser) return;

    setIsSubmittingFeedback(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        name: name || auth.currentUser.displayName,
        message: feedback,
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0'
      });
      setFeedback('');
      setFeedbackSuccess(true);
      setTimeout(() => setFeedbackSuccess(false), 3000);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to send feedback. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
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
      className="cred-card cred-card-glow-purple p-5 sm:p-8 space-y-8 relative"
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl shadow-lg">
            <Settings className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter">Settings & Analytics</h2>
        </div>

        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-cred-gray rounded-2xl overflow-x-auto no-scrollbar max-w-full">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
              activeTab === 'profile' ? 'bg-white dark:bg-cred-dark shadow-sm text-purple-600' : 'text-gray-500'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('household')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
              activeTab === 'household' ? 'bg-white dark:bg-cred-dark shadow-sm text-purple-600' : 'text-gray-500'
            }`}
          >
            Household
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
              activeTab === 'feedback' ? 'bg-white dark:bg-cred-dark shadow-sm text-purple-600' : 'text-gray-500'
            }`}
          >
            Feedback
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <UserIcon className="w-3 h-3" /> Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="cred-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Phone className="w-3 h-3" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="cred-input"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter your delivery address"
                  className="cred-input min-h-[100px] py-4"
                />
              </div>
            </div>
            <button
              onClick={handleUpdate}
              className="cred-button-primary w-full"
            >
              Save Profile
            </button>
          </motion.div>
        )}

        {activeTab === 'household' && (
          <motion.div
            key="household"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-cred-gray rounded-2xl border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-bold">Push Notifications</p>
                  <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Low stock & expiry alerts</p>
                </div>
              </div>
              <button
                onClick={requestNotificationPermission}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  notificationPermission === 'granted' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-white dark:bg-cred-dark text-gray-500'
                }`}
              >
                {notificationPermission === 'granted' ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <div className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <UserIcon className="w-3 h-3 text-blue-500" />
                    Adults
                  </label>
                  <input
                    type="number"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    min="1"
                    className="cred-input w-full"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Users className="w-3 h-3 text-pink-500" />
                    Children
                  </label>
                  <input
                    type="number"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    min="0"
                    className="cred-input w-full"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleUpdate}
                  className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all active:scale-95 shadow-lg shadow-purple-200 dark:shadow-none"
                >
                  Update Household size
                </button>
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
        )}

        {activeTab === 'feedback' && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-3xl border border-purple-100 dark:border-purple-900/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-white dark:bg-cred-dark rounded-2xl shadow-sm">
                  <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight">Share your thoughts</h3>
                  <p className="text-xs text-gray-500 font-medium">Help us make PantryPulse better for you</p>
                </div>
              </div>

              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What's on your mind? Suggestions, bugs, or just a hello..."
                  className="cred-input min-h-[150px] py-4 resize-none"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmittingFeedback || !feedback.trim()}
                  className="cred-button-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingFeedback ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : feedbackSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Sent Successfully!
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Feedback
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-12 p-6 bg-gray-50 dark:bg-cred-gray rounded-2xl border border-gray-100 dark:border-white/5 flex gap-4 items-start">
        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-1" />
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-gray-900 dark:text-white">AI Disclaimer</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            PantryPulse uses advanced AI to predict restock dates and analyze consumption. While highly accurate, predictions are estimates and can sometimes contain errors. Always verify critical dates manually.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
