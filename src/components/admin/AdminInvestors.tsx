import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp, orderBy, query } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { TrendingUp, CheckCircle, Copy, RefreshCw } from 'lucide-react';

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
  token?: string;
  createdAt?: any;
}

const newToken = () => {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const AdminInvestors: React.FC = () => {
  const [leads, setLeads] = useState<InvestorLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(query(collection(db, 'investorLeads'), orderBy('createdAt', 'desc')));
      setLeads(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    } catch (e: any) {
      setError(e?.message || 'Could not load investor leads.');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (lead: InvestorLead) => {
    const token = newToken();
    await setDoc(doc(db, 'deckTokens', token), {
      approved: true,
      leadId: lead.id,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'investorLeads', lead.id), { approved: true, token });
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, approved: true, token } : l)));
  };

  const linkFor = (token: string) => `https://udecs.store/deck.html?t=${token}`;

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
      {error && <p className="text-sm text-[#B3261E]">{error}</p>}
      {loading ? (
        <p className="text-sm text-[#4a5548]">Loading...</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-[#4a5548]">No investor leads yet. Form: udecs.store/invest.html</p>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white border border-[#CBCFB9] rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#0F1913]">{lead.name} - {lead.company}</p>
                  <p className="text-sm text-[#4a5548]">{lead.email} | {lead.phone} | {lead.city}</p>
                  <p className="text-sm mt-1"><span className="font-bold">Interest:</span> {lead.amount}</p>
                  {lead.message && <p className="text-sm mt-1 italic">"{lead.message}"</p>}
                </div>
                {lead.approved ? (
                  <span className="flex items-center gap-1 text-green-700 text-sm font-bold shrink-0">
                    <CheckCircle size={16} /> Approved
                  </span>
                ) : (
                  <button
                    onClick={() => approve(lead)}
                    className="px-3 py-2 bg-green-700 text-white rounded-lg text-sm font-bold shrink-0"
                  >
                    Approve
                  </button>
                )}
              </div>
              {lead.approved && lead.token && (
                <div className="mt-3 flex items-center gap-2 bg-[#FBFAF5] border border-[#CBCFB9] rounded-lg p-2">
                  <code className="text-xs flex-1 break-all">{linkFor(lead.token)}</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText(linkFor(lead.token!)); setCopied(lead.id); setTimeout(() => setCopied(''), 1500); }}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-[#0F1913] text-white rounded"
                  >
                    <Copy size={12} /> {copied === lead.id ? 'Copied' : 'Copy link'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
