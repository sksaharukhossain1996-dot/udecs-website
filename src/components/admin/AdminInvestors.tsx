import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
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
  token?: string;
  createdAt?: any;
}

export const AdminInvestors: React.FC = () => {
  const [leads, setLeads] = useState<InvestorLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
