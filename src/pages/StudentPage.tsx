import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ShoppingBag, Plus, Minus, Trash2, X, CheckCircle2,
  QrCode as QrCodeIcon, Ticket, Clock, ArrowLeft, Loader2,
  UtensilsCrossed, Tag,
} from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabase';
import type { MenuItem, CartItem, Order, OrderItem } from '@/types';
import { LoadingSpinner, formatPrice } from '@/components/shared';
import { calculateQueueStats } from '@/lib/ai';

type StudentView = 'menu' | 'orderPlaced';

export function StudentPage() {
  const [view, setView] = useState<StudentView>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [placedItems, setPlacedItems] = useState<OrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);

  useEffect(() => {
    async function loadMenu() {
      const { data } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (data) setMenuItems(data as MenuItem[]);
      setLoading(false);
    }
    loadMenu();
  }, []);

  useEffect(() => {
    async function loadActiveOrders() {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['pending', 'preparing'])
        .order('created_at', { ascending: true });
      if (data) setActiveOrders(data);
    }
    loadActiveOrders();

    const channel = supabase
      .channel('student-orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadActiveOrders())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const stats = useMemo(() => calculateQueueStats(activeOrders), [activeOrders]);

  const categories = useMemo(() => {
    const cats = new Set(menuItems.map((m) => m.category));
    return Array.from(cats);
  }, [menuItems]);

  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const cartTotal = cart.reduce((sum, c) => sum + c.menu_item.price * c.quantity, 0);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { menu_item: item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) =>
          c.menu_item.id === id ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0);
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((c) => c.menu_item.id !== id));
  };

  const placeOrder = async () => {
    if (cart.length === 0) return;
    setPlacing(true);
    setError(null);

    try {
      // Get next queue number
      const { data: lastOrder } = await supabase
        .from('orders')
        .select('queue_number')
        .order('queue_number', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextQueue = (lastOrder?.queue_number ?? 0) + 1;
      const estimatedWait = Math.ceil((stats.totalActive + cartCount) * 40 / 60);
      const pickupTime = new Date(Date.now() + estimatedWait * 60 * 1000).toISOString();

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          queue_number: nextQueue,
          status: 'pending',
          total_amount: cartTotal,
          estimated_wait_minutes: estimatedWait,
          estimated_pickup_time: pickupTime,
          student_name: studentName.trim() || 'Student',
        })
        .select()
        .single();

      if (orderError || !newOrder) {
        setError('Failed to place order. Please try again.');
        setPlacing(false);
        return;
      }

      // Insert order items
      const orderItemsData = cart.map((c) => ({
        order_id: newOrder.id,
        menu_item_id: c.menu_item.id,
        quantity: c.quantity,
        price_at_order: c.menu_item.price,
      }));

      const { data: insertedItems } = await supabase
        .from('order_items')
        .insert(orderItemsData)
        .select();

      setPlacedOrder(newOrder as Order);
      setPlacedItems((insertedItems ?? []) as OrderItem[]);
      setCart([]);
      setShowCart(false);
      setView('orderPlaced');
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setPlacing(false);
  };

  if (loading) return <LoadingSpinner message="Loading menu..." />;

  if (view === 'orderPlaced' && placedOrder) {
    return (
      <OrderConfirmation
        order={placedOrder}
        orderItems={placedItems}
        activeOrders={activeOrders}
        onNewOrder={() => {
          setView('menu');
          setPlacedOrder(null);
          setPlacedItems([]);
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Order Food</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {stats.totalActive} students in queue · Est. wait {stats.estimatedWaitMinutes} min
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-1">
        {categories.map((cat) => (
          <span
            key={cat}
            className="px-3 py-1.5 rounded-lg bg-gray-50 text-gray-600 text-xs font-medium whitespace-nowrap border border-gray-100"
          >
            {cat}
          </span>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-24">
        {menuItems.map((item) => {
          const inCart = cart.find((c) => c.menu_item.id === item.id);
          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-medium text-brand-500 bg-brand-50 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900">{item.name}</h3>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-lg font-bold text-gray-900">{formatPrice(item.price)}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{item.prep_time_seconds}s
                    </span>
                  </div>
                </div>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-6 h-6 text-brand-400" />
                </div>
              </div>

              {inCart ? (
                <div className="flex items-center justify-between mt-4 bg-brand-50 rounded-lg p-2">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 rounded-lg bg-white text-brand-600 flex items-center justify-center hover:bg-brand-100 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-brand-700">{inCart.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 rounded-lg bg-white text-brand-600 flex items-center justify-center hover:bg-brand-100 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(item)}
                  className="w-full mt-4 py-2.5 rounded-lg bg-gray-50 text-gray-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add to Cart
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Cart Sidebar / Floating Bar */}
      {cart.length > 0 && (
        <>
          {/* Mobile bottom bar */}
          <div className="fixed bottom-0 left-0 right-0 z-40 sm:hidden">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-brand-500 text-white py-4 px-4 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span className="font-semibold">{cartCount} items</span>
              </div>
              <span className="font-bold">{formatPrice(cartTotal)}</span>
            </button>
          </div>

          {/* Desktop floating cart button */}
          <button
            onClick={() => setShowCart(true)}
            className="hidden sm:flex fixed bottom-6 right-6 z-40 bg-brand-500 text-white rounded-full pl-5 pr-6 py-3.5 shadow-lg hover:shadow-xl hover:bg-brand-600 transition-all items-center gap-2 font-semibold"
          >
            <ShoppingBag className="w-5 h-5" />
            <span>{cartCount} items</span>
            <span className="text-white/60">·</span>
            <span>{formatPrice(cartTotal)}</span>
          </button>
        </>
      )}

      {/* Cart Drawer */}
      {showCart && (
        <CartDrawer
          cart={cart}
          cartTotal={cartTotal}
          cartCount={cartCount}
          studentName={studentName}
          placing={placing}
          estimatedWait={Math.ceil((stats.totalActive + cartCount) * 40 / 60)}
          onClose={() => setShowCart(false)}
          onUpdateQuantity={updateQuantity}
          onRemoveFromCart={removeFromCart}
          onStudentNameChange={setStudentName}
          onPlaceOrder={placeOrder}
        />
      )}
    </div>
  );
}

function CartDrawer({
  cart, cartTotal, cartCount, studentName, placing, estimatedWait,
  onClose, onUpdateQuantity, onRemoveFromCart, onStudentNameChange, onPlaceOrder,
}: {
  cart: CartItem[];
  cartTotal: number;
  cartCount: number;
  studentName: string;
  placing: boolean;
  estimatedWait: number;
  onClose: () => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveFromCart: (id: string) => void;
  onStudentNameChange: (name: string) => void;
  onPlaceOrder: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl h-full flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-500" /> Your Order
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.menu_item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{item.menu_item.name}</p>
                  <p className="text-xs text-gray-400">{formatPrice(item.menu_item.price)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(item.menu_item.id, -1)}
                    className="w-7 h-7 rounded-lg bg-white text-gray-600 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-sm w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.menu_item.id, 1)}
                    className="w-7 h-7 rounded-lg bg-white text-gray-600 flex items-center justify-center hover:bg-gray-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="w-16 text-right">
                  <p className="font-bold text-sm text-gray-900">{formatPrice(item.menu_item.price * item.quantity)}</p>
                </div>
                <button
                  onClick={() => onRemoveFromCart(item.menu_item.id)}
                  className="w-7 h-7 rounded-lg text-gray-300 hover:text-red-500 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-gray-100 p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Your Name (optional)</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => onStudentNameChange(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
            </div>

            <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                Estimated pickup time: <span className="font-bold">~{estimatedWait} minutes</span>
              </p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total ({cartCount} items)</span>
              <span className="text-2xl font-extrabold text-gray-900">{formatPrice(cartTotal)}</span>
            </div>

            <button
              onClick={onPlaceOrder}
              disabled={placing}
              className="w-full py-3.5 rounded-xl bg-brand-500 text-white font-bold hover:bg-brand-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {placing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Placing Order...</>
              ) : (
                <>Place Order & Get Queue Number</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderConfirmation({
  order, orderItems, activeOrders, onNewOrder,
}: {
  order: Order;
  orderItems: OrderItem[];
  activeOrders: Order[];
  onNewOrder: () => void;
}) {
  const [qrUrl, setQrUrl] = useState<string>('');
  const [livePosition, setLivePosition] = useState<number>(order.queue_number);

  // Subscribe to live updates of this order and all active orders
  useEffect(() => {
    async function updatePosition() {
      const { data: current } = await supabase
        .from('orders')
        .select('*')
        .eq('id', order.id)
        .maybeSingle();

      if (current) {
        const { data: ahead } = await supabase
          .from('orders')
          .select('id')
          .in('status', ['pending', 'preparing'])
          .lt('queue_number', order.queue_number);

        setLivePosition((ahead?.length ?? 0) + 1);
      }
    }
    updatePosition();

    const channel = supabase
      .channel(`order-${order.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => updatePosition())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [order.id, order.queue_number]);

  // Generate QR code
  useEffect(() => {
    const orderData = JSON.stringify({
      orderId: order.id,
      queueNumber: order.queue_number,
      total: order.total_amount,
    });
    QRCode.toDataURL(orderData, { width: 200, margin: 2 })
      .then(setQrUrl)
      .catch(() => setQrUrl(''));
  }, [order.id, order.queue_number, order.total_amount]);

  const ahead = activeOrders.filter((o) =>
    o.queue_number < order.queue_number && ['pending', 'preparing'].includes(o.status)
  ).length;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Success header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-9 h-9 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">Order Placed!</h1>
        <p className="text-gray-500 text-sm mt-1">Your order has been received by the canteen</p>
      </div>

      {/* Queue Number Card */}
      <div className="bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white text-center shadow-sm mb-6">
        <div className="flex items-center justify-center gap-2 text-white/80 text-sm mb-2">
          <Ticket className="w-4 h-4" />
          <span>Your Queue Number</span>
        </div>
        <p className="text-6xl font-extrabold tracking-tight">#{order.queue_number}</p>

        {/* Live position */}
        <div className="mt-4 bg-white/15 rounded-xl py-3 px-4 inline-block">
          <p className="text-xs text-white/70 mb-1">Live Position in Queue</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold">{livePosition}</span>
            {livePosition > 1 && (
              <span className="text-sm text-white/70">
                (was #{order.queue_number}, {ahead} ahead)
              </span>
            )}
            {livePosition <= 1 && (
              <span className="text-sm text-white/90 font-semibold animate-pulse">You're next!</span>
            )}
          </div>
        </div>
      </div>

      {/* Live Position Tracker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <h2 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-500" /> Queue Progress
        </h2>
        <div className="flex items-center gap-1">
          {Array.from({ length: Math.min(order.queue_number, 10) }, (_, i) => {
            const pos = i + 1;
            const isPassed = pos < livePosition;
            const isCurrent = pos === livePosition;
            return (
              <div
                key={pos}
                className={`flex-1 h-2 rounded-full transition-all ${
                  isPassed ? 'bg-emerald-400' :
                  isCurrent ? 'bg-brand-500 animate-pulse' :
                  'bg-gray-100'
                }`}
              />
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          {livePosition <= 1
            ? "You're next in line! Get ready to pick up your order."
            : `${livePosition - 1} students ahead of you · Est. ${order.estimated_wait_minutes} min wait`}
        </p>
      </div>

      {/* QR Code + Order details */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <h3 className="font-bold text-gray-900 text-sm mb-3 flex items-center justify-center gap-2">
            <QrCodeIcon className="w-4 h-4 text-brand-500" /> Order QR Code
          </h3>
          {qrUrl ? (
            <img src={qrUrl} alt="Order QR Code" className="w-40 h-40 mx-auto rounded-lg" />
          ) : (
            <div className="w-40 h-40 mx-auto bg-gray-50 rounded-lg flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
            </div>
          )}
          <p className="text-xs text-gray-400 mt-3">Show this at the counter</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 text-sm mb-3">Order Details</h3>
          <div className="space-y-2">
            {orderItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{item.quantity}× Item</span>
                <span className="font-medium text-gray-900">{formatPrice(item.price_at_order * item.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-extrabold text-brand-600">{formatPrice(order.total_amount)}</span>
            </div>
            <div className="text-xs text-gray-400 pt-2 flex items-center gap-2">
              <Tag className="w-3 h-3" />
              Ordered at {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onNewOrder}
        className="w-full py-3.5 rounded-xl bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" /> Order More Food
      </button>
    </div>
  );
}
