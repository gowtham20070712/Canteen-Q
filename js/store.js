/**
 * Canteen Queue AI - Central State Store & Persistence
 * Supports multi-tab synchronization via BroadcastChannel & LocalStorage
 */

const STORAGE_KEY = 'canteen_queue_ai_v1';
const BROADCAST_CHANNEL_NAME = 'canteen_queue_ai_broadcast';

// Default menu catalog
const DEFAULT_MENU = [
  {
    id: 'm1',
    name: 'Classic Smash Cheeseburger',
    category: 'burgers',
    price: 6.50,
    prepTimeMin: 4,
    type: 'non-veg',
    rating: 4.8,
    image: '🍔',
    description: 'Double grilled beef patty, melted cheddar, pickles & special house sauce.'
  },
  {
    id: 'm2',
    name: 'Crispy Veggie Deluxe Burger',
    category: 'burgers',
    price: 5.20,
    prepTimeMin: 3,
    type: 'veg',
    rating: 4.6,
    image: '🥪',
    description: 'Spiced potato-corn patty, lettuce, tomatoes and chipotle vegan mayo.'
  },
  {
    id: 'm3',
    name: 'Spicy Teriyaki Chicken Bowl',
    category: 'bowls',
    price: 7.80,
    prepTimeMin: 5,
    type: 'non-veg',
    rating: 4.9,
    image: '🍗',
    description: 'Steamed jasmine rice, glazed chicken breast, sesame broccoli and chili flakes.'
  },
  {
    id: 'm4',
    name: 'Paneer Butter Tikka Rice Bowl',
    category: 'bowls',
    price: 6.90,
    prepTimeMin: 4,
    type: 'veg',
    rating: 4.7,
    image: '🍛',
    description: 'Tender cottage cheese in rich tomato gravy, aromatic basmati rice.'
  },
  {
    id: 'm5',
    name: 'Golden Loaded French Fries',
    category: 'snacks',
    price: 3.50,
    prepTimeMin: 2,
    type: 'veg',
    rating: 4.5,
    image: '🍟',
    description: 'Crispy salted fries drizzled with warm cheese sauce and jalapeños.'
  },
  {
    id: 'm6',
    name: 'Crispy Mozzarella Sticks (4pcs)',
    category: 'snacks',
    price: 4.20,
    prepTimeMin: 3,
    type: 'veg',
    rating: 4.8,
    image: '🧀',
    description: 'Gooey herb-crusted cheese sticks served with zesty marinara dip.'
  },
  {
    id: 'm7',
    name: 'Iced Caramel Cold Brew Coffee',
    category: 'drinks',
    price: 3.80,
    prepTimeMin: 1,
    type: 'veg',
    rating: 4.9,
    image: '🥤',
    description: 'Double shot arabica cold brew, oat milk, sea salt caramel swirl.'
  },
  {
    id: 'm8',
    name: 'Fresh Mango Mint Refresher',
    category: 'drinks',
    price: 3.20,
    prepTimeMin: 1,
    type: 'veg',
    rating: 4.7,
    image: '🍹',
    description: 'Sparkling mango cooler with crushed fresh mint leaves and lime.'
  }
];

// Initial mock orders to simulate real canteen activity
const INITIAL_ORDERS = [
  {
    id: 'ord-1038',
    ticketNumber: 'Q-07',
    studentId: 'ST-9801',
    studentName: 'Priya Sharma',
    items: [{ id: 'm4', name: 'Paneer Butter Tikka Rice Bowl', qty: 1, price: 6.90 }],
    total: 6.90,
    status: 'ready', // pending, preparing, ready, completed
    orderedAt: '12:45 PM',
    queuePosition: 0,
    token: 'T-078'
  },
  {
    id: 'ord-1039',
    ticketNumber: 'Q-08',
    studentId: 'ST-9812',
    studentName: 'David Miller',
    items: [{ id: 'm1', name: 'Classic Smash Cheeseburger', qty: 1, price: 6.50 }, { id: 'm5', name: 'Golden Loaded Fries', qty: 1, price: 3.50 }],
    total: 10.00,
    status: 'ready',
    orderedAt: '12:48 PM',
    queuePosition: 0,
    token: 'T-082'
  },
  {
    id: 'ord-1040',
    ticketNumber: 'Q-09',
    studentId: 'ST-9825',
    studentName: 'Zack Zhao',
    items: [{ id: 'm3', name: 'Spicy Teriyaki Chicken Bowl', qty: 1, price: 7.80 }],
    total: 7.80,
    status: 'preparing',
    orderedAt: '12:51 PM',
    queuePosition: 1,
    token: 'T-091'
  },
  {
    id: 'ord-1041',
    ticketNumber: 'Q-10',
    studentId: 'ST-9833',
    studentName: 'Emma Watson',
    items: [{ id: 'm2', name: 'Crispy Veggie Deluxe Burger', qty: 2, price: 10.40 }],
    total: 10.40,
    status: 'preparing',
    orderedAt: '12:54 PM',
    queuePosition: 2,
    token: 'T-095'
  },
  {
    id: 'ord-1042',
    ticketNumber: 'Q-12',
    studentId: 'ST-CS2104',
    studentName: 'Alex Carter (You)',
    items: [
      { id: 'm1', name: 'Classic Smash Cheeseburger', qty: 1, price: 6.50 },
      { id: 'm7', name: 'Iced Caramel Cold Brew', qty: 1, price: 3.80 }
    ],
    total: 10.30,
    status: 'pending',
    orderedAt: '12:56 PM',
    queuePosition: 12, // Starting position as requested: #12 -> #8 -> #4 -> Ready
    stepperStage: 0, // 0: #12, 1: #8, 2: #4, 3: Ready
    token: 'T-1042-ALEX'
  },
  {
    id: 'ord-1043',
    ticketNumber: 'Q-13',
    studentId: 'ST-9844',
    studentName: 'Liam Johnson',
    items: [{ id: 'm5', name: 'Golden Loaded Fries', qty: 1, price: 3.50 }],
    total: 3.50,
    status: 'pending',
    orderedAt: '12:57 PM',
    queuePosition: 13,
    token: 'T-1043'
  },
  {
    id: 'ord-1044',
    ticketNumber: 'Q-14',
    studentId: 'ST-9850',
    studentName: 'Sophia Chen',
    items: [{ id: 'm3', name: 'Spicy Teriyaki Chicken Bowl', qty: 1, price: 7.80 }],
    total: 7.80,
    status: 'pending',
    orderedAt: '12:58 PM',
    queuePosition: 14,
    token: 'T-1044'
  },
  {
    id: 'ord-1045',
    ticketNumber: 'Q-15',
    studentId: 'ST-9861',
    studentName: 'Marcus Aurelius',
    items: [{ id: 'm6', name: 'Crispy Mozzarella Sticks', qty: 1, price: 4.20 }],
    total: 4.20,
    status: 'pending',
    orderedAt: '12:59 PM',
    queuePosition: 15,
    token: 'T-1045'
  }
];

// Initial state object exactly honoring user parameters
const DEFAULT_STATE = {
  // Key stats required by user:
  currentQueue: 18,
  averageServiceTimeSeconds: 40, // 40 sec / student
  currentUser: {
    role: 'student', // 'student' or 'staff'
    name: 'Alex Carter',
    id: 'ST-CS2104',
    department: 'Computer Science',
    counterAssigned: 'Counter #1 (Express Meals)'
  },
  cart: [],
  orders: INITIAL_ORDERS,
  activeStudentTicketId: 'ord-1042', // Default tracking ticket for demonstration
  menu: DEFAULT_MENU,
  lastUpdated: new Date().toISOString()
};

class CanteenStore {
  constructor() {
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(BROADCAST_CHANNEL_NAME) : null;
    this.listeners = [];
    this.state = this.loadState();

    if (this.channel) {
      this.channel.onmessage = (event) => {
        if (event.data && event.data.type === 'STATE_UPDATE') {
          this.state = event.data.state;
          this.notifyListeners('remote');
        }
      };
    }

    // Storage event listener for cross-tab sync without broadcast channel
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          this.state = JSON.parse(e.newValue);
          this.notifyListeners('remote');
        } catch (err) {
          console.error('Failed to parse synchronized storage:', err);
        }
      }
    });
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure critical fields exist
        return { ...DEFAULT_STATE, ...parsed };
      }
    } catch (e) {
      console.warn('Storage unavailable, using defaults');
    }
    return { ...DEFAULT_STATE };
  }

  saveState() {
    this.state.lastUpdated = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }
    if (this.channel) {
      this.channel.postMessage({ type: 'STATE_UPDATE', state: this.state });
    }
    this.notifyListeners('local');
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners(source) {
    this.listeners.forEach(fn => {
      try {
        fn(this.state, source);
      } catch (err) {
        console.error('Store listener error:', err);
      }
    });
  }

  getState() {
    return this.state;
  }

  // --- Computed AI & Queue Properties ---
  getEstimatedWaitTimeMinutes() {
    // wait time = current queue * avg service time / 60
    const totalSeconds = this.state.currentQueue * this.state.averageServiceTimeSeconds;
    return Math.round(totalSeconds / 60);
  }

  getQueueStatus() {
    const q = this.state.currentQueue;
    if (q < 8) return { level: 'low', label: 'Low Queue', icon: '🟢', color: 'emerald', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    if (q <= 15) return { level: 'medium', label: 'Medium Queue', icon: '🟡', color: 'amber', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    return { level: 'high', label: 'High Queue', icon: '🔴', color: 'rose', bg: 'bg-rose-500/20 text-rose-400 border-rose-500/40' };
  }

  // --- User / Role Management ---
  setRole(role, userDetails = {}) {
    this.state.currentUser = {
      role,
      name: userDetails.name || (role === 'staff' ? 'Chef Ramirez' : 'Alex Carter'),
      id: userDetails.id || (role === 'staff' ? 'EMP-409' : 'ST-CS2104'),
      department: userDetails.department || (role === 'staff' ? 'Kitchen Operations' : 'Computer Science'),
      counterAssigned: userDetails.counterAssigned || 'Counter #1 (Main Meals)'
    };
    this.saveState();
  }

  // --- Student Cart & Order Actions ---
  addToCart(item) {
    const existing = this.state.cart.find(c => c.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.state.cart.push({ ...item, qty: 1 });
    }
    this.saveState();
  }

  removeFromCart(itemId) {
    this.state.cart = this.state.cart.filter(c => c.id !== itemId);
    this.saveState();
  }

  updateCartQty(itemId, delta) {
    const item = this.state.cart.find(c => c.id === itemId);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) {
      this.removeFromCart(itemId);
    } else {
      this.saveState();
    }
  }

  clearCart() {
    this.state.cart = [];
    this.saveState();
  }

  placeOrder(customNotes = '') {
    if (this.state.cart.length === 0) return null;

    const newQueueCount = this.state.currentQueue + 1;
    const ticketNum = `Q-${newQueueCount < 10 ? '0' + newQueueCount : newQueueCount}`;
    const orderId = `ord-${Date.now().toString().slice(-4)}`;
    const token = `TKN-${Math.floor(1000 + Math.random() * 9000)}-${this.state.currentUser.id.slice(-4)}`;

    const total = this.state.cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

    const newOrder = {
      id: orderId,
      ticketNumber: ticketNum,
      studentId: this.state.currentUser.id,
      studentName: this.state.currentUser.name,
      items: [...this.state.cart],
      total: parseFloat(total.toFixed(2)),
      status: 'pending',
      orderedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      queuePosition: newQueueCount,
      stepperStage: 0,
      notes: customNotes,
      token: token
    };

    this.state.orders.push(newOrder);
    this.state.currentQueue = newQueueCount;
    this.state.activeStudentTicketId = newOrder.id;
    this.state.cart = [];

    this.saveState();
    return newOrder;
  }

  // --- Live Queue Stepper (#12 -> #8 -> #4 -> Ready) Demo Simulation ---
  advanceActiveTicketPosition() {
    const activeOrder = this.getActiveStudentOrder();
    if (!activeOrder) return null;

    // Sequence stages: 0: #12, 1: #8, 2: #4, 3: Ready
    const stages = [12, 8, 4, 0];
    let currentStage = activeOrder.stepperStage !== undefined ? activeOrder.stepperStage : 0;
    
    if (currentStage < 3) {
      currentStage += 1;
      activeOrder.stepperStage = currentStage;
      activeOrder.queuePosition = stages[currentStage];
      
      if (currentStage === 3) {
        activeOrder.status = 'ready';
      } else if (currentStage >= 1 && activeOrder.status === 'pending') {
        activeOrder.status = 'preparing';
      }
    } else {
      // Completed / reset to #12 for endless demo delight
      activeOrder.stepperStage = 0;
      activeOrder.queuePosition = 12;
      activeOrder.status = 'pending';
    }

    this.saveState();
    return activeOrder;
  }

  getActiveStudentOrder() {
    if (!this.state.activeStudentTicketId) {
      // Pick first user order or create default
      const userOrd = this.state.orders.find(o => o.studentId === this.state.currentUser.id);
      return userOrd || this.state.orders.find(o => o.id === 'ord-1042') || this.state.orders[0];
    }
    return this.state.orders.find(o => o.id === this.state.activeStudentTicketId);
  }

  // --- Staff Operations ---
  updateOrderStatus(orderId, newStatus) {
    const order = this.state.orders.find(o => o.id === orderId);
    if (!order) return;

    order.status = newStatus;
    if (newStatus === 'completed') {
      if (this.state.currentQueue > 0) {
        this.state.currentQueue = Math.max(0, this.state.currentQueue - 1);
      }
      // Re-index remaining pending queue positions
      this.recalculateQueuePositions();
    } else if (newStatus === 'ready') {
      // If it's the active student ticket, update stepperStage to 3 (Ready)
      if (order.id === this.state.activeStudentTicketId) {
        order.stepperStage = 3;
        order.queuePosition = 0;
      }
    }
    this.saveState();
  }

  callNextOrder() {
    // Find earliest pending order
    const nextPending = this.state.orders.find(o => o.status === 'pending');
    if (nextPending) {
      nextPending.status = 'preparing';
      if (nextPending.id === this.state.activeStudentTicketId && nextPending.stepperStage < 2) {
        nextPending.stepperStage = 2; // Move closer to ready
        nextPending.queuePosition = 4;
      }
    } else {
      // Next preparing to ready
      const nextPrep = this.state.orders.find(o => o.status === 'preparing');
      if (nextPrep) {
        nextPrep.status = 'ready';
        if (nextPrep.id === this.state.activeStudentTicketId) {
          nextPrep.stepperStage = 3;
          nextPrep.queuePosition = 0;
        }
      }
    }
    if (this.state.currentQueue > 1) {
      this.state.currentQueue -= 1;
    }
    this.saveState();
  }

  recalculateQueuePositions() {
    const pendingOrders = this.state.orders.filter(o => o.status === 'pending');
    pendingOrders.forEach((o, idx) => {
      o.queuePosition = idx + 1;
    });
  }

  resetToDefaultDemo() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    this.saveState();
  }
}

// Single instance export to window
window.canteenStore = new CanteenStore();
