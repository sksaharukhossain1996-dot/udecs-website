import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth, googleProvider } from './config';
import { signInWithPopup, signOut, GoogleAuthProvider, User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from './errors';
import { Product, Order, SiteContent, CompanyInfo, AuditLog } from '../types';
import { setCachedGmailToken, clearGmailToken } from '../services/gmailService';

// Admin bootstrap emails
export const ADMIN_EMAILS = [
  'sksaharukhossain1996@gmail.com',
  'ecommerceunickdigital@gmail.com',
];
export const ADMIN_EMAIL = 'sksaharukhossain1996@gmail.com';

export const isAuthorizedAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

export interface B2BInquiry {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  gstin?: string;
  category?: string;
  estVolume?: string;
  notes?: string;
  status: 'new' | 'contacted' | 'quoted' | 'closed';
  createdAt: string;
}

// -------------------------------------------------------------
// Authentication Helpers
// -------------------------------------------------------------
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      setCachedGmailToken(credential.accessToken);
    }
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function logOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
    clearGmailToken();
  } catch (error) {
    console.error('Firebase Sign-Out Error:', error);
    throw error;
  }
}

// -------------------------------------------------------------
// Products Service
// -------------------------------------------------------------
export async function fetchProductsFromFirestore(): Promise<Product[]> {
  const path = 'products';
  try {
    const querySnapshot = await getDocs(collection(db, path));
    const items: Product[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeToProducts(
  onUpdate: (products: Product[]) => void,
  onError?: (err: any) => void
) {
  const path = 'products';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveProductToFirestore(product: Product): Promise<void> {
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), {
      name: product.name,
      nameBn: product.nameBn || product.name,
      nameHi: product.nameHi || product.name,
      category: product.category,
      sku: product.sku,
      hsn: product.hsn,
      price: Number(product.price),
      wholesalePrice: Number(product.wholesalePrice || 0),
      minWholesaleQty: Number(product.minWholesaleQty || 1),
      stock: Number(product.stock),
      minStockAlert: Number(product.minStockAlert || 5),
      rating: Number(product.rating || 5),
      reviewsCount: Number(product.reviewsCount || 1),
      imageIcon: product.imageIcon || 'i-pot',
      imageUrl: product.imageUrl || '',
      productLink: product.productLink || '',
      description: product.description || '',
      descriptionBn: product.descriptionBn || '',
      gstRate: Number(product.gstRate || 18),
      featured: Boolean(product.featured),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProductFromFirestore(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// -------------------------------------------------------------
// Orders Service
// -------------------------------------------------------------
export async function saveOrderToFirestore(order: Order): Promise<void> {
  const path = `orders/${order.id}`;
  try {
    await setDoc(doc(db, 'orders', order.id), {
      customerName: order.customerName,
      customerEmail: order.customerEmail || '',
      customerPhone: order.customerPhone,
      shippingAddress: order.shippingAddress,
      city: order.city || '',
      state: order.state || '',
      pincode: order.pincode || '',
      gstin: order.gstin || '',
      items: order.items || [],
      subtotal: Number(order.subtotal || 0),
      taxableAmount: Number(order.taxableAmount || 0),
      cgst: Number(order.cgst || 0),
      sgst: Number(order.sgst || 0),
      igst: Number(order.igst || 0),
      totalGst: Number(order.totalGst || 0),
      shippingFee: Number(order.shippingFee || 0),
      totalAmount: Number(order.totalAmount),
      currency: order.currency || 'INR',
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      payuTxnId: order.payuTxnId || '',
      orderStatus: order.orderStatus,
      trackingNumber: order.trackingNumber || '',
      courierName: order.courierName || '',
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateOrderStatusInFirestore(
  orderId: string,
  status: Order['orderStatus'],
  trackingNumber?: string,
  courierName?: string
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    const updates: Record<string, any> = {
      orderStatus: status,
      updatedAt: new Date().toISOString(),
    };
    if (trackingNumber !== undefined) updates.trackingNumber = trackingNumber;
    if (courierName !== undefined) updates.courierName = courierName;
    await updateDoc(doc(db, 'orders', orderId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToOrders(
  onUpdate: (orders: Order[]) => void,
  onError?: (err: any) => void
) {
  const path = 'orders';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Order[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<Order, 'id'>) });
      });
      onUpdate(items);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// -------------------------------------------------------------
// Site Content CMS Service
// -------------------------------------------------------------
export async function fetchSiteContentFromFirestore(): Promise<SiteContent | null> {
  const path = 'siteContent/main';
  try {
    const docSnap = await getDoc(doc(db, 'siteContent', 'main'));
    if (docSnap.exists()) {
      return docSnap.data() as SiteContent;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveSiteContentToFirestore(content: SiteContent): Promise<void> {
  const path = 'siteContent/main';
  try {
    await setDoc(doc(db, 'siteContent', 'main'), {
      ...content,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// Company Info Service
// -------------------------------------------------------------
export async function fetchCompanyFromFirestore(): Promise<CompanyInfo | null> {
  const path = 'company/info';
  try {
    const docSnap = await getDoc(doc(db, 'company', 'info'));
    if (docSnap.exists()) {
      return docSnap.data() as CompanyInfo;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveCompanyToFirestore(info: CompanyInfo): Promise<void> {
  const path = 'company/info';
  try {
    await setDoc(doc(db, 'company', 'info'), {
      ...info,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -------------------------------------------------------------
// Inquiries (B2B Wholesale) Service
// -------------------------------------------------------------
export async function submitInquiryToFirestore(inquiry: Omit<B2BInquiry, 'id' | 'createdAt' | 'status'>): Promise<string> {
  const id = `INQ-${Date.now()}`;
  const path = `inquiries/${id}`;
  try {
    await setDoc(doc(db, 'inquiries', id), {
      businessName: inquiry.businessName,
      contactPerson: inquiry.contactPerson,
      phone: inquiry.phone,
      email: inquiry.email || '',
      gstin: inquiry.gstin || '',
      category: inquiry.category || 'wholesale',
      estVolume: inquiry.estVolume || '',
      notes: inquiry.notes || '',
      status: 'new',
      createdAt: new Date().toISOString(),
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// -------------------------------------------------------------
// Audit Logs Service
// -------------------------------------------------------------
export async function saveAuditLogInFirestore(log: AuditLog): Promise<void> {
  const path = `auditLogs/${log.id}`;
  try {
    await setDoc(doc(db, 'auditLogs', log.id), {
      timestamp: log.timestamp,
      user: log.user,
      role: log.role,
      action: log.action,
      module: log.module || 'SYSTEM',
      details: log.details,
      ip: log.ip || '127.0.0.1',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}
