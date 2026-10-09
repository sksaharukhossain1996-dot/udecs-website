import React, { useEffect, useState, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { readRecentRfqs, Rfq, RfqInput, addOwnerRfq, archiveOwnerRfq } from '../../firebase/rfqService';

export const AdminRfqInbox: React.FC<{onCreateQuotation?:(row:Rfq)=>void}> = ({onCreateQuotation}) => {
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emptyForm: RfqInput = {businessName:'',contactPerson:'',phone:'',email:'',category:'wholesale',estVolume:'',notes:'',selectedProducts:[]};
  const [form,setForm]=useState<RfqInput>(emptyForm);
  const [adding,setAdding]=useState(false);
  const [busy,setBusy]=useState(false);
  const [pendingDelete,setPendingDelete]=useState<Rfq|null>(null);
  const [confirmId,setConfirmId]=useState('');
  const [showArchived,setShowArchived]=useState(false);
  const pendingSave=useRef<{id:string;createdAt:string;input:RfqInput}|null>(null);
  const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{
    const input={...form,businessName:form.businessName.trim(),contactPerson:form.contactPerson.trim(),phone:form.phone.trim()};
    if(!input.businessName || !input.contactPerson || !input.phone)throw new Error('Business, contact and phone are required.');
    if(!pendingSave.current)pendingSave.current={id:'INQ-'+crypto.randomUUID(),createdAt:new Date().toISOString(),input};
    const p=pendingSave.current;await addOwnerRfq(p.id,p.input,p.createdAt);pendingSave.current=null;setForm(emptyForm);setAdding(false);await load();
  }catch(err){setError(err instanceof Error?err.message:'Save failed. Retry uses the same lead ID.');}finally{setBusy(false);}};
  const remove=async()=>{if(!pendingDelete || confirmId!==pendingDelete.id)return;setBusy(true);setError('');try{await archiveOwnerRfq(pendingDelete);setPendingDelete(null);setConfirmId('');await load();}catch(err){setError(err instanceof Error?err.message:'Delete failed. Refresh to verify status.');}finally{setBusy(false);}};
  const authGeneration = useRef(0);
  const load = async () => {
    const generation = authGeneration.current;
    setLoading(true); setError('');
    try { const data = await readRecentRfqs(); if (generation === authGeneration.current) setRows(data); }
    catch { if (generation === authGeneration.current) setError('RFQs could not be read. Check owner sign-in, database permissions and quota. No empty inbox is assumed.'); }
    finally { if (generation === authGeneration.current) setLoading(false); }
  };
  useEffect(() => onAuthStateChanged(auth, user => {
    const ok = !!user?.emailVerified && ['sksaharukhossain1996@gmail.com','ecommerceunickdigital@gmail.com'].includes(user.email?.toLowerCase() || '');
    authGeneration.current += 1; setAllowed(ok); setAdding(false); setPendingDelete(null); pendingSave.current=null; setRows([]); setError(''); setLoading(false);
    if (ok) void load();
  }), []);
  if (!allowed) return <div className="rounded-xl border p-6"><h2 className="text-xl font-bold">B2B Wholesale Inquiry</h2><p className="mt-3 text-sm">Sign in with a verified owner account to view customer details.</p></div>;
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">B2B Wholesale Inquiry</h2><p className="mt-1 text-sm text-slate-600">Latest 50 saved requests. Delete archives a lead and keeps its details and audit history. No automatic messages or quotations.</p></div><button disabled={loading} onClick={load} className="rounded bg-[#233f66] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Loading...' : 'Refresh'}</button></div>
    <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={()=>setAdding(!adding)} className="rounded bg-[#233f66] px-4 py-2 font-semibold text-white">Add Lead</button><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Show archived leads</label></div>
    {adding && <form onSubmit={save} className="rounded-xl border bg-white p-5 space-y-4"><h3 className="text-lg font-bold">Add Wholesale Lead</h3><p className="text-sm text-slate-600">Creates a lead only, not an order or payment.</p><div className="grid gap-3 sm:grid-cols-2">{([['businessName','Business name',150],['contactPerson','Contact person',100],['phone','Phone',30],['email','Email (optional)',200],['category','Product category',100],['estVolume','Estimated volume',100]] as const).map(([key,label,max])=><label key={key} className="text-sm">{label}<input required={['businessName','contactPerson','phone'].includes(key)} maxLength={max} type={key==='email'?'email':'text'} disabled={busy || !!pendingSave.current} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} className="mt-1 block w-full rounded border p-2"/></label>)}</div><label className="block text-sm">Requirements / notes<textarea maxLength={3000} disabled={busy || !!pendingSave.current} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className="mt-1 block w-full rounded border p-2"/></label><div className="flex gap-3"><button disabled={busy} type="submit" className="rounded bg-[#233f66] px-4 py-2 text-white">{busy?'Saving...':'Save Lead'}</button><button disabled={busy} type="button" onClick={()=>{setAdding(false);setForm(emptyForm);pendingSave.current=null;}}>Cancel</button></div></form>}
    {pendingDelete && <div role="dialog" aria-label="Confirm lead deletion" aria-modal="true" className="rounded-xl border-2 border-red-300 bg-red-50 p-5 space-y-3"><h3 className="font-bold">Delete lead: {pendingDelete.businessName}?</h3><p className="text-sm">Contact: {pendingDelete.contactPerson}, {pendingDelete.phone}. The lead will be archived, not erased. Its details and who deleted it stay recorded.</p><label className="block text-sm">Type this lead ID to confirm: <strong>{pendingDelete.id}</strong><input disabled={busy} value={confirmId} onChange={e=>setConfirmId(e.target.value)} className="mt-2 block w-full rounded border p-2"/></label><div className="flex gap-3"><button disabled={busy || confirmId!==pendingDelete.id} onClick={remove} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">{busy?'Deleting...':'Confirm Delete'}</button><button disabled={busy} onClick={()=>{setPendingDelete(null);setConfirmId('');}}>Cancel</button></div></div>}
    {error && <div role="alert" className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
    {!loading && !error && rows.length === 0 && <p className="rounded border bg-white p-5 text-sm">No saved RFQs found.</p>}
    <div className="grid gap-4">{rows.filter(row=>showArchived || row.status!=='archived').map(row => <article key={row.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap justify-between gap-2"><h3 className="text-lg font-bold">{row.businessName}</h3><span className="rounded bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-800">{row.status || 'Unknown status'}</span></div>
      {row.status!=='archived' && onCreateQuotation && <button className="mt-3 mr-3 rounded border px-3 py-2 text-sm font-semibold" onClick={()=>onCreateQuotation(row)}>Create quotation</button>}
      {row.status!=='archived' && <button disabled={busy} onClick={()=>{setPendingDelete(row);setConfirmId('');}} className="mt-3 rounded border border-red-300 px-3 py-1 text-sm font-semibold text-red-700">Delete Lead</button>}
      <div className="mt-1 break-all font-mono text-xs text-slate-500">{row.id}</div>
      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">{[['Contact',row.contactPerson],['Phone',row.phone],['Email',row.email || 'Not supplied'],['Product category',row.category || 'Not supplied'],['Estimated volume',row.estVolume || 'Not supplied'],['Submitted',row.createdAt ? new Date(row.createdAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST' : 'Unknown']].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 break-words font-medium">{value}</dd></div>)}</dl>
      <div className="mt-4 border-t pt-3 text-sm"><p className="text-xs text-slate-500">Selected products</p><ul className="mt-1 space-y-1">{Array.isArray(row.selectedProducts) && row.selectedProducts.length ? row.selectedProducts.map(p => <li key={p.id}>{p.name} <span className="font-mono text-xs text-slate-500">{p.sku} · {p.id}</span></li>) : <li>No product choices supplied</li>}</ul></div>
      <div className="mt-4 border-t pt-3 text-sm"><p className="text-xs text-slate-500">Requirements / notes</p><p className="mt-1 whitespace-pre-wrap break-words">{row.notes || 'No notes supplied'}</p></div>
    </article>)}</div>
  </section>;
};
