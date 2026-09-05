import { useEffect, useState, useMemo } from 'react';
import {
  Users, Clock, Zap, TrendingUp, TrendingDown, Minus,
  Brain, AlertTriangle, ArrowRight, Activity, Timer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Order } from '@/types';
import {
  calculateQueueStats, predictHourlyDemand, generateAIInsight,
  getStatusColor, getStatusLabel, getStatusDot,
  type AIInsight, type HourlyPrediction,
} from '@/lib/ai';
import { LoadingSpinner } from '@/components/shared';
import type { Page } from '@/components/Navbar';

export function HomePage({ onNavigate }: { onNavigate: (page: Page) => void }) {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [historicalOrders, setHistoricalOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [activeRes, histRes] = await Promise.all([
        supabase.from('orders').select('*').in('status', ['pending', 'preparing']).order('created_at', { ascending: false }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100),
      ]);

      if (activeRes.data) setActiveOrders(activeRes.data);
      if (histRes.data) setHistoricalOrders(histRes.data);
      setLoading(false);
    }
    loadData();

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => calculateQueueStats(activeOrders), [activeOrders]);
  const predictions = useMemo(() => predictHourlyDemand(historicalOrders), [historicalOrders]);
  const insight = useMemo(
    () => generateAIInsight(activeOrders, historicalOrders, predictions),
    [activeOrders, historicalOrders, predictions],
  );

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Hero */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm font-medium text-brand-600 mb-2">
          <Brain className="w-4 h-4" />
          <span>AI-Powered Queue Management</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Canteen Queue, <span className="text-brand-500">Simplified</span>
        </h1>
        <p className="mt-2 text-gray-500 max-w-2xl">
          Real-time queue monitoring, smart predictions, and seamless ordering. Skip the wait — let AI tell you the best time to grab your meal.
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-2xl border-2 p-4 sm:p-5 mb-6 flex items-center justify-between ${getStatusColor(stats.status)}`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusDot(stats.status)} animate-pulse`} />
          <div>
            <p className="text-sm font-semibold">
              Queue Status: {getStatusLabel(stats.status)}
            </p>
            <p className="text-xs opacity-80">
              {stats.totalActive} students in queue · Est. wait {stats.estimatedWaitMinutes} min
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-medium">
          <Activity className="w-4 h-4" />
          Live
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Current Queue"
          value={`${stats.totalActive}`}
          sub="students waiting"
          color="brand"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Est. Wait Time"
          value={`${stats.estimatedWaitMinutes}`}
          sub="minutes"
          color="blue"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Avg Service"
          value={`${stats.avgServiceTimeSeconds}s`}
          sub="per student"
          color="emerald"
        />
        <StatCard
          icon={<Timer className="w-5 h-5" />}
          label="Preparing"
          value={`${stats.preparingCount}`}
          sub="orders in kitchen"
          color="amber"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* AI Insights Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Brain className="w-4 h-4 text-brand-600" />
            </div>
            <h2 className="font-bold text-gray-900">AI Predictions & Insights</h2>
          </div>
          <div className="p-5 space-y-4">
            {/* Trend */}
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                insight.currentTrend === 'rising' ? 'bg-red-50 text-red-600' :
                insight.currentTrend === 'falling' ? 'bg-emerald-50 text-emerald-600' :
                'bg-gray-50 text-gray-500'
              }`}>
                {insight.currentTrend === 'rising' ? <TrendingUp className="w-5 h-5" /> :
                 insight.currentTrend === 'falling' ? <TrendingDown className="w-5 h-5" /> :
                 <Minus className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Queue Trend: {insight.currentTrend.charAt(0).toUpperCase() + insight.currentTrend.slice(1)}</p>
                <p className="text-xs text-gray-500">
                  {insight.currentTrend === 'rising' ? 'More students joining the queue' :
                   insight.currentTrend === 'falling' ? 'Queue is clearing up' :
                   'Queue is stable'}
                </p>
              </div>
            </div>

            {/* Prediction cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <p className="text-xs font-medium text-amber-600 mb-1">Peak Expected</p>
                <p className="text-2xl font-bold text-amber-900">{insight.peakTime}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <p className="text-xs font-medium text-emerald-600 mb-1">Best Time to Order</p>
                <p className="text-2xl font-bold text-emerald-900">{insight.bestOrderTime}</p>
              </div>
            </div>

            {/* Recommendation */}
            <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
              <p className="text-xs font-medium text-brand-600 mb-1">AI Recommendation</p>
              <p className="text-sm text-gray-700">{insight.recommendation}</p>
            </div>

            {/* Staff Alert */}
            {insight.alertMessage && (
              <div className="bg-red-50 rounded-xl p-4 border border-red-200 flex items-start gap-2 animate-slide-up">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-700">Staff Alert</p>
                  <p className="text-sm text-red-600">{insight.alertMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hourly Prediction Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 text-sm">Predicted Demand</h2>
            <p className="text-xs text-gray-400 mt-0.5">Orders by hour (today)</p>
          </div>
          <div className="p-5">
            <DemandChart predictions={predictions} />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 gap-4">
        <button
          onClick={() => onNavigate('student')}
          className="group bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-left text-white shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Order Food</h3>
              <p className="text-sm text-white/80 mt-1">Browse menu, place order, get queue number</p>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
        <button
          onClick={() => onNavigate('staff')}
          className="group bg-white rounded-2xl p-6 text-left border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg text-gray-900">Staff Dashboard</h3>
              <p className="text-sm text-gray-500 mt-1">Manage orders, view analytics (login required)</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'brand' | 'blue' | 'emerald' | 'amber';
}) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function DemandChart({ predictions }: { predictions: HourlyPrediction[] }) {
  const maxVal = Math.max(...predictions.map((p) => p.predictedOrders), 1);
  return (
    <div className="flex items-end justify-between gap-1 h-40">
      {predictions.map((p, i) => {
        const height = (p.predictedOrders / maxVal) * 100;
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 group">
            <div className="relative w-full flex items-end justify-center h-32">
              <div
                className={`w-full max-w-[20px] rounded-t-md transition-all hover:opacity-80 ${
                  p.isPeak ? 'bg-brand-500' : 'bg-brand-200'
                }`}
                style={{ height: `${height}%` }}
              >
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-700 whitespace-nowrap">
                  {p.predictedOrders}
                </div>
              </div>
            </div>
            <span className={`text-[9px] font-medium ${p.isPeak ? 'text-brand-600' : 'text-gray-400'}`}>
              {p.hour}
            </span>
          </div>
        );
      })}
    </div>
  );
}
