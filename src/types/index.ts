export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  prep_time_seconds: number;
  is_available: boolean;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  price_at_order: number;
  menu_item?: MenuItem;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  queue_number: number;
  status: OrderStatus;
  total_amount: number;
  estimated_wait_minutes: number;
  estimated_pickup_time: string | null;
  student_name: string;
  created_at: string;
  completed_at: string | null;
  updated_at: string;
  order_items?: OrderItem[];
}

export interface CartItem {
  menu_item: MenuItem;
  quantity: number;
}
