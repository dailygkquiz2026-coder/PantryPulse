import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit, getDocs, writeBatch, where, Timestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Clock,
  Mail,
  FileType,
  Trash2,
  Users,
  Activity,
  DollarSign,
  Globe,
  TrendingUp,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ScanFailure {
  id: string;
  timestamp: string;
  error: string;
  mimeType: string;
  uid: string;
  userEmail: string;
}

interface AnalyticsData {
  dau: number;
  newUsersToday: number;
  totalUsers: number;
  totalAICost: number;
  avgCostPerUser: number;
  geoDistribution: { name: string; value: number }[];
  dailyUsage: { date: string; count: number; cost: number }[];
  fetchedAt: number;
}

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL as string;
const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
// Analytics are cached for 5 minutes — no need for sub-minute refreshes.
const ANALYTICS_TTL_MS = 5 * 60 * 1000;
// AI log scan limited to last 30 days to prevent full-collection reads.
const AI_LOG_WINDOW_DAYS = 30;

export default function AdminDashboard() {
  const [failures, setFailures] = useState<ScanFailure[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'logs'>('analytics');

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user && user.email === ADMIN_EMAIL && user.emailVerified) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchAnalytics = useCallback(async (force = false) => {
    if (isFetching) return;
    // Serve cached result if fresh enough and not a forced refresh.
    if (!force && analytics && Date.now() - analytics.fetchedAt < ANALYTICS_TTL_MS) return;

    setIsFetching(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Total users — bounded at 5000; replace with a counter doc for larger scale.
      const usersSnap = await getDocs(query(collection(db, 'userProfiles'), limit(5000)));
      const totalUsers = usersSnap.size;
      const newUsersToday = usersSnap.docs.filter(d => {
        const data = d.data();
        return data.createdAt && data.createdAt.startsWith(today);
      }).length;

      // 2. DAU — already filtered by date so cost is O(DAU), not O(total users).
      const activitySnap = await getDocs(
        query(collection(db, 'userActivityLogs'), where('date', '==', today), limit(2000))
      );
      const dau = activitySnap.size;

      // 3. AI costs — last 30 days only, not a full collection scan.
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - AI_LOG_WINDOW_DAYS);
      const windowISO = windowStart.toISOString();
      const aiLogsSnap = await getDocs(
        query(
          collection(db, 'aiUsageLogs'),
          where('timestamp', '>=', windowISO),
          orderBy('timestamp', 'desc'),
          limit(50000)
        )
      );
      let totalCost = 0;
      const usageByDay: Record<string, { count: number; cost: number }> = {};
      aiLogsSnap.docs.forEach(d => {
        const data = d.data();
        const cost = data.estimatedCost || 0;
        totalCost += cost;
        const date = data.timestamp?.split('T')[0] || 'Unknown';
        if (!usageByDay[date]) usageByDay[date] = { count: 0, cost: 0 };
        usageByDay[date].count++;
        usageByDay[date].cost += cost;
      });

      // 4. Geo distribution from today's activity (already fetched above).
      const geoMap: Record<string, number> = {};
      activitySnap.docs.forEach(d => {
        const loc = d.data().location || 'Unknown';
        geoMap[loc] = (geoMap[loc] || 0) + 1;
      });

      setAnalytics({
        dau,
        newUsersToday,
        totalUsers,
        totalAICost: totalCost,
        avgCostPerUser: totalUsers > 0 ? totalCost / totalUsers : 0,
        geoDistribution: Object.entries(geoMap).map(([name, value]) => ({ name, value })),
        dailyUsage: Object.entries(usageByDay)
          .map(([date, data]) => ({ date, count: data.count, cost: Number(data.cost.toFixed(4)) }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-7),
        fetchedAt: Date.now(),
      });
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setIsFetching(false);
    }
  }, [analytics, isFetching]);

  useEffect(() => {
    if (!isAdmin) return;

    fetchAnalytics();
    // Refresh every 5 minutes instead of every 60 seconds — reduces reads by 5×.
    const interval = setInterval(() => fetchAnalytics(), ANALYTICS_TTL_MS);

    const q = query(collection(db, 'scanFailures'), orderBy('timestamp', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFailures(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ScanFailure[]);
    });

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isAdmin]);

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all scan failure logs?")) return;
    try {
      const snapshot = await getDocs(query(collection(db, 'scanFailures')));
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (error) {
      console.error("Failed to clear logs:", error);
      alert("Failed to clear logs");
    }
  };

  if (loading && !failures.length && !analytics) return null;
  if (!isAdmin) return null;

  return (
    <div className="mt-12 space-y-8 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-600 rounded-2xl shadow-lg shadow-red-200 dark:shadow-none">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase">Developer Mode</h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">System Health & Analytics</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'analytics' && (
            <button
              onClick={() => fetchAnalytics(true)}
              disabled={isFetching}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-cred-gray text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-200 dark:hover:bg-white/10 transition-all font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing...' : analytics ? `Updated ${Math.round((Date.now() - analytics.fetchedAt) / 60000)}m ago` : 'Refresh'}
            </button>
          )}
          <div className="flex bg-gray-100 dark:bg-cred-gray p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'analytics' ? 'bg-white dark:bg-cred-dark text-red-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === 'logs' ? 'bg-white dark:bg-cred-dark text-red-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Error Logs
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="cred-card p-6 space-y-2">
              <div className="flex items-center justify-between">
                <Users className="w-5 h-5 text-blue-500" />
                <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">Live</span>
              </div>
              <p className="text-3xl font-black tracking-tighter">{analytics.dau}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Daily Active Users</p>
            </div>
            <div className="cred-card p-6 space-y-2">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">+{analytics.newUsersToday}</span>
              </div>
              <p className="text-3xl font-black tracking-tighter">{analytics.totalUsers}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cumulative Users</p>
            </div>
            <div className="cred-card p-6 space-y-2">
              <div className="flex items-center justify-between">
                <DollarSign className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-black tracking-tighter">${analytics.totalAICost.toFixed(2)}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AI Cost (30d)</p>
            </div>
            <div className="cred-card p-6 space-y-2">
              <div className="flex items-center justify-between">
                <Activity className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-black tracking-tighter">${analytics.avgCostPerUser.toFixed(4)}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Cost / User</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="cred-card p-8">
              <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-red-600" />
                AI Usage & Cost (Last 7 Days)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="API Calls" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="cred-card p-8">
              <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-600" />
                Geographic Distribution
              </h3>
              <div className="h-64 flex items-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={analytics.geoDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {analytics.geoDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-1/2 space-y-2">
                  {analytics.geoDistribution.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[10px] font-bold text-gray-500 truncate max-w-[100px]">{entry.name}</span>
                      </div>
                      <span className="text-[10px] font-black">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Recent Scan Failures
            </h3>
            {failures.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 transition-all font-black uppercase tracking-widest text-[10px]"
              >
                <Trash2 className="w-4 h-4" />
                Clear Logs
              </button>
            )}
          </div>

          <div className="grid gap-4">
            {failures.length === 0 ? (
              <div className="cred-card p-12 text-center text-gray-500">
                <p className="font-bold uppercase tracking-widest text-xs">No scan failures logged yet</p>
              </div>
            ) : (
              failures.map((failure) => (
                <motion.div
                  key={failure.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="cred-card p-6 border-l-4 border-l-red-500"
                >
                  <div className="flex flex-wrap justify-between items-start gap-4">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(failure.timestamp).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {failure.userEmail}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileType className="w-3 h-3" />
                          {failure.mimeType}
                        </span>
                      </div>
                      <p className="text-red-500 font-bold text-sm bg-red-500/5 p-3 rounded-xl border border-red-500/10">
                        {failure.error}
                      </p>
                      <p className="text-[10px] text-gray-500 font-mono">UID: {failure.uid}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
