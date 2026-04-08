import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, orderBy, onSnapshot, limit, getDocs, writeBatch } from 'firebase/firestore';
import { motion } from 'motion/react';
import { AlertTriangle, Clock, Mail, FileType, Trash2 } from 'lucide-react';

interface ScanFailure {
  id: string;
  timestamp: string;
  error: string;
  mimeType: string;
  uid: string;
  userEmail: string;
}

const ADMIN_EMAIL = "dailygkquiz2026@gmail.com";

export default function AdminDashboard() {
  const [failures, setFailures] = useState<ScanFailure[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    const q = query(
      collection(db, 'scanFailures'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScanFailure[];
      setFailures(docs);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  const handleClearLogs = async () => {
    if (!window.confirm("Are you sure you want to clear all scan failure logs?")) return;
    
    try {
      const q = query(collection(db, 'scanFailures'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.delete(d.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Failed to clear logs:", error);
      alert("Failed to clear logs");
    }
  };

  if (loading && !failures.length) return null;
  if (!isAdmin) return null;

  return (
    <div className="mt-12 space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-2xl">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tighter">Developer Logs</h2>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Recent Scan Failures</p>
          </div>
        </div>
        
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
  );
}
