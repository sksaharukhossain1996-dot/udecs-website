export function csvCell(value:unknown):string{
 let s=value==null?'':String(value);
 if(/^[\s\u0000-\u001f]*[=+@-]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
export function csvText(rows:unknown[][]):string{return '\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');}
export function auditIp(value:unknown):string{return typeof value==='string'&&value&&!['192.168.1.104','127.0.0.1'].includes(value)?value:'Unknown';}
