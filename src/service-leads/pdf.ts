import {jsPDF} from 'jspdf';
import type {ServiceLead} from './model';
export async function serviceLeadsPdf(rows:ServiceLead[]){
 const base=new Image();base.src='/quotation-letterhead.jpg';await base.decode();
 const pdf=new jsPDF({unit:'pt',format:'a4'});let page=0,y=0,canvas:HTMLCanvasElement,c:CanvasRenderingContext2D;
 const wrap=(t:string,width=485)=>{c.font='10px Arial';const out:string[]=[];let line='';for(const ch of t.replace(/[\r\n]/g,' ')){if(c.measureText(line+ch).width>width){out.push(line);line='';}line+=ch;}if(line)out.push(line);return out;};
 const text=(t:string,x:number,at:number,size=10,bold=false)=>{c.font=(bold?'bold ':'')+size+'px Arial';c.fillStyle='#183858';c.fillText(t,x,at);};
 const start=()=>{if(page)pdf.addPage();page++;canvas=document.createElement('canvas');canvas.width=1190;canvas.height=1684;c=canvas.getContext('2d')!;if(!c)throw Error('PDF rendering unavailable.');c.drawImage(base,0,0,1190,1684);c.scale(2,2);text('DIGITAL SOLUTIONS SERVICE - CLIENT LIST',50,130,15,true);text('Private loaded view | '+rows.length+' lead'+(rows.length===1?'':'s'),50,150,9);text('Submitted details are unverified. No service or payment is implied.',50,166,8);y=195;};
 const flush=()=>{text('Private customer information. Share only with an authorized recipient.',50,765,8);text('Page '+page,495,780,8);pdf.addImage(canvas.toDataURL('image/jpeg',.85),'JPEG',0,0,595.28,841.89,undefined,'FAST');};
 start();if(!rows.length)text('No service leads in this loaded view.',50,y);
 rows.forEach((r,index)=>{const fields=[['Client',r.name],['Phone',r.phone],['Gmail / email',r.email],['Company',r.company],['Age',r.age],['GST',r.gst],['Gender',r.gender],['Requested service',r.requestedService],['Received',r.createdAt],['Source',r.source],['Stage (owner-entered)',r.status||'New leads'],['Stage history',(r.statusHistory||[]).map(h=>h.stage+' at '+h.at).join('; ')],['Customer rating',r.rating?r.rating+'/5 stars':'Not received'],['Customer review',r.review||'Not received'],['Review visibility',r.reviewPublished?'Published':'Private']];
  const lines=fields.flatMap(([k,v])=>wrap(k+': '+(v||'Not supplied')));const height=lines.length*14+30;
  if(y+height>740){flush();start();}text('CLIENT '+(index+1),50,y,10,true);y+=18;for(const line of lines){if(y>725){flush();start();text('CLIENT '+(index+1)+' - continued',50,y,10,true);y+=18;}text(line,50,y);y+=14;}y+=12;c.strokeStyle='#d4dfeb';c.beginPath();c.moveTo(50,y-5);c.lineTo(545,y-5);c.stroke();
 });flush();return pdf.output('blob');
}
