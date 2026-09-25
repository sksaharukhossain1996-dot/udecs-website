import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import {
  Product,
  CartItem,
  Order,
  Employee,
  AttendanceRecord,
  SalarySlip,
  NotificationLog,
  AuditLog,
  TeamTask,
  Language,
  Currency,
  UserRole,
  PayUConfig,
  CompanyInfo,
  OrderStatus,
  SiteContent,
  WhatsAppAutomationConfig,
} from '../types';
import {
  DEFAULT_WHATSAPP_CONFIG,
  buildOrderPlacedMessage,
  buildOrderShippedMessage,
  buildOrderDeliveredMessage,
  sendAutomatedWhatsAppApi,
} from '../services/whatsappService';
import {
  COMPANY_DETAILS,
  DEFAULT_SITE_CONTENT,
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_EMPLOYEES,
  INITIAL_TASKS,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  TRANSLATIONS,
} from '../data/mockData';
import { auth, testConnection } from '../firebase/config';
import {
  signInWithGoogle,
  logOutFirebase,
  saveProductToFirestore,
  deleteProductFromFirestore,
  saveOrderToFirestore,
  updateOrderStatusInFirestore,
  saveSiteContentToFirestore,
  saveCompanyToFirestore,
  submitInquiryToFirestore,
  saveAuditLogInFirestore,
  fetchProductsFromFirestore,
  fetchSiteContentFromFirestore,
  fetchCompanyFromFirestore,
  ADMIN_EMAILS,
} from '../firebase/firestoreService';

interface CurrencyRates {
  [key: string]: {
    symbol: string;
    rate: number;
  };
}

export const CURRENCY_INFO: CurrencyRates = {
  INR: { symbol: '₹', rate: 1 },
  USD: { symbol: '$', rate: 0.012 },
  EUR: { symbol: '€', rate: 0.011 },
  AED: { symbol: 'AED ', rate: 0.044 },
};

interface StoreContextType {
  // State
  company: CompanyInfo;
  updateCompany: (updates: Partial<CompanyInfo>) => void;
  siteContent: SiteContent;
  updateSiteContent: (updates: Partial<SiteContent>) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: { name: string; email: string; role: string } | null;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  salarySlips: SalarySlip[];
  notifications: NotificationLog[];
  auditLogs: AuditLog[];
  tasks: TeamTask[];
  collabTasks: TeamTask[];
  collabDoc: { content: string; lastModified: string; updatedBy: string };
  updateCollabDoc: (content: string) => void;
  addCollabTask: (task: { title: string; assignedTo: string; priority: any; status: any }) => void;
  updateCollabTaskStatus: (taskId: string, status: any) => void;
  payuConfig: PayUConfig;
  isOffline: boolean;
  t: (key: keyof typeof TRANSLATIONS['bn']) => string;

  // Cart actions
  addToCart: (product: Product, quantity?: number, isWholesale?: boolean) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;

  // Product & Inventory actions
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  updateProductStock: (productId: string, stock: number) => void;
  deleteProduct: (id: string) => void;

  // Order actions
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Order;
  updateOrderStatus: (orderId: string, status: OrderStatus, trackingNumber?: string, courierName?: string) => void;
  getOrderById: (orderId: string) => Order | undefined;

  // HR & Employee actions
  addEmployee: (emp: Omit<Employee, 'id'>) => void;
  recordAttendance: (empId: string, status: AttendanceRecord['status'], notes?: string) => void;
  markAttendance: (empId: string, date: string, status: any) => void;
  generateSalarySlip: (empId: string, month: string, yearOrWorkingDays?: any, presentDays?: number) => SalarySlip;

  // Collaboration
  addTask: (task: Omit<TeamTask, 'id' | 'comments'>) => void;
  updateTaskStatus: (taskId: string, status: TeamTask['status']) => void;
  addTaskComment: (taskId: string, author: string, text: string) => void;

  // System
  logAction: (action: string, details: string) => void;
  addAuditLog: (log: { action: string; module?: string; details: string; user?: string; role?: UserRole }) => void;
  sendManualNotification: (notif: Omit<NotificationLog, 'id' | 'timestamp'>) => void;
  sendNotification: (type: any, recipient: string, subject: string, message: string) => void;
  updatePayUConfig: (config: Partial<PayUConfig>) => void;
  formatPrice: (amountInINR: number) => string;
  whatsappConfig: WhatsAppAutomationConfig;
  updateWhatsAppConfig: (updates: Partial<WhatsAppAutomationConfig>) => void;

  // Firebase Cloud & Auth
  isFirebaseConnected: boolean;
  firebaseUser: FirebaseUser | null;
  signInWithGoogleAuth: () => Promise<void>;
  signOutFirebaseAuth: () => Promise<void>;
  submitWholesaleInquiry: (inquiry: {
    businessName: string;
    contactPerson: string;
    phone: string;
    email?: string;
    category?: string;
    estVolume?: string;
    notes?: string;
  }) => Promise<string>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('udecs_language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('udecs_language', lang);
  };
  const [currency, setCurrency] = useState<Currency>('INR');
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Persistent Company Contact & Branding State
  const [company, setCompany] = useState<CompanyInfo>(() => {
    const saved = localStorage.getItem('udecs_company');
    return saved ? JSON.parse(saved) : COMPANY_DETAILS;
  });

  const updateCompany = (updates: Partial<CompanyInfo>) => {
    setCompany((prev) => {
      const updated = {
        ...prev,
        ...updates,
        socials: { ...prev.socials, ...(updates.socials || {}) },
        socialLinks: { ...prev.socialLinks, ...(updates.socialLinks || {}) },
      };
      localStorage.setItem('udecs_company', JSON.stringify(updated));
      saveCompanyToFirestore(updated).catch((err) => console.warn('Firestore company save error:', err));
      return updated;
    });
    addAuditLog({
      action: 'COMPANY_INFO_UPDATED',
      module: 'CMS_SETTINGS',
      details: `Updated company info: ${Object.keys(updates).join(', ')}`,
    });
  };

  // Persistent Website Text & Copy CMS State
  const [siteContent, setSiteContent] = useState<SiteContent>(() => {
    const saved = localStorage.getItem('udecs_site_content');
    return saved ? JSON.parse(saved) : DEFAULT_SITE_CONTENT;
  });

  const updateSiteContent = (updates: Partial<SiteContent>) => {
    setSiteContent((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('udecs_site_content', JSON.stringify(updated));
      saveSiteContentToFirestore(updated).catch((err) => console.warn('Firestore siteContent save error:', err));
      return updated;
    });
    addAuditLog({
      action: 'SITE_CONTENT_UPDATED',
      module: 'CMS_CONTENT',
      details: `Updated website texts: ${Object.keys(updates).join(', ')}`,
    });
  };

  // Persistent WhatsApp Automation Settings
  const [whatsappConfig, setWhatsappConfig] = useState<WhatsAppAutomationConfig>(() => {
    const saved = localStorage.getItem('udecs_whatsapp_config');
    if (!saved) return DEFAULT_WHATSAPP_CONFIG;
    const stored = JSON.parse(saved) as WhatsAppAutomationConfig;
    return {
      ...DEFAULT_WHATSAPP_CONFIG,
      ...stored,
      isActive: stored.isActive === true && stored.gatewayStatus === 'connected',
      autoSendOnOrderPlaced: false,
      autoSendOnOrderShipped: false,
      autoSendOnOrderDelivered: false,
      autoSendLowStockAlert: false,
      autoAiAssistantReply: false,
      gatewayStatus: stored.gatewayStatus === 'connected' ? 'connected' : 'paused',
      webhookUrl: '',
      totalDispatchedCount:
        stored.gatewayStatus === 'connected' ? stored.totalDispatchedCount || 0 : 0,
      templates: { ...DEFAULT_WHATSAPP_CONFIG.templates, ...stored.templates },
    };
  });

  const updateWhatsAppConfig = (updates: Partial<WhatsAppAutomationConfig>) => {
    setWhatsappConfig((prev) => {
      const updated = {
        ...prev,
        ...updates,
        templates: {
          ...prev.templates,
          ...(updates.templates || {}),
        },
      };
      localStorage.setItem('udecs_whatsapp_config', JSON.stringify(updated));
      return updated;
    });
    addAuditLog({
      action: 'WHATSAPP_CONFIG_UPDATED',
      module: 'WHATSAPP_AUTOMATION',
      details: `Updated WhatsApp automation settings: ${Object.keys(updates).join(', ')}`,
    });
  };

  // Persistent States
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('udecs_products');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('udecs_cart');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('udecs_orders');
    return saved ? JSON.parse(saved) : INITIAL_ORDERS;
  });

  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem('udecs_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('udecs_attendance');
    if (saved) return JSON.parse(saved);
    // Initial sample record
    return [
      {
        id: 'att-1',
        employeeId: 'EMP-001',
        employeeName: 'Rajesh Sharma',
        date: new Date().toISOString().split('T')[0],
        checkIn: '09:15 AM',
        status: 'present',
      },
      {
        id: 'att-2',
        employeeId: 'EMP-002',
        employeeName: 'Tanmoy Roy',
        date: new Date().toISOString().split('T')[0],
        checkIn: '09:28 AM',
        status: 'present',
      },
      {
        id: 'att-3',
        employeeId: 'EMP-003',
        employeeName: 'Priya Sen',
        date: new Date().toISOString().split('T')[0],
        checkIn: '09:05 AM',
        status: 'present',
      },
    ];
  });

  const [salarySlips, setSalarySlips] = useState<SalarySlip[]>(() => {
    const saved = localStorage.getItem('udecs_salary_slips');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'SLIP-202608-001',
        employeeId: 'EMP-002',
        employeeName: 'Tanmoy Roy',
        role: 'Store & Logistics Manager',
        month: 'August',
        year: 2026,
        baseSalary: 45000,
        hra: 13500,
        specialAllowance: 4500,
        grossSalary: 63000,
        pfDeduction: 1800,
        esiDeduction: 472,
        tdsDeduction: 2000,
        totalDeductions: 4272,
        netSalary: 58728,
        paymentStatus: 'paid',
        generatedAt: '2026-08-31T17:00:00Z',
      },
    ];
  });

  const [notifications, setNotifications] = useState<NotificationLog[]>(() => {
    const saved = localStorage.getItem('udecs_notifications');
    const existing: NotificationLog[] = saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
    return existing.map((notification) =>
      notification.channel === 'whatsapp' && notification.status === 'sent'
        ? { ...notification, status: 'failed' }
        : notification
    );
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('udecs_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [tasks, setTasks] = useState<TeamTask[]>(() => {
    const saved = localStorage.getItem('udecs_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });

  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string } | null>(null);

  const [collabDoc, setCollabDoc] = useState<{ content: string; lastModified: string; updatedBy: string }>(() => {
    const saved = localStorage.getItem('udecs_collab_doc');
    return saved
      ? JSON.parse(saved)
      : {
          content: `UD-LOGISTICS-DAILY-MANIFEST (udecs.store):
- 10:00 AM: Dispatch 14x Kitchenware cartons via Delhivery Surface.
- 01:30 PM: Container clearance at Kolkata ICD depot for B2B sports stock.
- 04:00 PM: GST reconciliation with PayU settlement report.
- Active Gate: Warehouse Bay 2, Pratappur, Panskura Hub.`,
          lastModified: new Date().toISOString(),
          updatedBy: 'SK Saharuk Hossain (Super Admin)',
        };
  });

  useEffect(() => {
    localStorage.setItem('udecs_collab_doc', JSON.stringify(collabDoc));
  }, [collabDoc]);

  const login = (_email: string, _pass: string): boolean => false;

  const logout = () => {
    if (currentUser) {
      logAction('USER_LOGOUT', `User ${currentUser.name} signed out`);
    }
    setCurrentUser(null);
    setUserRole('customer');
  };

  const updateProductStock = (productId: string, stock: number) => {
    updateProduct(productId, { stock });
    const prod = products.find((p) => p.id === productId);
    logAction('STOCK_ADJUSTED', `SKU ${prod?.sku || productId} stock updated to ${stock} units`);
  };

  const addAuditLog = (log: { action: string; module?: string; details: string; user?: string; role?: UserRole }) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      user: log.user || currentUser?.name || 'System Admin',
      userName: log.user || currentUser?.name || 'System Admin',
      role: log.role || (currentUser?.role as any) || 'admin',
      userRole: log.role || (currentUser?.role as any) || 'admin',
      action: log.action,
      module: log.module || 'SYSTEM',
      details: log.details,
      ip: '192.168.1.104',
      ipAddress: '192.168.1.104',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
    saveAuditLogInFirestore(newLog).catch((err) => console.warn('Firestore auditLog save error:', err));
  };

  const sendNotification = (type: any, recipient: string, subject: string, message: string) => {
    const channel = type === 'email' || type === 'whatsapp' ? type : 'sms';
    const fullNotif: NotificationLog = {
      id: `NOTIF-${Date.now()}`,
      type: type === 'sms' ? 'sms' : type === 'email' ? 'email' : 'custom',
      channel,
      recipient,
      subject,
      message,
      body: message,
      status: 'sent',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setNotifications((prev) => [fullNotif, ...prev]);
    logAction(
      'NOTIFICATION_DISPATCHED',
      type === 'whatsapp'
        ? `Meta accepted WhatsApp request for ${recipient}; delivery unconfirmed: ${subject}`
        : `Sent ${type.toUpperCase()} to ${recipient}: ${subject}`
    );
  };

  const updateCollabDoc = (content: string) => {
    setCollabDoc({
      content,
      lastModified: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Team Member',
    });
  };

  const addCollabTask = (task: { title: string; assignedTo: string; priority: any; status: any }) => {
    addTask({
      title: task.title,
      assignedTo: task.assignedTo,
      priority: task.priority,
      status: task.status,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    });
  };

  const updateCollabTaskStatus = (taskId: string, status: any) => {
    updateTaskStatus(taskId, status);
  };

  const markAttendance = (empId: string, date: string, status: any) => {
    const emp = employees.find((e) => e.id === empId);
    setAttendance((prev) => {
      const exists = prev.find((a) => a.employeeId === empId && a.date === date);
      if (exists) {
        return prev.map((a) =>
          a.employeeId === empId && a.date === date ? { ...a, status } : a
        );
      }
      const newRec: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId: empId,
        employeeName: emp?.name || empId,
        date,
        checkIn: '09:00 AM',
        status,
      };
      return [newRec, ...prev];
    });
    logAction('ATTENDANCE_RECORDED', `Marked ${emp?.name || empId} as ${status} for ${date}`);
  };

  const [payuConfig, setPayuConfig] = useState<PayUConfig>(() => {
    const saved = localStorage.getItem('udecs_payu_config');
    return saved
      ? JSON.parse(saved)
      : {
          merchantKey: '7rnFly', // Standard PayU Test Key
          merchantSalt: 'pjHBVeUY',
          testMode: true,
          successUrl: 'https://udecs.store/payment/success',
          failureUrl: 'https://udecs.store/payment/failure',
        };
  });

  // Local storage sync
  useEffect(() => {
    localStorage.setItem('udecs_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('udecs_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('udecs_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('udecs_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('udecs_attendance', JSON.stringify(attendance));
  }, [attendance]);

  useEffect(() => {
    localStorage.setItem('udecs_salary_slips', JSON.stringify(salarySlips));
  }, [salarySlips]);

  useEffect(() => {
    localStorage.setItem('udecs_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('udecs_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('udecs_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('udecs_payu_config', JSON.stringify(payuConfig));
  }, [payuConfig]);

  // Online / Offline tracking
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Firebase Firestore & Authentication Bootstrapper
  useEffect(() => {
    // 1. Connection check
    testConnection().then((connected) => {
      setIsFirebaseConnected(connected);
    });

    // 2. Firebase Auth Listener
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        const userEmail = user.email?.toLowerCase() || '';
        const isAdmin = ADMIN_EMAILS.includes(userEmail);
        const employee = employees.find((entry) => entry.email.toLowerCase() === userEmail);
        if (!isAdmin && !employee) {
          setCurrentUser(null);
          setUserRole('customer');
          void logOutFirebase().catch((error) => console.error('Unauthorized Firebase sign-in could not be closed:', error));
          return;
        }
        setCurrentUser({
          name: user.displayName || user.email?.split('@')[0] || 'Store Staff',
          email: user.email || '',
          role: isAdmin ? 'admin' : employee!.role,
        });
        setUserRole(isAdmin ? 'admin' : employee!.role);
        logAction('FIREBASE_AUTH', `Authenticated as ${user.email} (${isAdmin ? 'Admin' : 'Staff'})`);
      } else {
        setCurrentUser(null);
        setUserRole('customer');
      }
    });

    // 3. Load Remote Company & Site Texts from Firestore
    fetchCompanyFromFirestore().then((fbCompany) => {
      if (fbCompany) {
        setCompany((prev) => ({ ...prev, ...fbCompany }));
      }
    }).catch((err) => {
      console.warn('Firestore company load fallback:', err);
    });

    fetchSiteContentFromFirestore().then((fbContent) => {
      if (fbContent) {
        setSiteContent((prev) => ({ ...prev, ...fbContent }));
      }
    }).catch((err) => {
      console.warn('Firestore siteContent load fallback:', err);
    });

    // 4. Products Sync & Bootstrapping
    fetchProductsFromFirestore().then((fbProducts) => {
      if (fbProducts && fbProducts.length > 0) {
        setProducts(fbProducts);
      } else {
        // First time provisioning: seed initial catalog to Firestore
        INITIAL_PRODUCTS.forEach((prod) => {
          saveProductToFirestore(prod).catch(() => {});
        });
      }
    }).catch((err) => {
      console.warn('Firestore products load fallback:', err);
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Translation helper
  const t = (key: keyof typeof TRANSLATIONS['bn']): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.bn;
    return dict[key] || TRANSLATIONS.en[key] || key;
  };

  // Price formatting helper
  const formatPrice = (amountInINR: number): string => {
    const curr = CURRENCY_INFO[currency] || CURRENCY_INFO.INR;
    const converted = amountInINR * curr.rate;
    if (currency === 'INR') {
      return `₹${Math.round(converted).toLocaleString('en-IN')}`;
    }
    return `${curr.symbol}${converted.toFixed(2)}`;
  };

  // Audit log helper
  const logAction = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `LOG-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: userRole === 'customer' ? 'Customer' : `Staff (${userRole.toUpperCase()})`,
      role: userRole,
      action,
      details,
      ip: '192.168.1.' + Math.floor(Math.random() * 80 + 10),
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  // Cart actions
  const addToCart = (product: Product, quantity = 1, isWholesale = false) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity, isWholesale: isWholesale || item.isWholesale }
            : item
        );
      }
      return [...prev, { product, quantity, isWholesale }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const unitPrice =
      item.isWholesale || item.quantity >= item.product.minWholesaleQty
        ? item.product.wholesalePrice
        : item.product.price;
    return sum + unitPrice * item.quantity;
  }, 0);

  // Product & Inventory actions
  const addProduct = (newProdData: Omit<Product, 'id'>) => {
    const newProd: Product = {
      ...newProdData,
      id: `prod-${Date.now().toString().slice(-6)}`,
    };
    setProducts((prev) => [newProd, ...prev]);
    saveProductToFirestore(newProd).catch((err) => console.warn('Firestore add product sync error:', err));
    logAction('PRODUCT_ADDED', `Added product ${newProd.name} (SKU: ${newProd.sku}) with stock ${newProd.stock}`);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => {
      const updatedList = prev.map((p) => (p.id === id ? { ...p, ...updates } : p));
      const target = updatedList.find((p) => p.id === id);
      if (target) {
        saveProductToFirestore(target).catch((err) => console.warn('Firestore update product sync error:', err));
      }
      return updatedList;
    });
    logAction('PRODUCT_UPDATED', `Updated product ${id} with changes: ${Object.keys(updates).join(', ')}`);
  };

  const deleteProduct = (id: string) => {
    const target = products.find((p) => p.id === id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    deleteProductFromFirestore(id).catch((err) => console.warn('Firestore delete product error:', err));
    logAction('PRODUCT_DELETED', `Deleted product ${target?.name || id}`);
  };

  // Order actions
  const createOrder = (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Order => {
    const orderId = `UDECS-ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const newOrder: Order = {
      ...orderData,
      id: orderId,
      createdAt: now,
      updatedAt: now,
    };

    // Deduct inventory automatically!
    setProducts((prev) =>
      prev.map((prod) => {
        const orderedItem = newOrder.items.find((item) => item.productId === prod.id);
        if (orderedItem) {
          const newStock = Math.max(0, prod.stock - orderedItem.quantity);
          // Check if low stock triggered
          if (newStock <= prod.minStockAlert) {
            const notif: NotificationLog = {
              id: `NOTIF-${Date.now()}`,
              type: 'low_stock',
              channel: 'whatsapp',
              recipient: COMPANY_DETAILS.whatsapp,
              subject: `Low Stock Alert: ${prod.sku}`,
              message: `Automatic alert: Product ${prod.name} (${prod.sku}) is down to ${newStock} units. Minimum alert threshold: ${prod.minStockAlert}.`,
              status: 'sent',
              timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            };
            setNotifications((n) => [notif, ...n]);
          }
          const updatedProd = { ...prod, stock: newStock };
          saveProductToFirestore(updatedProd).catch(() => {});
          return updatedProd;
        }
        return prod;
      })
    );

    setOrders((prev) => [newOrder, ...prev]);
    saveOrderToFirestore(newOrder).catch((err) => console.warn('Firestore order save error:', err));
    clearCart();

    // 1. Send Email & SMS confirmation notifications
    const emailNotif: NotificationLog = {
      id: `NOTIF-${Date.now()}-1`,
      type: 'order_placed',
      channel: 'email',
      recipient: newOrder.customerEmail,
      subject: `Order Confirmed: ${newOrder.id} - UNICK DIGITAL`,
      message: `Thank you for shopping at udecs.store! Your order of ₹${newOrder.totalAmount.toLocaleString()} has been placed successfully via ${newOrder.paymentMethod.toUpperCase()}. Tax Invoice is ready.`,
      status: 'sent',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    const smsNotif: NotificationLog = {
      id: `NOTIF-${Date.now()}-2`,
      type: 'order_placed',
      channel: 'sms',
      recipient: newOrder.customerPhone,
      subject: 'Order SMS confirmation',
      message: `UNICK DIGITAL: Order #${newOrder.id} confirmed! Amount: ₹${newOrder.totalAmount}. Track live at udecs.store/track. Support: +91 9845485437`,
      status: 'sent',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    const newNotifs: NotificationLog[] = [emailNotif, smsNotif];

    // 2. WhatsApp Automation Trigger (Order Confirmation to Customer & Alert to Owner)
    if (whatsappConfig.isActive && whatsappConfig.autoSendOnOrderPlaced) {
      const waMsg = buildOrderPlacedMessage(newOrder, whatsappConfig, language === 'bn' ? 'bn' : 'en');
      void sendAutomatedWhatsAppApi({
        to: newOrder.customerPhone,
        message: waMsg,
        templateType: 'orderPlaced',
        orderId: newOrder.id,
        customerName: newOrder.customerName,
      }).catch((err) => console.warn('WhatsApp order confirmation was not sent:', err));
    }

    setNotifications((n) => [...newNotifs, ...n]);
    logAction('ORDER_CREATED', `Order ${orderId} created for ${newOrder.customerName}. Total: ₹${newOrder.totalAmount}`);

    return newOrder;
  };

  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    trackingNumber?: string,
    courierName?: string
  ) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          const updated = {
            ...ord,
            orderStatus: status,
            trackingNumber: trackingNumber || ord.trackingNumber,
            courierName: courierName || ord.courierName,
            updatedAt: new Date().toISOString(),
          };

          const statusNotifs: NotificationLog[] = [];

          // If shipped, dispatch SMS & automated WhatsApp
          if (status === 'shipped') {
            const shipNotif: NotificationLog = {
              id: `NOTIF-SHIP-${Date.now()}`,
              type: 'order_shipped',
              channel: 'sms',
              recipient: ord.customerPhone,
              subject: 'Shipment Alert',
              message: `UNICK DIGITAL: Your order ${ord.id} has been dispatched via ${updated.courierName || 'Expedited Surface Cargo'} with Tracking AWB: ${updated.trackingNumber}.`,
              status: 'sent',
              timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            };
            statusNotifs.push(shipNotif);

            // WhatsApp Automation on Dispatch
            if (whatsappConfig.isActive && whatsappConfig.autoSendOnOrderShipped) {
              const waShipMsg = buildOrderShippedMessage(updated, whatsappConfig, language === 'bn' ? 'bn' : 'en');
              void sendAutomatedWhatsAppApi({
                to: ord.customerPhone,
                message: waShipMsg,
                templateType: 'orderShipped',
                orderId: ord.id,
                customerName: ord.customerName,
              }).catch((err) => console.warn('WhatsApp shipment update was not sent:', err));
            }
          }

          // If delivered, dispatch automated WhatsApp
          if (status === 'delivered') {
            if (whatsappConfig.isActive && whatsappConfig.autoSendOnOrderDelivered) {
              const waDelivMsg = buildOrderDeliveredMessage(updated, whatsappConfig, language === 'bn' ? 'bn' : 'en');
              void sendAutomatedWhatsAppApi({
                to: ord.customerPhone,
                message: waDelivMsg,
                templateType: 'orderDelivered',
                orderId: ord.id,
                customerName: ord.customerName,
              }).catch((err) => console.warn('WhatsApp delivery update was not sent:', err));
            }
          }

          if (statusNotifs.length > 0) {
            setNotifications((n) => [...statusNotifs, ...n]);
          }

          updateOrderStatusInFirestore(orderId, status, trackingNumber, courierName).catch((err) =>
            console.warn('Firestore update order status error:', err)
          );

          return updated;
        }
        return ord;
      })
    );
    logAction('ORDER_STATUS_CHANGED', `Order ${orderId} updated to ${status}. Courier: ${courierName || 'N/A'}`);
  };

  const getOrderById = (orderId: string) => {
    return orders.find(
      (o) =>
        o.id.toLowerCase() === orderId.trim().toLowerCase() ||
        o.customerPhone.includes(orderId.trim())
    );
  };

  // HR & Employee actions
  const addEmployee = (empData: Omit<Employee, 'id'>) => {
    const newEmp: Employee = {
      ...empData,
      id: `EMP-00${employees.length + 1}`,
    };
    setEmployees((prev) => [...prev, newEmp]);
    logAction('EMPLOYEE_ONBOARDED', `Staff ${newEmp.name} enrolled in ${newEmp.department} as ${newEmp.role}`);
  };

  const recordAttendance = (empId: string, status: AttendanceRecord['status'], notes?: string) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return;
    const today = new Date().toISOString().split('T')[0];
    const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    setAttendance((prev) => {
      const existing = prev.find((a) => a.employeeId === empId && a.date === today);
      if (existing) {
        return prev.map((a) =>
          a.id === existing.id
            ? { ...a, checkOut: nowTime, status, notes: notes || a.notes }
            : a
        );
      }
      const newRecord: AttendanceRecord = {
        id: `att-${Date.now()}`,
        employeeId: empId,
        employeeName: emp.name,
        date: today,
        checkIn: nowTime,
        status,
        notes,
      };
      return [newRecord, ...prev];
    });

    logAction('ATTENDANCE_LOGGED', `Attendance recorded for ${emp.name}: ${status}`);
  };

  const generateSalarySlip = (
    empId: string,
    month: string,
    yearOrWorkingDays?: any,
    presentDaysParam?: number
  ): SalarySlip => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) throw new Error('Employee not found');

    const year = typeof yearOrWorkingDays === 'number' && yearOrWorkingDays > 2000 ? yearOrWorkingDays : 2026;
    const workingDays = typeof yearOrWorkingDays === 'number' && yearOrWorkingDays <= 31 ? yearOrWorkingDays : 30;
    const presentDays = presentDaysParam !== undefined ? presentDaysParam : 26;

    const base = emp.baseSalary;
    const hra = Math.round(base * 0.3); // 30% HRA
    const da = Math.round(base * 0.1); // 10% DA
    const specialAllowance = Math.round(base * 0.1); // 10%
    const gross = base + hra + da + specialAllowance;

    const pf = Math.min(1800, Math.round(base * 0.12));
    const esi = gross < 21000 ? Math.round(gross * 0.0075) : 0;
    const tds = gross > 50000 ? Math.round(gross * 0.05) : 200;
    const totalDeductions = pf + esi + tds;
    const net = gross - totalDeductions;

    const slip: SalarySlip = {
      id: `SLIP-${year}${month.toUpperCase().slice(0, 3)}-${emp.id}`,
      employeeId: emp.id,
      employeeCode: emp.employeeCode || emp.id,
      employeeName: emp.name,
      designation: emp.designation || emp.role,
      role: emp.role,
      month,
      year,
      baseSalary: base,
      basicSalary: base,
      hra,
      da,
      specialAllowance,
      grossSalary: gross,
      pfDeduction: pf,
      esiDeduction: esi,
      tdsDeduction: tds,
      taxDeduction: tds,
      totalDeductions,
      netSalary: net,
      workingDays,
      presentDays,
      paymentStatus: 'paid',
      generatedAt: new Date().toISOString(),
    };

    setSalarySlips((prev) => {
      const existing = prev.findIndex(
        (s) => s.employeeId === empId && s.month === month
      );
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = slip;
        return copy;
      }
      return [slip, ...prev];
    });

    logAction(
      'SALARY_SLIP_GENERATED',
      `Generated salary slip for ${emp.name} (${month} ${year}): Net ₹${net.toLocaleString()}`
    );
    return slip;
  };

  // Collaboration tasks
  const addTask = (taskData: Omit<TeamTask, 'id' | 'comments'>) => {
    const newTask: TeamTask = {
      ...taskData,
      id: `TASK-${Date.now().toString().slice(-4)}`,
      comments: [],
    };
    setTasks((prev) => [newTask, ...prev]);
    logAction('TASK_CREATED', `Task created: "${newTask.title}" assigned to ${newTask.assignedTo}`);
  };

  const updateTaskStatus = (taskId: string, status: TeamTask['status']) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    logAction('TASK_STATUS_CHANGED', `Task ${taskId} moved to ${status}`);
  };

  const addTaskComment = (taskId: string, author: string, text: string) => {
    const nowTime = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          return {
            ...t,
            comments: [
              ...(t.comments || []),
              {
                id: `c-${Date.now()}`,
                author,
                text,
                timestamp: nowTime,
              },
            ],
          };
        }
        return t;
      })
    );
  };

  const sendManualNotification = (notif: Omit<NotificationLog, 'id' | 'timestamp'>) => {
    const fullNotif: NotificationLog = {
      ...notif,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setNotifications((prev) => [fullNotif, ...prev]);
    logAction('NOTIFICATION_DISPATCHED', `Sent ${notif.channel.toUpperCase()} to ${notif.recipient}: ${notif.subject}`);
  };

  const updatePayUConfig = (configUpdates: Partial<PayUConfig>) => {
    setPayuConfig((prev) => ({ ...prev, ...configUpdates }));
    logAction('PAYU_CONFIG_UPDATED', `Updated PayU gateway parameters. Test Mode: ${configUpdates.testMode ?? payuConfig.testMode}`);
  };

  const signInWithGoogleAuth = async () => {
    try {
      const user = await signInWithGoogle();
      if (user) {
        setFirebaseUser(user);
        const userEmail = user.email?.toLowerCase() || '';
        const isAdmin = ADMIN_EMAILS.includes(userEmail);
        const employee = employees.find((entry) => entry.email.toLowerCase() === userEmail);
        if (!isAdmin && !employee) {
          await logOutFirebase();
          setFirebaseUser(null);
          throw new Error('This Google account is not authorized for staff access.');
        }
        const staffUser = {
          name: user.displayName || user.email?.split('@')[0] || 'Store Staff',
          email: user.email || '',
          role: isAdmin ? 'admin' : employee!.role,
        };
        setCurrentUser(staffUser);
        setUserRole(isAdmin ? 'admin' : employee!.role);
        logAction('FIREBASE_GOOGLE_LOGIN', `Logged in with Google: ${user.email}`);
      }
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      throw err;
    }
  };

  const signOutFirebaseAuth = async () => {
    try {
      await logOutFirebase();
      setFirebaseUser(null);
      logout();
      logAction('FIREBASE_LOGOUT', 'User signed out from Firebase Auth');
    } catch (err) {
      console.error('Firebase Sign-Out Error:', err);
      throw err;
    }
  };

  const submitWholesaleInquiry = async (inquiryData: {
    businessName: string;
    contactPerson: string;
    phone: string;
    email?: string;
    category?: string;
    estVolume?: string;
    notes?: string;
  }): Promise<string> => {
    const id = await submitInquiryToFirestore(inquiryData);
    addAuditLog({
      action: 'B2B_WHOLESALE_INQUIRY',
      module: 'ORDERS',
      details: `Received quotation request from ${inquiryData.businessName} (${inquiryData.contactPerson}, Phone: ${inquiryData.phone})`,
    });
    return id;
  };

  return (
  <StoreContext.Provider
    value={{
      company,
      updateCompany,
      siteContent,
      updateSiteContent,
      language,
      setLanguage,
        currency,
        setCurrency,
        userRole,
        setUserRole,
        currentUser,
        login,
        logout,
        products,
        cart,
        orders,
        employees,
        attendance,
        salarySlips,
        notifications,
        auditLogs,
        tasks,
        collabTasks: tasks,
        collabDoc,
        updateCollabDoc,
        addCollabTask,
        updateCollabTaskStatus,
        payuConfig,
        isOffline,
        t,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        cartCount,
        cartSubtotal,
        addProduct,
        updateProduct,
        updateProductStock,
        deleteProduct,
        createOrder,
        updateOrderStatus,
        getOrderById,
        addEmployee,
        recordAttendance,
        markAttendance,
        generateSalarySlip,
        addTask,
        updateTaskStatus,
        addTaskComment,
        logAction,
        addAuditLog,
        sendManualNotification,
        sendNotification,
        updatePayUConfig,
        formatPrice,
        whatsappConfig,
        updateWhatsAppConfig,
        isFirebaseConnected,
        firebaseUser,
        signInWithGoogleAuth,
        signOutFirebaseAuth,
        submitWholesaleInquiry,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
