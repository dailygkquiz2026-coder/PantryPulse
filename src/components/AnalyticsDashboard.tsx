import React from 'react';
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
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { GroceryItem } from '../types';
import { PieChart as PieIcon, BarChart3, TrendingUp, Zap, AlertCircle } from 'lucide-react';

interface AnalyticsDashboardProps {
  inventory: GroceryItem[];
}

const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

export default function AnalyticsDashboard({ inventory }: AnalyticsDashboardProps) {
  // 1. Category Distribution
  const categoryData = inventory.reduce((acc: any[], item) => {
    const existing = acc.find(a => a.name === item.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ name: item.category, value: 1 });
    }
    return acc;
  }, []);

  // 2. Consumption Insights (Mocked based on usage frequency)
  const consumptionData = inventory.map(item => ({
    name: item.name,
    dailyUsage: item.usageFrequency,
    category: item.category
  })).sort((a, b) => b.dailyUsage - a.dailyUsage).slice(0, 8);

  // 3. Health/Calorie Insights (Simplified logic based on categories)
  const healthInsights = [
    { name: 'Sugar/Sweets', value: inventory.filter(i => i.category === 'Sweets' || i.name.toLowerCase().includes('sugar')).length },
    { name: 'Grains/Bread', value: inventory.filter(i => i.category === 'Bakery' || i.category === 'Grains').length },
    { name: 'Dairy', value: inventory.filter(i => i.category === 'Dairy').length },
    { name: 'Produce', value: inventory.filter(i => i.category === 'Produce').length },
  ].filter(h => h.value > 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution Chart */}
        <div className="cred-card cred-card-glow-blue p-6">
          <div className="flex items-center gap-3 mb-6">
            <PieIcon className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-black uppercase tracking-widest">Stock Distribution</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categoryData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Consumption Velocity */}
        <div className="cred-card cred-card-glow-emerald p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-black uppercase tracking-widest">Consumption Velocity</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consumptionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fill: '#999' }} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="dailyUsage" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Health Insights & Calorie Warnings */}
      <div className="cred-card cred-card-glow-purple p-8">
        <div className="flex items-center gap-3 mb-8">
          <Zap className="w-5 h-5 text-amber-500" />
          <h3 className="text-xl font-black uppercase tracking-tighter">Dietary Insights</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {healthInsights.map((insight, idx) => (
            <div key={idx} className="p-4 bg-gray-50 dark:bg-cred-gray rounded-2xl border border-gray-100 dark:border-white/5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{insight.name}</p>
              <p className="text-2xl font-black">{insight.value} <span className="text-xs text-gray-500 font-medium">Items</span></p>
              {insight.name === 'Sugar/Sweets' && insight.value > 3 && (
                <div className="mt-2 flex items-center gap-1 text-amber-500">
                  <AlertCircle className="w-3 h-3" />
                  <span className="text-[8px] font-black uppercase">High Sugar Alert</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/40">
          <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2">AI Consumption Insight</h4>
          <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
            Based on your inventory, your household is consuming {inventory.filter(i => i.category === 'Produce').length > 0 ? 'a good amount of fresh produce' : 'fewer fresh vegetables than recommended'}. 
            {inventory.filter(i => i.name.toLowerCase().includes('bread')).length > 2 ? ' Consider reducing bread intake to manage carbohydrate levels.' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
