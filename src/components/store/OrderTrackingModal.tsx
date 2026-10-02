import React,{useState} from 'react';
import {useStore} from '../../context/StoreContext';
import {generateWhatsAppLink} from '../../services/whatsappService';
interface Props{isOpen:boolean;onClose:()=>void;initialOrderId?:string;}
export const OrderTrackingModal:React.FC<Props>=({isOpen,onClose,initialOrderId=''})=>{
 const {company}=useStore();const[reference,setReference]=useState(initialOrderId);
 if(!isOpen)return null;
 return <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"><section role="dialog" aria-modal="true" aria-labelledby="order-support-title" className="bg-white rounded-xl p-6 max-w-lg w-full space-y-4">
 <div className="flex justify-between gap-4"><h2 id="order-support-title" className="text-xl font-bold">Order status &amp; support</h2><button aria-label="Close modal" onClick={onClose}>Close</button></div>
 <p>Automatic shipment tracking is not connected yet. Our support team can check your order reference and confirm its status. No sample orders or payment status are shown here.</p>
 <label className="block">Order reference (optional)<input className="block w-full border rounded p-3 mt-2" maxLength={80} value={reference} onChange={e=>setReference(e.target.value)} placeholder="Your UDECS order reference"/></label>
 <a className="block text-center rounded bg-[#182620] text-white p-3" href={generateWhatsAppLink(company.whatsapp,`Please help me check my UDECS order status. Order reference: ${reference.trim()||'I need help finding it'}.`)} target="_blank" rel="noopener noreferrer">Ask support on WhatsApp</a>
 <p className="text-sm">Do not share passwords, OTPs or card details. Sending this message does not confirm payment or dispatch.</p>
 </section></div>;
};
