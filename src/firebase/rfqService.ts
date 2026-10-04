import { collection, doc, getDocsFromServer, limit, orderBy, query, setDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
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

function requireOwner(): string {
  const u = auth.currentUser;
  if (!u?.emailVerified || !['sksaharukhossain1996@gmail.com','ecommerceunickdigital@gmail.com'].includes(u.email?.toLowerCase() || '')) throw new Error('Verified owner sign-in required.');
  return u.uid;
}
export async function addOwnerRfq(id: string, input: RfqInput, createdAt: string): Promise<void> {
  const uid = requireOwner();
  const audit = doc(collection(db, 'auditLogs'));
  await runTransaction(db, async tx => {
    const ref = doc(db, 'inquiries', id);
    const old = await tx.get(ref);
    if (old.exists()) {
      if (old.data().createdBy === uid && old.data().createdAt === createdAt) return;
      throw new Error('Lead ID already exists. Refresh before retrying.');
    }
    tx.set(ref, { ...input, gstin:'', status:'new', createdAt, createdBy:uid });
    tx.set(audit, {action:'B2B_LEAD_ADDED',details:`Added lead ${id}`,userId:uid,timestamp:serverTimestamp()});
  });
}
export async function archiveOwnerRfq(row: Rfq): Promise<void> {
  const uid = requireOwner();
  const audit = doc(collection(db, 'auditLogs'));
  await runTransaction(db, async tx => {
    const ref = doc(db, 'inquiries', row.id);
    const old = await tx.get(ref);
    if (!old.exists()) throw new Error('Lead no longer exists. Refresh the list.');
    const data = old.data();
    if (data.status === 'archived') throw new Error('Lead was already archived. Refresh the list.');
    for (const key of ['businessName','contactPerson','phone','email','category','estVolume','notes','status','createdAt'] as const) {
      if ((data[key] ?? '') !== (row[key] ?? '')) throw new Error('Lead changed since you opened it. Refresh and confirm again.');
    }
    tx.update(ref,{status:'archived',archivedBy:uid,archivedAt:serverTimestamp()});
    tx.set(audit,{action:'B2B_LEAD_ARCHIVED',details:`Archived lead ${row.id}; original details retained`,userId:uid,timestamp:serverTimestamp()});
  });
}
