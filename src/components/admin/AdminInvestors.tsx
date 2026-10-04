import React, { useEffect, useState, useRef } from 'react';
import { collection, getDocsFromServer, orderBy, query } from 'firebase/firestore';
import { createInvestorLead, archiveInvestorLead, owner } from '../../business/service';
import { db } from '../../firebase/config';
import { TrendingUp, RefreshCw } from 'lucide-react';

interface InvestorLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  amount: string;
  message: string;
  approved: boolean;
  archived?: boolean;
  token?: string;
  createdAt?: any;
}

export const AdminInvestors: React.FC = () => {
  const [leads, setLeads] = useState<InvestorLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const empty={name:'',company:'',email:'',phone:'',city:'',amount:'',message:''};
  const [form,setForm]=useState(empty),[adding,setAdding]=useState(false),[busy,setBusy]=useState(false),[remove,setRemove]=useState<InvestorLead|null>(null),[typed,setTyped]=useState(''),[showArchived,setShowArchived]=useState(false);
  const pending=useRef<{id:string;createdAt:string;input:typeof empty}|null>(null);
  async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{owner();if(!pending.current)pending.current={id:'INV-'+crypto.randomUUID(),createdAt:new Date().toISOString(),input:form};const p=pending.current;await createInvestorLead(p.id,p.input,p.createdAt);pending.current=null;setForm(empty);setAdding(false);await load();}catch(e){setError(e instanceof Error?e.message:'Save unverified; retry uses same reference.');}finally{setBusy(false);}}
  async function confirm(){if(!remove||typed!==remove.id)return;setBusy(true);setError('');try{await archiveInvestorLead(remove);setRemove(null);setTyped('');await load();}catch(e){setError(e instanceof Error?e.message:'Archive unverified. Refresh.');}finally{setBusy(false);}}
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      owner();
      const snap = await getDocsFromServer(query(collection(db, 'investorLeads'), orderBy('createdAt', 'desc')));
      setLeads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (e: any) {
      setError(e?.message || 'Could not load investor leads.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#0F1913] flex items-center gap-2">
          <TrendingUp size={22} /> Investor Leads
        </h2>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-[#0F1913] text-white rounded-lg text-sm">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>
      <div className="flex gap-3"><button disabled={busy} onClick={()=>setAdding(!adding)} className="biz-btn">Add Investor Lead</button><label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={showArchived} onChange={e=>setShowArchived(e.target.checked)}/>Show archived leads</label></div>
      {adding&&<form onSubmit={save} className="biz-card space-y-4"><h3 className="font-bold">Add Investor Lead</h3><p className="text-sm">Adds a private lead, not a payment, deck approval or message.</p><div className="grid sm:grid-cols-2 gap-3">{([['name','Name',120],['company','Company',160],['email','Email',120],['phone','Phone',20],['city','City',120],['amount','Investment interest (optional)',60]] as const).map(([k,l,max])=><label key={k}>{l}<input required={k!=='amount'} maxLength={max} disabled={busy||!!pending.current} type={k==='email'?'email':'text'} className="biz-input" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}</div><label className="block">Notes<textarea maxLength={1000} disabled={busy||!!pending.current} className="biz-input" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/></label><div className="flex gap-3"><button disabled={busy} className="biz-btn">{busy?'Saving...':'Save Lead'}</button><button type="button" disabled={busy} onClick={()=>{setAdding(false);pending.current=null;}}>Cancel</button></div></form>}
      {remove&&<div role="dialog" aria-label="Confirm investor lead deletion" className="biz-card bg-red-50 border-red-300 space-y-3"><h3 className="font-bold">Delete lead: {remove.name} - {remove.company}?</h3><p>Archives this lead and records who deleted it. Original details and any existing deck approval remain. It does not revoke a deck token.</p><label className="block">Type lead ID: <strong>{remove.id}</strong><input className="biz-input" value={typed} onChange={e=>setTyped(e.target.value)}/></label><button disabled={busy||typed!==remove.id} className="biz-btn disabled:opacity-40" onClick={confirm}>Confirm Delete</button><button disabled={busy} onClick={()=>{setRemove(null);setTyped('');}}>Cancel</button></div>}
      {error && <p className="text-sm text-[#B3261E]">{error}</p>}
      {loading ? (
        <p className="text-sm text-[#4a5548]">Loading...</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-[#4a5548]">No investor leads yet. Form: udecs.store/invest.html</p>
      ) : (
        <div className="space-y-3">
          {leads.filter(lead=>showArchived||!lead.archived).map((lead) => (
            <div key={lead.id} className="bg-white border border-[#CBCFB9] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#0F1913]">{lead.name} - {lead.company}</p>
                  <p className="text-sm text-[#4a5548]">{lead.email} | {lead.phone} | {lead.city}</p>
                  <p className="text-sm mt-1"><span className="font-bold">Interest:</span> {lead.amount}</p>
                  {lead.message && <p className="text-sm mt-1 italic">"{lead.message}"</p>}
                </div>
              </div>
              {lead.archived?<p className="text-sm mt-3">Archived (details retained)</p>:<button disabled={busy} className="mt-3 border border-red-300 rounded px-3 py-2 text-sm text-red-700" onClick={()=>{setRemove(lead);setTyped('');}}>Delete Lead</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
