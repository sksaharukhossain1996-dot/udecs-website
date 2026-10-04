import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { readRecentRfqs, Rfq } from '../../firebase/rfqService';

export const AdminRfqInbox: React.FC = () => {
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const authGeneration = useRef(0);
  const load = async () => {
    const generation = authGeneration.current;
    setLoading(true); setError('');
    try { const data = await readRecentRfqs(); if (generation === authGeneration.current) setRows(data); }
    catch { if (generation === authGeneration.current) setError('RFQs could not be read. Check owner Google sign-in, database permissions and quota. No empty inbox is assumed.'); }
    finally { if (generation === authGeneration.current) setLoading(false); }
  };
  useEffect(() => onAuthStateChanged(auth, user => {
    const ok = !!user?.emailVerified && ['sksaharukhossain1996@gmail.com','ecommerceunickdigital@gmail.com'].includes(user.email?.toLowerCase() || '');
    authGeneration.current += 1; setAllowed(ok); setRows([]); setError(''); setLoading(false);
    if (ok) void load();
  }), []);
  if (!allowed) return <div className="rounded-xl border p-6"><h2 className="text-xl font-bold">B2B Wholesale Inquiry</h2><p className="mt-3 text-sm">Sign in with a verified owner Google account to view customer details.</p></div>;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">B2B Wholesale Inquiry</h2><p className="mt-1 text-sm text-slate-600">Latest 50 saved requests. Read-only. No email alerts or automatic quotations.</p></div><button disabled={loading} onClick={load} className="rounded bg-[#233f66] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Loading...' : 'Refresh'}</button></div>
    {error && <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {!loading && !error && rows.length === 0 && <p className="rounded border bg-white p-5 text-sm">No saved RFQs found.</p>}
    <div className="grid gap-4">{rows.map(row => <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="text-lg font-bold">{row.businessName}</h3><span className="rounded bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">{row.status || 'Unknown status'}</span></div>
      <div className="mt-1 break-all font-mono text-xs text-slate-500">{row.id}</div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">{[['Contact',row.contactPerson],['Phone',row.phone],['Email',row.email || 'Not supplied'],['Product category',row.category || 'Not supplied'],['Estimated volume',row.estVolume || 'Not supplied'],['Submitted',row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST' : 'Unknown']].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl>
      <div className="mt-4 border-t pt-3 text-sm"><p className="text-xs text-slate-500">Selected products</p><ul className="mt-1 space-y-1">{Array.isArray(row.selectedProducts) && row.selectedProducts.length ? row.selectedProducts.map(p => <li key={p.id}>{p.name} <span className="font-mono text-xs text-slate-500">{p.sku} · {p.id}</span></li>) : <li>No product choices supplied</li>}</ul></div>
      <div className="mt-4 border-t pt-3 text-sm"><p className="text-xs text-slate-500">Requirements / notes</p><p className="mt-1 whitespace-pre-wrap break-words">{row.notes || 'No notes supplied'}</p></div>
    </article>)}</div>
  </section>;
};
