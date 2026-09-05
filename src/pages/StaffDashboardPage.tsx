import { useEffect, useState, useMemo } from 'react';
import {
  Users, Clock, CheckCircle2, Package, LogOut, Brain,
  AlertTriangle, TrendingUp, TrendingDown, Minus, ChefHat,
  Bell, ShoppingBag, Receipt,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Order, OrderItem, OrderStatus } from '@/types';
import {
  calculateQueueStats, predictHourlyDemand, generateAIInsight,
  getStatusColor, getStatusLabel, getStatusDot,
} from '@/lib/ai';
import { LoadingSpinner, formatPrice, formatTime } from '@/components/shared';

type Tab = 'pending' | 'preparing' | 'ready' | 'completed';

export function StaffDashboardPage() {
  const { signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItemsMap, setOrderItemsMap] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('pending');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrders() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (data) {
        setOrders(data as Order[]);

        // Load order items for all orders
        const orderIds = (data as Order[]).map((o) => o.id);
        if (orderIds.length > 0) {
          const { data: items } = await supabase
            .from('order_items')
            .select('*, menu_item:menu_items(*)')
            .in('order_id', orderIds);
          if (items) {
            const map: Record<string, OrderItem[]> = {};
            for (const item of items as OrderItem[]) {
              if (!map[item.order_id]) map[item.order_id] = [];
              map[item.order_id].push(item);
            }
            setOrderItemsMap(map);
          }
        }
      }
      setLoading(false);
    }
    loadOrders();

    const channel = supabase
      .channel('staff-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadOrders())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => loadOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const activeOrders = useMemo(
    () => orders.filter((o) => ['pending', 'preparing'].includes(o.status)),
    [orders],
  );
  const stats = useMemo(() => calculateQueueStats(activeOrders), [activeOrders]);
  const predictions = useMemo(() => predictHourlyDemand(orders), [orders]);
  const insight = useMemo(
    () => generateAIInsight(activeOrders, orders, predictions),
    [activeOrders, orders, predictions],
  );

  const completedToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return orders.filter((o) =>
      o.status === 'completed' && o.completed_at && new Date(o.completed_at) >= today
    );
  }, [orders]);

  const revenueToday = completedToday.reduce((sum, o) => sum + o.total_amount, 0);

  const tabOrders = useMemo(() => {
    return orders.filter((o) => o.status === tab).sort((a, b) => {
      // Pending: oldest first (FIFO)
      if (tab === 'pending') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [orders, tab]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    setUpdating(orderId);
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'completed') updates.completed_at = new Date().toISOString();

    await supabase.from('orders').update(updates).eq('id', orderId);
    setUpdating(null);
  };

  if (loading) return <LoadingSpinner message="Loading staff dashboard..." />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Staff Dashboard</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage orders and monitor queue in real-time</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {/* Alert Banner */}
      {insight.alertMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3 animate-slide-up">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <Bell className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-700 text-sm">Staff Alert</p>
            <p className="text-sm text-red-600">{insight.alertMessage}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StaffStatCard icon={<Users />} label="Active Queue" value={`${stats.totalActive}`} sub="students" color="brand" />
        <StaffStatCard icon={<Clock />} label="Est. Wait" value={`${stats.estimatedWaitMinutes}m`} sub="minutes" color="blue" />
        <StaffStatCard icon={<CheckCircle2 />} label="Completed Today" value={`${completedToday.length}`} sub="orders" color="emerald" />
        <StaffStatCard icon={<Receipt />} label="Revenue Today" value={formatPrice(revenueToday)} sub="collected" color="amber" />
      </div>

      {/* Status + AI */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-xl border-2 p-4 ${getStatusColor(stats.status)}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2.5 h-2.5 rounded-full ${getStatusDot(stats.status)} animate-pulse`} />
            <span className="text-sm font-semibold">Queue Status: {getStatusLabel(stats.status)}</span>
          </div>
          <p className="text-xs opacity-75">{stats.pendingCount} pending · {stats.preparingCount} preparing</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-4 h-4 text-brand-500" />
            <span className="text-sm font-bold text-gray-900">AI: Peak at {insight.peakTime}</span>
          </div>
          <p className="text-xs text-gray-500">Best time for students: {insight.bestOrderTime}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            {insight.currentTrend === 'rising' ? <TrendingUp className="w-4 h-4 text-red-500" /> :
             insight.currentTrend === 'falling' ? <TrendingDown className="w-4 h-4 text-emerald-500" /> :
             <Minus className="w-4 h-4 text-gray-400" />}
            <span className="text-sm font-bold text-gray-900 capitalize">Trend: {insight.currentTrend}</span>
          </div>
          <p className="text-xs text-gray-500">
            {insight.currentTrend === 'rising' ? 'Queue is growing' :
             insight.currentTrend === 'falling' ? 'Queue is clearing' : 'Queue is stable'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-50 rounded-xl mb-4 overflow-x-auto scrollbar-hide">
        <TabButton label="Pending" count={orders.filter((o) => o.status === 'pending').length} active={tab === 'pending'} onClick={() => setTab('pending')} icon={<Package className="w-4 h-4" />} />
        <TabButton label="Preparing" count={orders.filter((o) => o.status === 'preparing').length} active={tab === 'preparing'} onClick={() => setTab('preparing')} icon={<ChefHat className="w-4 h-4" />} />
        <TabButton label="Ready" count={orders.filter((o) => o.status === 'ready').length} active={tab === 'ready'} onClick={() => setTab('ready')} icon={<ShoppingBag className="w-4 h-4" />} />
        <TabButton label="Completed" count={orders.filter((o) => o.status === 'completed').length} active={tab === 'completed'} onClick={() => setTab('completed')} icon={<CheckCircle2 className="w-4 h-4" />} />
      </div>

      {/* Orders list */}
      <div className="space-y-3">
        {tabOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No {tab} orders</p>
          </div>
        ) : (
          tabOrders.slice(0, 30).map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              items={orderItemsMap[order.id] ?? []}
              updating={updating === order.id}
              onUpdateStatus={updateOrderStatus}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StaffStatCard({
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-700">{label}</p>
      <p className="text-[10px] text-gray-400">{sub}</p>
    </div>
  );
}

function TabButton({
  label, count, active, onClick, icon,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
        active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {icon}
      {label}
      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
        active ? 'bg-brand-50 text-brand-600' : 'bg-gray-100 text-gray-500'
      }`}>
        {count}
      </span>
    </button>
  );
}

function OrderRow({
  order, items, updating, onUpdateStatus,
}: {
  order: Order;
  items: OrderItem[];
  updating: boolean;
  onUpdateStatus: (id: string, status: OrderStatus) => void;
}) {
  const statusColors: Record<OrderStatus, string> = {
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    preparing: 'bg-blue-50 text-blue-600 border-blue-200',
    ready: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    completed: 'bg-gray-50 text-gray-500 border-gray-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex flex-col items-center justify-center flex-shrink-0">
            <span className="text-[10px] text-brand-400 font-medium">Queue</span>
            <span className="text-lg font-extrabold text-brand-600 leading-none">#{order.queue_number}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-gray-900">{order.student_name}</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${statusColors[order.status]}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {formatTime(order.created_at)} · {formatPrice(order.total_amount)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span key={item.id} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded">
                  {item.quantity}× {item.menu_item?.name ?? 'Item'}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {order.status === 'pending' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'preparing')}
              disabled={updating}
              className="px-3 py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <ChefHat className="w-3.5 h-3.5" /> Start Preparing
            </button>
          )}
          {order.status === 'preparing' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'ready')}
              disabled={updating}
              className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Mark Ready
            </button>
          )}
          {order.status === 'ready' && (
            <button
              onClick={() => onUpdateStatus(order.id, 'completed')}
              disabled={updating}
              className="px-3 py-2 rounded-lg bg-gray-50 text-gray-600 text-xs font-semibold hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
