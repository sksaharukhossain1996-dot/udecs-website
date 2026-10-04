import { collection, doc, getDocsFromServer, limit, orderBy, query, setDoc } from 'firebase/firestore';
import { auth, db } from './config';

export interface Rfq {
  id: string; businessName: string; contactPerson: string; phone: string; email: string;
  selectedProducts: {id: string; sku: string; name: string}[];
  category: string; estVolume: string; notes: string; status: string; createdAt: string;
}
export type RfqInput = Omit<Rfq, 'id' | 'status' | 'createdAt'>;
export async function saveRfq(id: string, input: RfqInput, createdAt: string): Promise<string> {
  // The same document ID is reused on manual retry. Never create a second lead for an uncertain save.
  await setDoc(doc(db, 'inquiries', id), { ...input, gstin: '', status: 'new', createdAt });
  return id;
}
export async function readRecentRfqs(): Promise<Rfq[]> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !['sksaharukhossain1996@gmail.com', 'ecommerceunickdigital@gmail.com'].includes(user.email?.toLowerCase() || '')) {
    throw new Error('Owner Google sign-in is required.');
  }
  const result = await getDocsFromServer(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'), limit(50)));
  return result.docs.map(item => ({ ...item.data(), id: item.id } as Rfq));
}
