export const MYSA_ROLES = ['Catalog & listing','Orders & alerts','Stock & buying','Finance & GST','Support & CRM','Shipping & returns','Health & safety','Business reports'];
export type HubRow = {roleId:string;state:string;summary:string;nextStep:string;checkedAt:string;publishedAt:string;source:string;scope:string;evidence:string[]};
const allowed = new Set(['WORKING','MONITORED','PLANNED','PENDING','BLOCKED','COMPLETED','NO_FEED']);
export function validateHubRows(value:any): HubRow[] {
  if (!Array.isArray(value) || value.length>8) throw Error('Unverified report response.');
  const ids=new Set<string>();
  for(const row of value){
    if(!row || !/^0[1-8]$/.test(row.roleId) || ids.has(row.roleId) || !allowed.has(row.state) || ['summary','nextStep','scope','source'].some(k=>typeof row[k]!=='string'||row[k].length>1000) || !Number.isFinite(Date.parse(row.checkedAt)) || !Number.isFinite(Date.parse(row.publishedAt)) || Date.parse(row.checkedAt)>Date.now()+300000 || !Array.isArray(row.evidence)||row.evidence.length>12||row.evidence.some((x:any)=>typeof x!=='string'||!/^https:\/\//.test(x)||x.length>2000))throw Error('Unverified report row.');
    ids.add(row.roleId);
  }return value;
}
export function command(text:string):{kind:'read';roleId?:string}|{kind:'help'}|{kind:'unsupported'} {
  const q=text.trim().toLowerCase();
  // Read-only allowlist. A role keyword inside a write command must never trigger work.
  if (/\b(send|delete|archive|pay|buy|cancel|change|update|file|dispatch)\b|bhej|hata|payment karo|badal|order karo/.test(q)) return {kind:'unsupported'};
  if (/^(help|madad|मदद|क्या कर सकती हो|kya kar sakti ho)[?.! ]*$/.test(q)) return {kind:'help'};
  const read=/\b(read|report|status|show|batao|sunao|dikhao|padho)\b|बताओ|सुनाओ|दिखाओ|स्थिति|रिपोर्ट|পড়ো|বলো/.test(q);
  if(!read) return {kind:'unsupported'};
  const roles=[/catalog|listing|product|कैटलॉग|लिस्टिंग/,/order|alert|ऑर्डर|অর্ডার/,/stock|buying|स्टॉक/,/finance|gst|salary|payroll|वित्त|सैलरी/,/support|crm|customer|सपोर्ट/,/shipping|return|delivery|शिपिंग/,/health|safety|स्वास्थ्य/,/business|amazon|व्यापार/];
  const index=roles.findIndex(r=>r.test(q));
  return {kind:'read',...(index>=0?{roleId:String(index+1).padStart(2,'0')}:{})};
}
export function reportSpeech(rows:HubRow[],roleId?:string, now=Date.now()):string {
  const selected=roleId?rows.filter(r=>r.roleId===roleId):rows;
  if(!selected.length)return 'No verified report loaded for this role. Refresh reports. Missing data is not zero.';
  return selected.map(r=>`${MYSA_ROLES[Number(r.roleId)-1]}. Source checked ${new Date(r.checkedAt).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})} IST. ${now-Date.parse(r.checkedAt)>7200000?'Older snapshot, not current status. ':'Dated snapshot, not live activity. '}${r.state}. ${r.summary}. Next step: ${r.nextStep}.`).join('\n');
}
export function handleCommand(text:string,rows:HubRow[]):string {
  const c=command(text);
  if(c.kind==='help')return 'I can read dated Hub reports, for example: read orders report, stock status, or read all reports. I cannot send messages, change orders, make payments or chat freely. Microphone only starts when you tap Talk.';
  if(c.kind==='unsupported')return 'This free version reads reports and understands a small set of commands. It cannot do that action or hold a general AI conversation. Try: read orders report, or help.';
  return reportSpeech(rows,c.roleId);
}
