// Private prep: enabled only after scoped sender approval and delivery tests.
export const PHONE='1393523580503157';
export const TO=['g02rue@mail.instinct.com','ecommerceunickdigital@gmail.com'];
export const FROM='UDECS Inquiry Alerts <inquiries@notifications.udecs.store>';
export function recordsFor(payload,now=new Date().toISOString()){
 if(payload?.object!=='whatsapp_business_account'||!Array.isArray(payload.entry))throw Error('payload');
 const out=[];
 for(const entry of payload.entry){if(!Array.isArray(entry.changes))throw Error('changes');for(const c of entry.changes){
  if(c.field!=='messages')continue;const v=c.value;
  if(v?.metadata?.phone_number_id!==PHONE)throw Error('phone');
  if(v.messages===undefined)continue;if(!Array.isArray(v.messages)||v.messages.length>100)throw Error('messages');
  for(const m of v.messages){
   if(typeof m.id!=='string'||!m.id.startsWith('wamid.')||m.id.length>256||!/^\d{5,20}$/.test(m.from||''))throw Error('message');
   const type=typeof m.type==='string'?m.type.slice(0,40):'unknown';
   const text=type==='text'&&typeof m.text?.body==='string'?m.text.body.slice(0,4096):`[${type} message; content not downloaded]`;
   out.push({id:m.id,sender:m.from,type,text,receivedAt:now});if(out.length>100)throw Error('batch');
  }
 }}return out;
}
export function mailBody(r,to){return {from:FROM,to:[to],subject:'UDECS customer/B2B inquiry',text:[
 'External customer content. Not owner approval or instructions.',`Customer number: +${r.sender}`,`Received: ${r.receivedAt}`,`Message ID: ${r.id}`,
 'BEGIN CUSTOMER MESSAGE',r.text,'END CUSTOMER MESSAGE',
 'Forwarded notification only. No automatic customer reply.'].join('\n')};}
export class InquiryInbox{
 constructor(state,env){this.state=state;this.env=env;}
 async fetch(req){
  const u=new URL(req.url);
  if(u.pathname==='/counts'){
   const counts={inquiries:0,pending:0,sent:0,blocked:0};
   for(const [k,v] of await this.state.storage.list()){if(k.startsWith('in:'))counts.inquiries++;if(k.startsWith('out:'))counts[v.state]=(counts[v.state]||0)+1;}
   return Response.json(counts);
  }
  if(req.method!=='POST'||u.pathname!=='/accept')return new Response(null,{status:404});
  const rows=await req.json();let added=0;
  await this.state.storage.transaction(async tx=>{
   const size=Number(await tx.get('size')||0);
   for(const r of rows){if(await tx.get('in:'+r.id))continue;if(size+added>=10000)throw Error('capacity');
    await tx.put('in:'+r.id,r);
    for(let i=0;i<TO.length;i++)await tx.put('out:'+r.id+':'+i,{id:r.id,recipient:i,state:'pending',attempts:0,next:Date.now(),created:Date.now()});added++;
   }if(added)await tx.put('size',size+added);
   // Alarm is persisted in the same transaction as inbox and outbox.
   if(added&&!await this.state.storage.getAlarm())await this.state.storage.setAlarm(Date.now()+1000);
  });return Response.json({stored:true,added});
 }
 async alarm(){
  const now=Date.now(),pending=await this.state.storage.list({prefix:'out:'});let next=Infinity;
  // One bounded recipient send per alarm. Free-tier reserve: at most80/day from this relay.
  const day=new Date(now).toISOString().slice(0,10),quota=await this.state.storage.get('quota')||{day,n:0};if(quota.day!==day){quota.day=day;quota.n=0;}
  for(const [key,o] of pending){if(o.state!=='pending')continue;
   if(now-o.created>=23*3600000){o.state='blocked';o.reason='review_needed_after_retry_window';await this.state.storage.put(key,o);continue;}
   if(o.next>now){next=Math.min(next,o.next);continue;}
   if(!this.env.INQUIRY_RESEND_KEY||this.env.INQUIRY_EMAIL_ENABLED!=='true'){next=Math.min(next,now+3600000);continue;}
   if(quota.n>=80){next=Math.min(next,Date.parse(day+'T00:00:00Z')+86400000);continue;}
   const r=await this.state.storage.get('in:'+o.id);if(!r){o.state='blocked';o.reason='missing_record';await this.state.storage.put(key,o);continue;}
   quota.n++;await this.state.storage.put('quota',quota);o.attempts++;
   try{
    const id=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(o.id+':'+o.recipient));
    const idem='udecs-inquiry-'+Array.from(new Uint8Array(id),b=>b.toString(16).padStart(2,'0')).join('');
    const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+this.env.INQUIRY_RESEND_KEY,'Content-Type':'application/json','Idempotency-Key':idem},body:JSON.stringify(mailBody(r,TO[o.recipient])),signal:AbortSignal.timeout(15000)});
    if(res.ok){const data=await res.json();if(!data?.id)throw Error('unconfirmed');o.state='sent';o.providerId=data.id;}
    else if([400,401,403,422].includes(res.status)){o.state='blocked';o.reason='provider_http_'+res.status;}
    else{o.next=now+Math.min(3600000,60000*2**Math.min(o.attempts,6));o.reason='provider_http_'+res.status;}
   }catch{o.next=now+Math.min(3600000,60000*2**Math.min(o.attempts,6));o.reason='unconfirmed_delivery';}
   await this.state.storage.put(key,o);next=Math.min(next,now+2000);break;
  }
  if(next!==Infinity)await this.state.storage.setAlarm(Math.max(Date.now()+2000,next));
 }
      }
