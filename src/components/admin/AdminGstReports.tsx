import{GstReconciliation}from'../../operations-stage/GstReconciliation';
import{GstInvoiceEntry}from'../../gst-computation-stage/GstInvoiceEntry';
import{GstComputationPanel}from'../../gst-computation-stage/GstComputationPanel';
import{printExport}from'../../lib/exportFile';
import {GstDraftRegister} from '../../gst-stage/GstDraftRegister';
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  ShieldCheck,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const AdminGstReports: React.FC = () => {
  const { orders:allOrders, formatPrice, company, language } = useStore();
  const [selectedMonth, setSelectedMonth] = useState('');
  const orders=allOrders.filter(o=>(o as any).taxReportingExcluded!==true && !!selectedMonth && typeof o.createdAt==='string' && o.createdAt.slice(0,7)===selectedMonth);
  const invalidTaxRecords=orders.filter(o=>![o.taxableAmount,o.cgst,o.sgst,o.igst].every(v=>typeof v==='number'&&Number.isFinite(v))).length;
  const recorded=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:0;
  const [reportType, setReportType] = useState<'gstr1' | 'gstr3b' | 'hsn'>('gstr1');

  // Aggregations
  const totalInvoices = orders.length;
  const grossTurnover = orders.reduce((sum, o) => sum + recorded(o.totalAmount), 0);
  const totalTaxable = orders.reduce((sum, o) => sum + recorded(o.taxableAmount), 0);
  const totalCgst = orders.reduce((sum, o) => sum + recorded(o.cgst), 0);
  const totalSgst = orders.reduce((sum, o) => sum + recorded(o.sgst), 0);
  const totalIgst = orders.reduce((sum, o) => sum + recorded(o.igst), 0);
  const totalTaxCollected = totalCgst + totalSgst + totalIgst;

  // HSN-wise summary aggregator
  const hsnMap: {
    [key: string]: {
      hsn: string;
      desc: string;
      qty: number;
      taxable: number;
      rate: number;
      tax: number;
    };
  } = {};

  orders.forEach((ord) => {
    ord.items.forEach((item) => {
      const key=item.hsn+'_'+item.gstRate;
      if (!hsnMap[key]) {
        hsnMap[key] = {
          hsn: item.hsn,
          desc: item.name,
          qty: 0,
          taxable: 0,
          rate: item.gstRate,
          tax: 0,
        };
      }
      hsnMap[key].qty += item.quantity;
      hsnMap[key].taxable += recorded((item as any).taxableAmount);
      hsnMap[key].tax += recorded((item as any).taxAmount);
    });
  });

  const hsnList = Object.values(hsnMap);

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm space-y-2"><h2 className="font-bold">Draft bookkeeping summary, not filing-ready</h2><p>Only loaded orders created in your selected month are included. Order creation date is not a verified invoice date. Credits, cancellations, marketplace reports, amendments, input tax credit and reverse-charge tax are not reconciled here.</p><p>HSN quantity/rate is shown, but item taxable value and tax are not inferred from gross prices. Missing recorded item tax values appear as zero and must be reviewed against invoices. Do not file from this screen.</p>{invalidTaxRecords>0&&<p>{invalidTaxRecords} loaded orders lack complete recorded tax fields. Totals are incomplete.</p>}<p>Free preparation roadmap: upload sales reports, review mapped invoices/credit notes, validate against GST schemas, generate a reviewed JSON file. Final GST portal submission stays separate and needs explicit owner approval.</p></div>
      <GstInvoiceEntry/><GstReconciliation/><GstComputationPanel/><GstDraftRegister company={company}/>
      {/* GST portal quick access (owner request) */}
      <div className="p-4 bg-[#FBFAF5] border border-[#CBCFB9] rounded-lg flex flex-wrap items-center gap-4">
        <div>
          <div className="text-[10px] font-bold text-[#565F52] uppercase tracking-wide">GSTIN</div>
          <div className="font-mono font-bold text-[#0F1913]">19AODPH1519N1ZS</div>
        </div>
        <a href="https://services.gst.gov.in/services/login" target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-[#CC9A2E] text-[#0F1913] font-bold rounded hover:bg-[#A87C1F] hover:text-white text-sm">Open GST Portal Login</a>
        <a href="https://www.gst.gov.in/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 border border-[#CBCFB9] font-bold rounded hover:bg-[#E4E8D9] text-sm text-[#0F1913]">GST Portal Home</a>
        <span className="text-[11px] text-[#565F52]">Taxpayer dashboard (returns, GSTR-1/3B, payments) opens after login.</span>
      </div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#CBCFB9]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black font-heading text-[#0F1913]">
              {language === 'bn' ? 'জিএসটি ট্যাক্স ও রিটার্ন অডিট রিপোর্ট' : 'GST Preparation - Recorded Order Summary'}
            </h1>
            <span className="bg-[#182620] text-[#CC9A2E] text-[10px] font-mono px-2 py-0.5 rounded font-bold">
              DRAFT - NOT FILED
            </span>
          </div>
          <p className="text-xs text-[#565F52] mt-0.5">
            {company.legalName} · GSTIN: <span className="font-mono font-bold text-[#0F1913]">{company.gstin}</span> (West Bengal, State Code: 19)
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={() => void printExport().catch(e=>alert(e.message))}
            className="inline-flex items-center gap-2 bg-[#182620] hover:bg-[#0F1913] text-white px-3.5 py-2 rounded text-xs font-semibold shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 text-[#CC9A2E]" />
            <span>Print Draft Summary</span>
          </button>
        </div>
      </div>

      {/* Control Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-[#CBCFB9] no-print">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportType('gstr1')}
            className={`text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
              reportType === 'gstr1'
                ? 'bg-[#182620] text-white'
                : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9]'
            }`}
          >
            GSTR-1 Outward Supplies
          </button>

          <button
            onClick={() => setReportType('gstr3b')}
            className={`text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
              reportType === 'gstr3b'
                ? 'bg-[#182620] text-white'
                : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9]'
            }`}
          >
            GSTR-3B Tax Summary
          </button>

          <button
            onClick={() => setReportType('hsn')}
            className={`text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
              reportType === 'hsn'
                ? 'bg-[#182620] text-white'
                : 'bg-[#FBFAF5] text-[#565F52] border border-[#CBCFB9]'
            }`}
          >
            HSN Chapter Summary
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Calendar className="w-4 h-4 text-[#565F52]" />
          <span className="font-semibold text-[#0F1913]">Order creation month:</span>
          <input type="month" aria-label="Order creation month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="border rounded p-2"/>
        </div>
      </div>

      {/* Tax Computation Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#CBCFB9] shadow-xs">
          <span className="text-[11px] text-[#565F52] uppercase font-bold block">
            Taxable Value
          </span>
          <div className="text-xl font-black text-[#0F1913] mt-1 font-sans">
            {formatPrice(totalTaxable)}
          </div>
          <span className="text-[10px] text-[#565F52] block mt-1">
            Across {totalInvoices} Invoices
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#CBCFB9] shadow-xs">
          <span className="text-[11px] text-[#565F52] uppercase font-bold block">
            Recorded CGST
          </span>
          <div className="text-xl font-black text-[#3C6656] mt-1 font-sans">
            {formatPrice(totalCgst)}
          </div>
          <span className="text-[10px] text-[#565F52] block mt-1">Intrastate WB (19)</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#CBCFB9] shadow-xs">
          <span className="text-[11px] text-[#565F52] uppercase font-bold block">
            Recorded SGST
          </span>
          <div className="text-xl font-black text-[#3C6656] mt-1 font-sans">
            {formatPrice(totalSgst)}
          </div>
          <span className="text-[10px] text-[#565F52] block mt-1">WB State Treasury</span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#CBCFB9] shadow-xs">
          <span className="text-[11px] text-[#565F52] uppercase font-bold block">
            Recorded Output Tax
          </span>
          <div className="text-xl font-black text-[#CC9A2E] mt-1 font-sans">
            {formatPrice(totalTaxCollected)}
          </div>
          <span className="text-[10px] text-[#A87C1F] font-bold block mt-1">
            Turnover: {formatPrice(grossTurnover)}
          </span>
        </div>
      </div>

      {/* Printable Official GST Schedule Document */}
      <div className="bg-white p-6 rounded-lg border border-[#CBCFB9] shadow-xs space-y-6" id="printable-area">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start border-b border-[#CBCFB9] pb-4 gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase bg-[#182620] text-[#CC9A2E] px-2 py-0.5 rounded font-bold">
              DRAFT ORDER TAX SUMMARY - NOT A GST RETURN
            </span>
            <h3 className="font-heading font-black text-xl text-[#0F1913] mt-2">
              {company.legalName}
            </h3>
            <p className="text-xs text-[#565F52]">{company.address}</p>
            <p className="text-xs font-bold text-[#0F1913] mt-1">
              GSTIN: <span className="font-mono">{company.gstin}</span> · Registration status not checked
            </p>
          </div>

          <div className="text-right text-xs space-y-1">
            <p className="text-[#565F52]">Financial Year: <span className="font-bold text-[#0F1913]">{selectedMonth ? (Number(selectedMonth.slice(5))>=4?Number(selectedMonth.slice(0,4)):Number(selectedMonth.slice(0,4))-1)+'-'+(Number(selectedMonth.slice(5))>=4?Number(selectedMonth.slice(0,4))+1:Number(selectedMonth.slice(0,4))):'Choose period'}</span></p>
            <p className="text-[#565F52]">Tax Return Period: <span className="font-bold text-[#0F1913]">{selectedMonth}</span></p>
            <p className="text-[#565F52]">Filing Frequency: <span className="font-bold text-[#0F1913]">Not verified</span></p>
            <p className="text-[#3C6656] font-semibold flex items-center justify-end gap-1">
              <span>Review required:</span>
              Not reconciled with PayU or bank ledger
            </p>
          </div>
        </div>

        {/* Section Content based on selected Tab */}
        {reportType === 'gstr1' && (
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
              Loaded order tax references - not verified invoices
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#EEF0E7] text-[#0F1913] font-bold text-[10px] uppercase border-b border-[#CBCFB9]">
                    <th className="p-2.5">Order reference</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Customer & Recipient GSTIN</th>
                    <th className="p-2.5">Place of Supply (POS)</th>
                    <th className="p-2.5 text-right">Invoice Value</th>
                    <th className="p-2.5 text-right">Taxable Value</th>
                    <th className="p-2.5 text-right">Recorded CGST</th>
                    <th className="p-2.5 text-right">Recorded SGST</th>
                    <th className="p-2.5 text-right">Recorded IGST</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCFB9]/40 font-mono">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-gray-50">
                      <td className="p-2.5 font-bold text-[#0F1913]">{ord.id}</td>
                      <td className="p-2.5 text-[#565F52]">{ord.createdAt.slice(0, 10)}</td>
                      <td className="p-2.5 font-sans">
                        <span className="font-semibold text-[#0F1913] block">{ord.customerName}</span>
                        <span className="text-[10px] text-[#A87C1F] font-mono">
                          {ord.gstin ? `GSTIN: ${ord.gstin}` : 'B2C Consumer'}
                        </span>
                      </td>
                      <td className="p-2.5 font-sans text-[#565F52]">
                        {ord.state || 'Unknown'} (POS code not verified)
                      </td>
                      <td className="p-2.5 text-right font-sans font-bold">{formatPrice(ord.totalAmount)}</td>
                      <td className="p-2.5 text-right font-sans">{formatPrice(ord.taxableAmount)}</td>
                      <td className="p-2.5 text-right font-sans text-[#3C6656]">{formatPrice(ord.cgst)}</td>
                      <td className="p-2.5 text-right font-sans text-[#3C6656]">{formatPrice(ord.sgst)}</td>
                      <td className="p-2.5 text-right font-sans text-[#A87C1F]">{formatPrice(ord.igst)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#EEF0E7] font-bold text-[#0F1913] text-xs border-t-2 border-[#CBCFB9]">
                    <td colSpan={4} className="p-2.5 font-sans uppercase">Total Consolidated:</td>
                    <td className="p-2.5 text-right font-sans">{formatPrice(grossTurnover)}</td>
                    <td className="p-2.5 text-right font-sans">{formatPrice(totalTaxable)}</td>
                    <td className="p-2.5 text-right font-sans text-[#3C6656]">{formatPrice(totalCgst)}</td>
                    <td className="p-2.5 text-right font-sans text-[#3C6656]">{formatPrice(totalSgst)}</td>
                    <td className="p-2.5 text-right font-sans text-[#A87C1F]">{formatPrice(totalIgst)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {reportType === 'hsn' && (
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
              Table 12: HSN Summary of Outward Supplies
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#EEF0E7] text-[#0F1913] font-bold text-[10px] uppercase border-b border-[#CBCFB9]">
                    <th className="p-2.5">HSN Code</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">UQC (Unit)</th>
                    <th className="p-2.5 text-center">Total Quantity</th>
                    <th className="p-2.5 text-right">Taxable Value</th>
                    <th className="p-2.5 text-right">Rate %</th>
                    <th className="p-2.5 text-right">Total Tax</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#CBCFB9]/40">
                  {hsnList.map((h, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="p-2.5 font-mono font-bold text-[#A87C1F]">{h.hsn}</td>
                      <td className="p-2.5 font-medium text-[#0F1913]">{h.desc}</td>
                      <td className="p-2.5 font-mono text-[11px] text-[#565F52]">NOS (Numbers)</td>
                      <td className="p-2.5 text-center font-bold font-mono">{h.qty}</td>
                      <td className="p-2.5 text-right font-bold">{formatPrice(h.taxable)}</td>
                      <td className="p-2.5 text-right font-mono">{h.rate}%</td>
                      <td className="p-2.5 text-right font-bold text-[#3C6656]">{formatPrice(h.tax)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {reportType === 'gstr3b' && (
          <div className="space-y-4">
            <h4 className="font-heading font-bold text-sm text-[#0F1913] uppercase tracking-wider">
              Draft recorded output tax - incomplete for GSTR-3B
            </h4>

            <div className="bg-[#FBFAF5] border border-[#CBCFB9] rounded p-4 text-xs space-y-3">
              <div className="flex justify-between py-1.5 border-b border-[#CBCFB9]">
                <span className="font-semibold text-[#0F1913]">3.1 (a) Outward taxable supplies (other than zero rated):</span>
                <span className="font-bold text-[#0F1913]">{formatPrice(totalTaxable)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#CBCFB9]">
                <span className="text-[#565F52]">Central Tax (CGST Payable):</span>
                <span className="font-mono text-[#3C6656] font-bold">{formatPrice(totalCgst)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#CBCFB9]">
                <span className="text-[#565F52]">State/UT Tax (SGST Payable):</span>
                <span className="font-mono text-[#3C6656] font-bold">{formatPrice(totalSgst)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#CBCFB9]">
                <span className="text-[#565F52]">Integrated Tax (IGST Payable):</span>
                <span className="font-mono text-[#A87C1F] font-bold">{formatPrice(totalIgst)}</span>
              </div>
              <div className="flex justify-between py-2 pt-3 font-bold text-sm text-[#0F1913] border-t-2 border-[#CBCFB9]">
                <span>Recorded output tax only (not net tax payable):</span>
                <span className="text-[#0F1913] text-base">{formatPrice(totalTaxCollected)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Official Statutory Declaration */}
        <div className="pt-4 border-t border-[#CBCFB9] flex flex-col sm:flex-row justify-between items-end text-[10px] text-[#565F52] gap-4">
          <div>
            <p>Draft for owner/accountant review only. No statutory declaration is made.</p>
            <p>No GST JSON, government upload, liability offset or filing is performed.</p>
          </div>
          <div className="text-right">
            <span className="font-bold text-[#0F1913] block">For UNICK DIGITAL E-COMMERCE SOLUTIONS</span>
            <span className="text-[9px] text-[#565F52]">Not signed or filed</span>
          </div>
        </div>
      </div>
    </div>
  );
};
