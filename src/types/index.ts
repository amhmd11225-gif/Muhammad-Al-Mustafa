import type { Timestamp } from 'firebase/firestore';

export const PART_CATEGORIES = [
  'محرك وتبريد',
  'كهرباء',
  'هيكل وأبواب',
  'إضاءة',
  'فرامل وتعليق',
  'قطع داخلية',
  'أخرى',
] as const;

export const PART_CONDITIONS = [
  'مستعمل - نظيف',
  'فرط وكالة',
  'جديد',
] as const;

export type PartCondition = (typeof PART_CONDITIONS)[number];

export type OrderStatus =
  | 'new'
  | 'contacted'
  | 'preparing'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  preparing: 'تم التجهيز',
  delivered: 'تم التوصيل',
  completed: 'مكتمل',
  cancelled: 'ملغي',
};

export type UserRole = 'admin' | 'employee' | 'unauthorized' | 'guest';

export interface Product {
  id: string;
  name: string;
  category: string;
  carMake: string;
  carModel: string;
  condition: PartCondition;
  price: number;
  quantity: number;
  minStock: number;
  soldCount: number;
  imageUrl: string;
  notes?: string;
  lastOrderId?: string;
  createdBy: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  carMake: string;
  carModel: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  notes?: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: 'الدفع عند الاستلام';
  status: OrderStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Sale {
  id: string;
  productId: string;
  orderId?: string;
  productName: string;
  carMake: string;
  carModel: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  source: 'in_store' | 'online';
  employeeUid: string;
  employeeName: string;
  notes?: string;
  createdAt: Timestamp | null;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'employee';
  active: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface StoreSettings {
  storeName: string;
  whatsappNumber: string;
  currency: string;
  defaultMinStock: number;
  address?: string;
  aboutText?: string;
  updatedAt?: Timestamp | null;
}

export type DashboardTab =
  | 'home'
  | 'add-part'
  | 'inventory'
  | 'pos'
  | 'orders'
  | 'sales'
  | 'staff'
  | 'reports'
  | 'settings';
