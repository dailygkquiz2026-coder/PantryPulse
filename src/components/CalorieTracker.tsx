import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  Plus, 
  History, 
  TrendingUp, 
  User, 
  ChevronRight, 
  Check, 
  AlertCircle,
  Trash2,
  Edit2,
  Save,
  X,
  Zap,
  Loader2,
  Activity,
  Target,
  Calendar,
  Users
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { analyzeMealImage, analyzeMealDescription, calculateRequiredCalories, AnalyzedFoodItem } from '../services/calorieService';
import { UserProfile } from '../types';
import ProBadge from './ProBadge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, startOfDay, endOfDay, subDays, isWithinInterval } from 'date-fns';
import AnalyticsDashboard from './AnalyticsDashboard'; // We'll move this here

interface CalorieLog {
  id: string;
  uid: string;
  date: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  items: AnalyzedFoodItem[];
  totalCalories: number;
  photoUrl?: string;
}

function CalorieLogItem({ log }: { log: CalorieLog }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className="cred-card overflow-hidden group transition-all border-white/5 hover:border-white/10">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-all"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            log.mealType === 'breakfast' ? 'bg-amber-100/10 text-amber-500' :
            log.mealType === 'lunch' ? 'bg-blue-100/10 text-blue-500' :
            log.mealType === 'dinner' ? 'bg-purple-100/10 text-purple-500' :
            'bg-emerald-100/10 text-emerald-500'
          }`}>
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-black text-lg capitalize text-white">{log.mealType}</h4>
            <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
              {format(new Date(log.date), 'MMM d, h:mm a')} • {log.items.length} items
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-2xl font-black tracking-tighter text-cred-primary">{log.totalCalories}</p>
            <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">kcal</p>
          </div>
          <button 
            onClick={async (e) => {
              e.stopPropagation();
              if (confirm('Delete this log from history? (Data will still be used for stats)')) {
                try {
                  await deleteDoc(doc(db, 'calorieLogs', log.id));
                } catch (error) {
                  console.error("Delete failed:", error);
                  handleFirestoreError(error, OperationType.DELETE, 'calorieLogs');
                }
              }
            }}
            className="p-2 text-gray-500 hover:text-cred-primary opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white/[0.01] border-t border-white/5"
          >
            <div className="p-6 space-y-3">
              {log.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold text-white">{item.name}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">{item.portion}</p>
                  </div>
                  <p className="font-black text-cred-primary">{item.calories} kcal</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CalorieTracker({ inventory, userProfile: profileProp }: { inventory: any[]; userProfile?: UserProfile | null }) {
  const [activeSubTab, setActiveSubTab] = useState<'track' | 'history' | 'analytics' | 'profile'>('track');
  const [profile, setProfile] = useState<UserProfile | null>(profileProp ?? null);
  const [logs, setLogs] = useState<CalorieLog[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzedFoodItem[] | null>(null);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  const [isSaving, setIsSaving] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [userDescription, setUserDescription] = useState('');
  const [isManualEntry, setIsManualEntry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const user = auth.currentUser;

  // Sync profile from parent prop — App.tsx already holds the live listener.
  useEffect(() => {
    if (profileProp !== undefined) setProfile(profileProp);
  }, [profileProp]);

  // Real-time Logs
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'calorieLogs'), 
      where('uid', '==', user.uid),
      orderBy('date', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as CalorieLog));
      setLogs(items);
    }, (error) => {
      console.error("Calorie logs snapshot failed:", error);
      handleFirestoreError(error, OperationType.LIST, 'calorieLogs');
    });
    return () => unsubscribe();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await analyzeMealImage(base64, userDescription, user?.uid);
        setAnalysisResult(result);
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Analysis failed:", error);
      setIsAnalyzing(false);
    }
  };

  const handleManualAnalysis = async () => {
    if (!userDescription.trim()) {
      alert("Please describe your meal first.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeMealDescription(userDescription, user?.uid);
      setAnalysisResult(result);
    } catch (error) {
      console.error("Manual analysis failed:", error);
      alert("Failed to analyze description. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access denied:", err);
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      console.log("Capturing photo...", video.videoWidth, "x", video.videoHeight);
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.warn("Video not ready, waiting...");
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0);
      }
      
      const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
      console.log("Photo captured, base64 length:", base64.length);
      
      setIsAnalyzing(true);
      stopCamera();
      try {
        const result = await analyzeMealImage(base64, userDescription, user?.uid);
        setAnalysisResult(result);
      } catch (error) {
        console.error("Analysis failed:", error);
        alert("Failed to analyze image. Please try again or upload a file.");
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleSaveLog = async () => {
    if (!user || !analysisResult) return;
    setIsSaving(true);
    try {
      const total = analysisResult.reduce((sum, item) => sum + item.calories, 0);
      await addDoc(collection(db, 'calorieLogs'), {
        uid: user.uid,
        date: new Date().toISOString(),
        mealType,
        items: analysisResult,
        totalCalories: total
      });
      setAnalysisResult(null);
      setUserDescription('');
      setActiveSubTab('history');
    } catch (error) {
      console.error("Save failed:", error);
      handleFirestoreError(error, OperationType.CREATE, 'calorieLogs');
    } finally {
      setIsSaving(false);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const newProfile = { ...(profile || {}), ...data, uid: user.uid } as UserProfile;
    
    // Recalculate BMR/TDEE if physical data changes
    if (newProfile.weight && newProfile.height && newProfile.age && newProfile.gender) {
      const { bmr, tdee } = calculateRequiredCalories(
        newProfile.weight,
        newProfile.height,
        newProfile.age,
        newProfile.gender
      );
      newProfile.bmr = bmr;
      newProfile.tdee = tdee;
    }

    await setDoc(doc(db, 'userProfiles', user.uid), newProfile);
  };

  // Analytics Calculations
  const todayLogs = logs.filter(l => {
    const logDate = new Date(l.date);
    const today = new Date();
    return logDate.getDate() === today.getDate() &&
           logDate.getMonth() === today.getMonth() &&
           logDate.getFullYear() === today.getFullYear();
  });

  const todayCalories = todayLogs.reduce((sum, l) => sum + l.totalCalories, 0);

  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const date = subDays(new Date(), i);
    const dayLogs = logs.filter(l => {
      const logDate = new Date(l.date);
      return logDate.getDate() === date.getDate() &&
             logDate.getMonth() === date.getMonth() &&
             logDate.getFullYear() === date.getFullYear();
    });
    return {
      name: format(date, 'EEE'),
      calories: dayLogs.reduce((sum, l) => sum + l.totalCalories, 0),
      target: profile?.tdee || 2000
    };
  }).reverse();

  const weeklyAverage = last7DaysData.reduce((sum, d) => sum + d.calories, 0) / 7;
  
  const monthlyLogs = logs.filter(l => {
    const logDate = new Date(l.date);
    const thirtyDaysAgo = subDays(new Date(), 30);
    return logDate >= thirtyDaysAgo;
  });
  const monthlyAverage = monthlyLogs.reduce((sum, l) => sum + l.totalCalories, 0) / 30;

  // Mock community data (since we can't easily aggregate across all users without a backend or heavy client-side fetch)
  const communityAverage = 2150; 

  return (
    <div className="space-y-8">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-2xl overflow-x-auto no-scrollbar max-w-full border border-white/5">
        <button
          onClick={() => setActiveSubTab('track')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 ${
            activeSubTab === 'track' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
          }`}
        >
          <Camera className="w-3 h-3" />
          Track
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 ${
            activeSubTab === 'history' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
          }`}
        >
          <History className="w-3 h-3" />
          History
        </button>
        <button
          onClick={() => setActiveSubTab('analytics')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 ${
            activeSubTab === 'analytics' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          Stats
          <ProBadge className="ml-1 scale-75 origin-left" />
        </button>
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 ${
            activeSubTab === 'profile' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'
          }`}
        >
          <User className="w-3 h-3" />
          Profile
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeSubTab === 'track' && (
          <motion.div
            key="track"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {!analysisResult ? (
              <div className="space-y-6">
                <div className="cred-card p-8 sm:p-12 text-center space-y-8">
                  <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-white/5">
                    <Camera className="w-10 h-10 text-cred-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black tracking-tight text-white">Meal Scanner</h3>
                    <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium">
                      AI-powered calorie estimation from photos.
                    </p>
                  </div>

                  <div className="max-w-sm mx-auto space-y-6">
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2">Description (Optional)</label>
                      <textarea 
                        value={userDescription}
                        onChange={(e) => setUserDescription(e.target.value)}
                        placeholder="What are you eating? e.g. 2 chapatis, 1 bowl of dal, and a salad"
                        className="cred-input min-h-[100px] py-4"
                      />
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button 
                          onClick={startCamera}
                          disabled={isAnalyzing}
                          className="cred-button-primary flex-1 py-5"
                        >
                          <Camera className="w-4 h-4" />
                          Capture
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isAnalyzing}
                          className="flex-1 px-6 py-5 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-white/5"
                        >
                          {isAnalyzing ? <Zap className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {isAnalyzing ? '...' : 'Upload'}
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                      </div>
                      <button 
                        onClick={handleManualAnalysis}
                        disabled={isAnalyzing || !userDescription.trim()}
                        className="w-full px-6 py-5 bg-cred-accent/10 text-cred-accent rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-cred-accent/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-cred-accent/20"
                      >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit2 className="w-4 h-4" />}
                        Analyze Description
                      </button>
                    </div>
                  </div>
                </div>

                {isCameraOpen && (
                  <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-4">
                    <div className="relative w-full max-w-lg aspect-[3/4] bg-cred-dark rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center gap-8">
                        <button 
                          onClick={stopCamera}
                          className="p-4 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
                        >
                          <X className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={capturePhoto}
                          className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all"
                        >
                          <div className="w-16 h-16 border-4 border-black/5 rounded-full" />
                        </button>
                        <div className="w-14" /> {/* Spacer */}
                      </div>
                    </div>
                    <canvas ref={canvasRef} className="hidden" />
                    <p className="mt-6 text-white/50 text-[10px] font-black uppercase tracking-[0.2em]">Align your meal in the frame</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="cred-card p-8 space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black tracking-tight text-white">Meal Analysis</h3>
                  <button onClick={() => setAnalysisResult(null)} className="p-2 hover:bg-white/5 rounded-xl transition-all">
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setMealType(type)}
                      className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                        mealType === type 
                          ? 'bg-white border-white text-black shadow-lg' 
                          : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  {analysisResult.map((item, idx) => (
                    <div key={idx} className="p-5 bg-white/5 rounded-[2rem] border border-white/5 flex items-center justify-between group">
                      <div className="flex-1 min-w-0">
                        <input 
                          type="text"
                          value={item.name}
                          onChange={(e) => {
                            const newResult = [...analysisResult];
                            newResult[idx].name = e.target.value;
                            setAnalysisResult(newResult);
                          }}
                          className="bg-transparent font-black text-lg w-full focus:outline-none text-white placeholder-gray-600"
                        />
                        <input 
                          type="text"
                          value={item.portion}
                          onChange={(e) => {
                            const newResult = [...analysisResult];
                            newResult[idx].portion = e.target.value;
                            setAnalysisResult(newResult);
                          }}
                          className="bg-transparent text-xs text-gray-500 font-bold w-full focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <input 
                            type="number"
                            value={item.calories}
                            onChange={(e) => {
                              const newResult = [...analysisResult];
                              newResult[idx].calories = Number(e.target.value);
                              setAnalysisResult(newResult);
                            }}
                            className="bg-transparent font-black text-2xl text-cred-primary w-20 text-right focus:outline-none"
                          />
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">kcal</p>
                        </div>
                        <button 
                          onClick={() => {
                            const newResult = analysisResult.filter((_, i) => i !== idx);
                            setAnalysisResult(newResult);
                          }}
                          className="p-3 text-gray-500 hover:text-cred-primary opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => setAnalysisResult([...(analysisResult || []), { name: 'New Item', calories: 100, portion: '1 serving' }])}
                    className="w-full py-5 border-2 border-dashed border-white/5 rounded-[2rem] text-gray-500 hover:text-white hover:border-white/10 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="pt-8 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Total Intake</p>
                    <p className="text-5xl font-black tracking-tighter text-cred-primary">
                      {analysisResult.reduce((sum, item) => sum + item.calories, 0)}
                    </p>
                  </div>
                  <button 
                    onClick={handleSaveLog}
                    disabled={isSaving}
                    className="cred-button-primary px-12 py-5"
                  >
                    {isSaving ? 'Saving...' : 'Log Meal'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeSubTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {logs.filter(l => {
              const logDate = new Date(l.date);
              const oneWeekAgo = subDays(new Date(), 7);
              return logDate >= oneWeekAgo;
            }).length === 0 ? (
              <div className="cred-card p-12 text-center space-y-4">
                <History className="w-12 h-12 text-gray-200 mx-auto" />
                <p className="text-gray-500 font-medium">No meal logs found for the last 7 days.</p>
              </div>
            ) : (
              logs
                .filter(l => {
                  const logDate = new Date(l.date);
                  const oneWeekAgo = subDays(new Date(), 7);
                  return logDate >= oneWeekAgo;
                })
                .map(log => (
                  <CalorieLogItem key={log.id} log={log} />
                ))
            )}
          </motion.div>
        )}

        {activeSubTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Calorie Progress Card */}
            <div className="cred-card cred-card-glow-red p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Daily Progress</h3>
                  <p className="text-xs text-gray-500 font-medium">Today's calorie intake vs goal</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black tracking-tighter text-red-600">{todayCalories}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">/ {profile?.tdee || 2000} kcal</p>
                </div>
              </div>
              
              <div className="h-4 bg-gray-100 dark:bg-cred-gray rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((todayCalories / (profile?.tdee || 2000)) * 100, 100)}%` }}
                  className={`h-full transition-all ${todayCalories > (profile?.tdee || 2000) ? 'bg-amber-500' : 'bg-red-600'}`}
                />
              </div>
              
              {todayCalories > (profile?.tdee || 2000) && (
                <div className="mt-4 flex items-center gap-2 text-amber-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Calorie limit exceeded</span>
                </div>
              )}
            </div>

            {/* Weekly Trend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="cred-card cred-card-glow-blue p-8">
                <div className="flex items-center gap-3 mb-8">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <h3 className="text-xl font-black uppercase tracking-tighter">Weekly Trend</h3>
                </div>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={last7DaysData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#999' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#999' }} />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', color: '#fff' }}
                      />
                      <Bar dataKey="calories" radius={[4, 4, 0, 0]}>
                        {last7DaysData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.calories > entry.target ? '#f59e0b' : '#3b82f6'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="cred-card p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Weekly Average</p>
                    <p className="text-3xl font-black tracking-tighter">{Math.round(weeklyAverage)} <span className="text-xs font-medium">kcal</span></p>
                  </div>
                  <div className={`p-2 rounded-lg ${weeklyAverage > (profile?.tdee || 2000) ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>
                <div className="cred-card p-6 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Monthly Average</p>
                    <p className="text-3xl font-black tracking-tighter">{Math.round(monthlyAverage)} <span className="text-xs font-medium">kcal</span></p>
                  </div>
                  <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                    <Calendar className="w-5 h-5" />
                  </div>
                </div>
                {profile?.shareAnonymousData && (
                  <div className="cred-card p-6 bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-purple-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-400">Community Comparison</p>
                      <Users className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-2xl font-black tracking-tighter">{Math.round(weeklyAverage)}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">Your Average</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black tracking-tighter text-gray-400">{communityAverage}</p>
                          <p className="text-[8px] font-black uppercase tracking-widest text-gray-500">Community Avg</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-cred-gray rounded-full overflow-hidden flex">
                        <div 
                          className="h-full bg-purple-500" 
                          style={{ width: `${(weeklyAverage / (weeklyAverage + communityAverage)) * 100}%` }} 
                        />
                        <div 
                          className="h-full bg-gray-400" 
                          style={{ width: `${(communityAverage / (weeklyAverage + communityAverage)) * 100}%` }} 
                        />
                      </div>
                      <p className="text-[9px] text-gray-500 font-medium italic text-center">
                        You are consuming {Math.abs(Math.round(weeklyAverage - communityAverage))} kcal {weeklyAverage > communityAverage ? 'more' : 'less'} than the community average.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Original Inventory Analytics */}
            <AnalyticsDashboard inventory={inventory} />
          </motion.div>
        )}

        {activeSubTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="cred-card cred-card-glow-purple p-8 space-y-8">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-purple-600" />
                <h3 className="text-2xl font-black tracking-tight">Health Profile</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Weight (kg)</label>
                  <input 
                    type="number"
                    value={profile?.weight || ''}
                    onChange={(e) => updateProfile({ weight: Number(e.target.value) })}
                    placeholder="70"
                    className="cred-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Height (cm)</label>
                  <input 
                    type="number"
                    value={profile?.height || ''}
                    onChange={(e) => updateProfile({ height: Number(e.target.value) })}
                    placeholder="175"
                    className="cred-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Age</label>
                  <input 
                    type="number"
                    value={profile?.age || ''}
                    onChange={(e) => updateProfile({ age: Number(e.target.value) })}
                    placeholder="25"
                    className="cred-input"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Gender</label>
                  <select 
                    value={profile?.gender || 'male'}
                    onChange={(e) => updateProfile({ gender: e.target.value as any })}
                    className="cred-input"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Ethnicity</label>
                  <input 
                    type="text"
                    value={profile?.ethnicity || ''}
                    onChange={(e) => updateProfile({ ethnicity: e.target.value })}
                    placeholder="e.g. South Asian"
                    className="cred-input"
                  />
                </div>
              </div>

              {profile?.bmr && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-gray-100 dark:border-white/5">
                  <div className="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400 mb-1">Estimated BMR</p>
                    <p className="text-3xl font-black tracking-tighter">{profile.bmr} <span className="text-xs font-medium">kcal/day</span></p>
                  </div>
                  <div className="p-6 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-1">Daily Target (TDEE)</p>
                    <p className="text-3xl font-black tracking-tighter">{profile.tdee} <span className="text-xs font-medium">kcal/day</span></p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-cred-gray rounded-2xl">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm font-bold">Community Comparison</p>
                    <p className="text-[10px] text-gray-500">Share anonymous data to compare with others</p>
                  </div>
                </div>
                <button 
                  onClick={() => updateProfile({ shareAnonymousData: !profile?.shareAnonymousData })}
                  className={`w-12 h-6 rounded-full transition-all relative ${profile?.shareAnonymousData ? 'bg-emerald-500' : 'bg-gray-300'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${profile?.shareAnonymousData ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
