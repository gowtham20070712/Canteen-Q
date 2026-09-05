import type { Order } from '@/types';

export type QueueStatus = 'low' | 'medium' | 'high';

export interface QueueStats {
  pendingCount: number;
  preparingCount: number;
  totalActive: number;
  estimatedWaitMinutes: number;
  avgServiceTimeSeconds: number;
  status: QueueStatus;
}

export interface HourlyPrediction {
  hour: string;
  predictedOrders: number;
  isPeak: boolean;
}

export interface AIInsight {
  bestOrderTime: string;
  peakTime: string;
  currentTrend: 'rising' | 'stable' | 'falling';
  recommendation: string;
  alertMessage: string | null;
}

const SERVICE_TIME_PER_ORDER = 40; // seconds

export function calculateQueueStats(orders: Order[]): QueueStats {
  const pending = orders.filter((o) => o.status === 'pending');
  const preparing = orders.filter((o) => o.status === 'preparing');
  const activeCount = pending.length + preparing.length;

  const estimatedWaitMinutes = Math.ceil((activeCount * SERVICE_TIME_PER_ORDER) / 60);

  let status: QueueStatus = 'low';
  if (activeCount >= 15) status = 'high';
  else if (activeCount >= 7) status = 'medium';

  return {
    pendingCount: pending.length,
    preparingCount: preparing.length,
    totalActive: activeCount,
    estimatedWaitMinutes,
    avgServiceTimeSeconds: SERVICE_TIME_PER_ORDER,
    status,
  };
}

export function predictHourlyDemand(historicalOrders: Order[]): HourlyPrediction[] {
  const hourCounts = new Map<string, number>();
  const now = new Date();

  // Count historical orders by hour
  for (const order of historicalOrders) {
    const date = new Date(order.created_at);
    const hour = date.getHours();
    const key = `${hour}:00`;
    hourCounts.set(key, (hourCounts.get(key) ?? 0) + 1);
  }

  // Build predictions for canteen hours (8 AM to 8 PM)
  const predictions: HourlyPrediction[] = [];
  let maxPredicted = 0;

  for (let h = 8; h <= 20; h++) {
    const key = `${h}:00`;
    const label = h <= 12 ? `${h} AM` : `${h - 12} PM`;
    const historicalCount = hourCounts.get(key) ?? 0;

    // Weight current hour more heavily if it's now
    const isCurrentHour = now.getHours() === h;
    let predicted = Math.max(historicalCount, Math.floor(Math.random() * 8) + 3);
    if (isCurrentHour) predicted += 5;
    if (h === 13) predicted += 12; // Lunch peak
    if (h === 12) predicted += 8;
    if (h === 17) predicted += 6; // Evening snack peak

    maxPredicted = Math.max(maxPredicted, predicted);
    predictions.push({ hour: label, predictedOrders: predicted, isPeak: false });
  }

  // Mark peak hours (top 30% of predictions)
  const threshold = maxPredicted * 0.7;
  for (const p of predictions) {
    if (p.predictedOrders >= threshold) p.isPeak = true;
  }

  return predictions;
}

export function generateAIInsight(
  currentOrders: Order[],
  historicalOrders: Order[],
  predictions: HourlyPrediction[]
): AIInsight {
  const stats = calculateQueueStats(currentOrders);
  const now = new Date();
  const currentHour = now.getHours();

  // Find peak hour
  const peak = predictions.reduce((max, p) => (p.predictedOrders > max.predictedOrders ? p : max), predictions[0]);

  // Find best time to order (lowest predicted demand in next 3 hours)
  const upcoming = predictions.filter((p) => {
    const hourMatch = p.hour.match(/(\d+):00/);
    if (!hourMatch) return false;
    const h = parseInt(hourMatch[1]);
    return h > currentHour && h <= currentHour + 3;
  });

  const bestTime = upcoming.length > 0
    ? upcoming.reduce((min, p) => (p.predictedOrders < min.predictedOrders ? p : min), upcoming[0])
    : predictions[0];

  // Determine trend based on recent order frequency
  const recentOrders = historicalOrders.filter((o) => {
    const diff = now.getTime() - new Date(o.created_at).getTime();
    return diff < 60 * 60 * 1000; // last hour
  });
  const olderOrders = historicalOrders.filter((o) => {
    const diff = now.getTime() - new Date(o.created_at).getTime();
    return diff >= 60 * 60 * 1000 && diff < 2 * 60 * 60 * 1000; // 1-2 hours ago
  });

  let trend: 'rising' | 'stable' | 'falling' = 'stable';
  if (recentOrders.length > olderOrders.length * 1.3) trend = 'rising';
  else if (recentOrders.length < olderOrders.length * 0.7) trend = 'falling';

  let recommendation = '';
  if (stats.status === 'high') {
    recommendation = `Queue is very busy right now. Consider ordering around ${bestTime.hour} when the queue is expected to be shorter.`;
  } else if (stats.status === 'medium') {
    recommendation = `Moderate queue. You can order now, but ${bestTime.hour} may be even less crowded.`;
  } else {
    recommendation = `Great time to order! The queue is short and you'll be served quickly.`;
  }

  let alertMessage: string | null = null;
  if (stats.totalActive >= 15) {
    alertMessage = `Alert: Queue is very long (${stats.totalActive} active orders). Consider opening another counter.`;
  } else if (stats.totalActive >= 10) {
    alertMessage = `Warning: Queue is building up (${stats.totalActive} active orders). Monitor closely.`;
  }

  return {
    bestOrderTime: bestTime.hour,
    peakTime: peak.hour,
    currentTrend: trend,
    recommendation,
    alertMessage,
  };
}

export function getStatusColor(status: QueueStatus): string {
  switch (status) {
    case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
  }
}

export function getStatusLabel(status: QueueStatus): string {
  switch (status) {
    case 'low': return 'Low';
    case 'medium': return 'Medium';
    case 'high': return 'High';
  }
}

export function getStatusDot(status: QueueStatus): string {
  switch (status) {
    case 'low': return 'bg-emerald-500';
    case 'medium': return 'bg-amber-500';
    case 'high': return 'bg-red-500';
  }
}
