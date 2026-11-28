import React,{useState}from'react';
import{splitPhone}from'./PhoneField';
// Mobile verification by WhatsApp OTP (Meta Cloud API, about Rs 0.115 per OTP).
// Switched off until VITE_OTP_API is set at build time. When off or failing,
// the customer's verified Gmail sign-in is used instead.
const API=(import.meta as any).env?.VITE_OTP_API as string|undefined;
export const phoneOtpOn=!!API;
const KEY='udecs_phone_verified';
export const verifiedPhone=()=>{try{return localStorage.getItem(KEY)||''}catch{return''}};
export function VerifyMobile({phone,onVerified}:{phone:string;onVerified:()=>void}){
 const{cc,num}=splitPhone(phone);const full=cc+num;
 const[sent,setSent]=useState(false);const[code,setCode]=useState('');const[busy,setBusy]=useState(false);const[msg,setMsg]=useState('');
 const[ok,setOk]=useState(verifiedPhone()===full);
 if(num.length<6)return null;
 if(ok||verifiedPhone()===full)return <p className="prof-ok">Mobile verified on WhatsApp</p>;
 if(!phoneOtpOn)return <small className="prof-note">Mobile OTP is coming soon. Your Gmail sign-in is already verified, so you can order now.</small>;
 const call=async(path:string,body:object)=>{const r=await fetch(API+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));return{r,j}};
 const send=async()=>{setBusy(true);setMsg('');try{const{r,j}=await call('/send',{phone:full});if(r.ok){setSent(true);setMsg('We sent a 6-digit code on WhatsApp to '+full+'.')}else setMsg(j.error==='wait'?'Please wait a minute before asking again.':'Mobile OTP is not available right now. Your Gmail sign-in is verified, so you can order without it.')}catch{setMsg('Mobile OTP is not available right now. Your Gmail sign-in is verified, so you can order without it.')}finally{setBusy(false)}};
 const confirm=async()=>{setBusy(true);try{const{r}=await call('/verify',{phone:full,code});if(r.ok){try{localStorage.setItem(KEY,full)}catch{}setOk(true);onVerified()}else setMsg('That code did not match. Try again.')}catch{setMsg('Could not check the code. Try again.')}finally{setBusy(false)}};
 return <div className="prof-otp">{!sent?<button type="button" className="app-btn outline" disabled={busy} onClick={send}>Verify mobile on WhatsApp</button>:<div className="prof-row"><input inputMode="numeric" maxLength={6} placeholder="6-digit code" aria-label="WhatsApp OTP" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} style={{border:'1px solid #e8e0d3',borderRadius:10,padding:11}}/><button type="button" className="app-btn" disabled={busy||code.length!==6} onClick={confirm}>Confirm</button></div>}{msg&&<small role="status">{msg}</small>}</div>;
}
