// Maya - owner's finance assistant brain (portal v0).
// Read-only: answers from live Firestore data. No actions, no payments, no invented numbers.
import {isDemoOrTestOrder} from '../lib/orderEmailSafety';

export type MayaOrder = {
  id: string;
  createdAt?: string;
  totalAmount?: number;
  paymentStatus?: string;
  orderStatus?: string;
  paymentMethod?: string;
  totalGst?: number;
};

export type MayaEmployee = {baseSalary?: number; status?: string; name?: string};

export type MayaData = {
  orders: MayaOrder[] | null;        // null = could not read
  orderLimitHit: boolean;            // true = more orders exist than read; no totals claimed
  employees: MayaEmployee[] | null;
  expensesMonth: number | null;      // null = expense data not connected/readable
  loadedAt: number;
};

export type MayaIntent =
  | 'refuse' | 'help' | 'sales' | 'orders' | 'salary'
  | 'profit' | 'gst' | 'expense' | 'bank' | 'advice' | 'unknown';

const ACTION_WORDS = /\b(send|delete|archive|cancel|dispatch|transfer|refund|update|change)\b|bhej do|bhejo|hatao|paisa bhej|payment karo|pay karo|order karo|badal do|cancel karo|refund karo/i;

export function mayaIntent(text: string): MayaIntent {
  const q = text.trim().toLowerCase();
  if (!q) return 'unknown';
  if (ACTION_WORDS.test(q)) return 'refuse';
  if (/^(hi|hii+|hello|hey|namaste|namaskar|salaam)[!. ]*$/.test(q)) return 'help';
  if (/help|madad|kya kar sakti|what can you do/.test(q)) return 'help';
  if (/profit|fayda|faida|margin|loss|nuksan/.test(q)) return 'profit';
  if (/gst|gstr|filing|tax return|tax file/.test(q)) return 'gst';
  if (/salary|payroll|vetan|tankhwah|tanakh|staff ka|employee/.test(q)) return 'salary';
  if (/expense|kharcha|kharch/.test(q)) return 'expense';
  if (/bank|balance|statement|account me|fund/.test(q)) return 'bank';
  if (/sale|sales|bikri|bech|kamai|earning|revenue|turnover|kitna hua|kitni hui|collection/.test(q)) return 'sales';
  if (/order|pending|dispatch|tracking|delivery|packed|shipped/.test(q)) return 'orders';
  if (/salah|advice|kaise badha|grow|cash ?flow|business ke liye|tips?/.test(q)) return 'advice';
  return 'unknown';
}

export const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', maximumFractionDigits: 0}).format(n);

const istDay = (value: unknown): string => {
  const d = new Date(typeof value === 'string' || typeof value === 'number' ? value : NaN);
  if (!Number.isFinite(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'}).format(d);
};
const istMonth = (value: unknown): string => istDay(value).slice(0, 7);

type Bucket = {count: number; recorded: number; collected: number; gst: number; pending: number; pendingCount: number};

function bucket(orders: MayaOrder[], match: (o: MayaOrder) => boolean): Bucket {
  const b: Bucket = {count: 0, recorded: 0, collected: 0, gst: 0, pending: 0, pendingCount: 0};
  for (const o of orders) {
    if (!match(o)) continue;
    const total = Number(o.totalAmount);
    if (!Number.isFinite(total) || total < 0) continue;
    if (o.orderStatus === 'cancelled') continue;
    b.count++;
    b.recorded += total;
    if (o.paymentStatus === 'paid') {
      b.collected += total;
      if (Number.isFinite(Number(o.totalGst))) b.gst += Number(o.totalGst);
    } else {
      b.pending += total;
      b.pendingCount++;
    }
  }
  return b;
}

const NO_DATA = 'Boss, order data abhi padh nahi payi (sign-in ya connection problem). Thodi der me phir try karo - koi andaza number nahi dungi.';

export function mayaAnswer(intent: MayaIntent, d: MayaData | null, now = new Date()): string {
  const today = istDay(now.getTime());
  const month = today.slice(0, 7);
  const monthName = now.toLocaleString('en-IN', {timeZone: 'Asia/Kolkata', month: 'long'});
  switch (intent) {
    case 'refuse':
      return 'Boss, main sirf hisaab aur salah deti hoon - payment, refund, order change ya message bhejna yeh sab hamesha aapke haath mein rahega. Agar kisi cheez ka hisaab chahiye to poochho.';
    case 'help':
      return 'Boss, main Maya hoon - aapki hisaab assistant. Ye poochh sakte ho:\n- "aaj kitni sale hui?" / "is mahine collection kitna?"\n- "kitne orders pending hain?"\n- "staff ki salary kitni hai?"\n- "GST kitna jama hua is mahine?"\n- "kharcha kitna hua?" / "bank balance?"\n- "cash flow ki salah do"\nMain live data se jawab deti hoon. Payment ya koi action kabhi nahi karti - woh hamesha aapke haath mein.';
    case 'sales': {
      if (!d || !d.orders) return NO_DATA;
      if (d.orderLimitHit) return 'Boss, orders ki sankhya is dashboard ki limit se zyada hai - exact total abhi claim nahi kar sakti. Dashboard tab dekho.';
      const real = d.orders.filter(o => !isDemoOrTestOrder(o as never));
      const t = bucket(real, o => istDay(o.createdAt) === today);
      const m = bucket(real, o => istMonth(o.createdAt) === month);
      const tLine = t.count === 0
        ? 'Aaj abhi koi order nahi aya.'
        : `Aaj (${today.split('-').reverse().join('-')}): ${t.count} order - recorded ${inr(t.recorded)}, collected (paid) ${inr(t.collected)}.`;
      return `Boss, live hisaab:\n${tLine}\n${monthName} mahine ab tak: ${m.count} orders, collected ${inr(m.collected)}${m.pendingCount ? `, payment pending ${inr(m.pending)} (${m.pendingCount} orders)` : ''}.\nYeh numbers abhi abhi orders data se padhe hain.`;
    }
    case 'orders': {
      if (!d || !d.orders) return NO_DATA;
      const real = d.orders.filter(o => !isDemoOrTestOrder(o as never));
      const active = real.filter(o => o.orderStatus !== 'cancelled');
      const by = (s: string) => active.filter(o => o.orderStatus === s).length;
      const open = active.filter(o => ['pending', 'processing'].includes(String(o.orderStatus)));
      const oldest = open.map(o => o.createdAt).filter(Boolean).sort()[0];
      return `Boss, orders ka live status:\nPending: ${by('pending')}, Processing: ${by('processing')}, Packed: ${by('packed')}, Shipped: ${by('shipped')}, Delivered: ${by('delivered')}.\n${open.length ? `Sabse purana open order: ${oldest ? oldest.slice(0, 10) : 'date unknown'}. Dispatch jo pending hai use pehle nikalo.` : 'Koi open pending order nahi - sab clear.'}\nDetail ke liye Orders tab.`;
    }
    case 'salary': {
      if (!d || !d.employees) return 'Boss, staff data abhi padh nahi payi. HR/Staff tab mein list hai - wahan se dekho.';
      const active = d.employees.filter(e => e.status !== 'resigned');
      const total = active.reduce((n, e) => n + (Number.isFinite(Number(e.baseSalary)) ? Number(e.baseSalary) : 0), 0);
      return `Boss, active staff ${active.length} log, monthly base salary total ${inr(total)}.\nExact payable (attendance ke hisaab se) SmartPayroll tab mein calculate hota hai. Salary payment hamesha aap approve karoge - main sirf hisaab bata sakti hoon.`;
    }
    case 'profit': {
      if (!d || !d.orders) return NO_DATA;
      const real = d.orders.filter(o => !isDemoOrTestOrder(o as never));
      const m = bucket(real, o => istMonth(o.createdAt) === month);
      return `Boss, ${monthName} mein collected ${inr(m.collected)} hai.\nLekin exact profit ke liye product cost, courier aur kharcha data chahiye - woh abhi connected nahi hai, isliye main koi profit number nahi banaungi. Expense data connect ho jaye to accurate fayda/nuksan bata dungi.`;
    }
    case 'gst': {
      if (!d || !d.orders) return NO_DATA;
      const real = d.orders.filter(o => !isDemoOrTestOrder(o as never));
      const m = bucket(real, o => istMonth(o.createdAt) === month);
      return `Boss, ${monthName} ke paid orders par collected GST (estimate): ${inr(m.gst)}.\nFiling se pehle GST register (GST tab) se exact figure verify karna - mera number sirf orders ka total hai. Yaad rahe: GSTR-1 ki date 11, GSTR-3B ki 20 hoti hai.`;
    }
    case 'expense': {
      if (!d || d.expensesMonth == null)
        return 'Boss, kharcha (expense) data abhi mere se connected nahi hai. Jab ERP mein expense entries aayengi, main mahine ka total aur sabse bade kharch bata dungi. Abhi koi andaza nahi dungi.';
      return `Boss, ${monthName} ka recorded kharcha: ${inr(d.expensesMonth)}. Detail ERP expense ledger mein.`;
    }
    case 'bank':
      return 'Boss, bank account live linked nahi hai - balance ka koi real number mere paas nahi. Statement CSV ERP mein import hota hai, reconciliation Operations tab mein dikhta hai. Live balance ke liye bank app hi check karo.';
    case 'advice':
      return 'Boss, general salah (aapke data pe nahi, experience pe):\n- COD orders mein payment courier se aane tak cash atka rehta hai - prepaid orders ko thoda discount dekar badhavo.\n- Har hafte pending payment orders ek baar dekho - paisa wahi atakta hai.\n- Salary aur GST ke paise alag rakho, taaki month-end pe tension na ho.\nChahein to koi specific hisaab poochho - "is mahine collection kitna?" jaise.';
    default:
      return 'Boss, yeh sawal abhi mere scope se bahar hai. Main ye bata sakti hoon: aaj/mahine ki sale, orders ka status, staff salary, GST estimate, kharcha/bank ka connection status, aur cash flow salah. Example: "is mahine kitni sale hui?"';
  }
}
