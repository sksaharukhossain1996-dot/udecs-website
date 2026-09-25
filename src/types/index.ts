export type Language = 'bn' | 'en' | 'hi';
export type Currency = 'INR' | 'USD' | 'EUR' | 'AED';
export type UserRole = 'customer' | 'admin' | 'manager' | 'inventory' | 'accountant';

export interface Product {
  id: string;
  name: string;
  nameBn: string;
  nameHi: string;
  category: 'kitchen' | 'sports' | 'wholesale' | 'industrial';
  sku: string;
  hsn: string;
  price: number; // in INR base
  wholesalePrice: number;
  minWholesaleQty: number;
  stock: number;
  minStockAlert: number;
  rating: number;
  reviewsCount: number;
  imageIcon: string;
  imageUrl?: string;
  productLink?: string; // external or direct online selling link
  description: string;
  descriptionBn: string;
  gstRate: number; // 5, 12, 18, 28%
  featured?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  isWholesale?: boolean;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  hsn: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  taxAmount: number;
  totalPrice: number;
}

export type OrderStatus = 'pending' | 'processing' | 'packed' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'payu' | 'upi' | 'card' | 'netbanking' | 'cod';

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  state: string;
  pincode: string;
  gstin?: string;
  items: OrderItem[];
  subtotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGst: number;
  shippingFee: number;
  totalAmount: number;
  currency: Currency;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  payuTxnId?: string;
  orderStatus: OrderStatus;
  trackingNumber?: string;
  courierName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'manager' | 'inventory' | 'accountant';
  department: string;
  baseSalary: number;
  joiningDate: string;
  status: 'active' | 'on_leave' | 'resigned';
  employeeCode?: string;
  designation?: string;
  bankAccount?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'present' | 'half_day' | 'leave' | 'late' | 'half-day' | 'absent';
  notes?: string;
}

export interface SalarySlip {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string;
  year: number;
  baseSalary: number;
  basicSalary?: number;
  hra: number;
  da?: number;
  specialAllowance: number;
  grossSalary: number;
  pfDeduction: number;
  esiDeduction: number;
  tdsDeduction: number;
  taxDeduction?: number;
  totalDeductions: number;
  netSalary: number;
  paymentStatus: 'paid' | 'pending';
  generatedAt: string;
  employeeCode?: string;
  designation?: string;
  workingDays?: number;
  presentDays?: number;
}

export interface NotificationLog {
  id: string;
  type: 'order_placed' | 'order_shipped' | 'low_stock' | 'promotion' | 'custom' | 'sms' | 'email';
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  subject: string;
  message: string;
  body?: string;
  status: 'sent' | 'queued' | 'failed';
  timestamp: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  userName?: string;
  role: UserRole;
  userRole?: string;
  action: string;
  module?: string;
  details: string;
  ip: string;
  ipAddress?: string;
}

export interface TeamTask {
  id: string;
  title: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed' | 'pending' | 'in-progress';
  dueDate?: string;
  comments?: {
    id: string;
    author: string;
    text: string;
    timestamp: string;
  }[];
}

export interface PayUConfig {
  merchantKey: string;
  merchantSalt: string;
  testMode: boolean;
  successUrl: string;
  failureUrl: string;
}

export interface SiteContent {
  announcement: string;
  heroBadge: string;
  heroHeadline: string;
  heroHeadlineHighlight: string;
  heroSubheadline: string;
  heroCtaButton: string;
  heroSecondaryButton: string;
  statProducts: string;
  statExperience: string;
  statClients: string;
  statDistricts: string;
  categoryHeadline: string;
  categorySubheadline: string;
  wholesaleHeadline: string;
  wholesaleSubheadline: string;
  footerAbout: string;
}

export interface CompanyInfo {
  name: string;
  legalName: string;
  domain: string;
  whatsapp: string;
  emailGmail: string;
  emailOutlook: string;
  gstin: string;
  state: string;
  stateCode: string;
  address: string;
  description?: string;
  socials: {
    facebook: string;
    instagram: string;
  };
  socialLinks: {
    facebook: string;
    instagram: string;
    whatsapp?: string;
  };
}

export interface WhatsAppAutomationConfig {
  isActive: boolean;
  autoSendOnOrderPlaced: boolean;
  autoSendOnOrderShipped: boolean;
  autoSendOnOrderDelivered: boolean;
  autoSendLowStockAlert: boolean;
  autoAiAssistantReply: boolean;
  whatsappNumber: string;
  ownerAlertNumber: string;
  gatewayStatus: 'active' | 'connected' | 'paused';
  webhookUrl: string;
  defaultLanguage: 'bn' | 'en' | 'bilingual';
  totalDispatchedCount: number;
  templates: {
    orderPlacedBn: string;
    orderPlacedEn: string;
    orderShippedBn: string;
    orderShippedEn: string;
    orderDeliveredBn: string;
    orderDeliveredEn: string;
    lowStockAlertBn: string;
    quickOrderTextBn: string;
  };
}

