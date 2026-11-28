import React from 'react';
export const COUNTRIES:[string,string,string][]=[['IN','+91','🇮🇳'],['BD','+880','🇧🇩'],['NP','+977','🇳🇵'],['LK','+94','🇱🇰'],['PK','+92','🇵🇰'],['AE','+971','🇦🇪'],['SA','+966','🇸🇦'],['QA','+974','🇶🇦'],['SG','+65','🇸🇬'],['MY','+60','🇲🇾'],['GB','+44','🇬🇧'],['US','+1','🇺🇸'],['CA','+1','🇨🇦'],['AU','+61','🇦🇺']];
export function splitPhone(v:string):{cc:string;num:string}{
 const s=(v||'').trim();if(!s.startsWith('+'))return{cc:'+91',num:s.replace(/\D/g,'')};
 const codes=[...new Set(COUNTRIES.map(c=>c[1]))].sort((a,b)=>b.length-a.length);
 const cc=codes.find(c=>s.startsWith(c));if(!cc)return{cc:'+91',num:s.replace(/\D/g,'')};
 return{cc,num:s.slice(cc.length).replace(/\D/g,'')};
}
export const joinPhone=(cc:string,num:string)=>{const d=num.replace(/\D/g,'');return d?`${cc} ${d}`:''};
export function phoneValid(v:string){const{cc,num}=splitPhone(v);return cc==='+91'?/^[6-9]\d{9}$/.test(num):/^\d{6,12}$/.test(num)}
export function PhoneField({value,onChange,placeholder,className,inputClassName,required}:{value:string;onChange:(v:string)=>void;placeholder?:string;className?:string;inputClassName?:string;required?:boolean}){
 const{cc,num}=splitPhone(value);
 return <div className={className||'phone-field'} style={{display:'flex',gap:6}}>
  <select aria-label="Country code" value={cc} onChange={e=>onChange(joinPhone(e.target.value,num)||'')} style={{flex:'0 0 auto',maxWidth:116,border:'1px solid #CBCFB9',borderRadius:10,padding:'0 6px',background:'#fff',fontSize:13}}>
   {COUNTRIES.map(([k,c,f])=><option key={k} value={c}>{f} {c}</option>)}
  </select>
  <input type="tel" inputMode="tel" autoComplete="tel-national" required={required} placeholder={placeholder||'10-digit mobile'} value={num} onChange={e=>onChange(num===''&&e.target.value===''?'':joinPhone(cc,e.target.value))} className={inputClassName} style={{flex:1,minWidth:0}}/>
 </div>;
}
