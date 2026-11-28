import React,{useEffect,useState}from'react';
import{User,MapPin,Plus,Trash2,Pencil,Check,LogOut}from'lucide-react';
import{customerAuth,customerSignIn,watchCustomerIdentity}from'../customer-stage/customerIdentity';
import{VerifyMobile}from'./VerifyMobile';
import{PhoneField,phoneValid}from'./PhoneField';
import{signOut}from'firebase/auth';
export type SavedAddress={id:string;label:'Home'|'Work'|'Other';name:string;phone:string;address:string;landmark:string;city:string;state:string;pincode:string;isDefault:boolean};
export type AppProfile={name:string;phone:string;gender:''|'male'|'female';dob?:string;addresses:SavedAddress[]};
const KEY='udecs_app_profile';
const empty:AppProfile={name:'',phone:'',gender:'',dob:'',addresses:[]};
export function readProfile():AppProfile{try{const v=JSON.parse(localStorage.getItem(KEY)||'null');return v&&Array.isArray(v.addresses)?{...empty,...v}:empty}catch{return empty}}
function writeProfile(p:AppProfile){try{localStorage.setItem(KEY,JSON.stringify(p))}catch{}}
const blank=():SavedAddress=>({id:'a'+Date.now(),label:'Home',name:'',phone:'',address:'',landmark:'',city:'',state:'',pincode:'',isDefault:false});
const STATES=['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Odisha','Punjab','Rajasthan','Tamil Nadu','Telangana','Uttar Pradesh','Uttarakhand','West Bengal','Other'];
export function ProfileView(){
const[p,setP]=useState<AppProfile>(readProfile);const[user,setUser]=useState(customerAuth.currentUser);const[err,setErr]=useState('');const[edit,setEdit]=useState<SavedAddress|null>(null);const[saved,setSaved]=useState(false);const[aerr,setAerr]=useState('');
useEffect(()=>watchCustomerIdentity(u=>setUser(u as any)),[]);
useEffect(()=>{writeProfile(p)},[p]);
const flash=()=>{setSaved(true);setTimeout(()=>setSaved(false),1400)};
const saveAddress=()=>{if(!edit)return;const e=edit;if(!e.name.trim()||!phoneValid(e.phone)||!e.address.trim()||!e.city.trim()||!e.state||!/^\d{6}$/.test(e.pincode.trim())){setAerr('Fill name, a 10-digit phone, address, city, state and a 6-digit PIN.');return}setAerr('');setP(old=>{let list=old.addresses.some(a=>a.id===e.id)?old.addresses.map(a=>a.id===e.id?e:a):[...old.addresses,e];if(e.isDefault||list.length===1)list=list.map(a=>({...a,isDefault:a.id===e.id||(list.length===1)}));return{...old,addresses:list}});setEdit(null);flash()};
const del=(id:string)=>setP(old=>{let list=old.addresses.filter(a=>a.id!==id);if(list.length&&!list.some(a=>a.isDefault))list=list.map((a,i)=>({...a,isDefault:i===0}));return{...old,addresses:list}});
const mk=(id:string)=>setP(old=>({...old,addresses:old.addresses.map(a=>({...a,isDefault:a.id===id}))}));
const f=(k:keyof SavedAddress)=>(ev:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>setEdit(e=>e?{...e,[k]:ev.target.value}:e);
return <main className="app-main profile">
<section className="app-panel"><h3><User size={16}/> Your account</h3>
{user&&user.email?<div className="prof-signed"><span><b>{user.displayName||'Signed in'}</b><small>{user.email}</small></span><button className="app-btn outline" onClick={()=>signOut(customerAuth)}><LogOut size={14}/> Sign out</button></div>:<><p>Sign in with your Google email to place orders and see your order history. No password needed.</p><button className="app-btn" onClick={async()=>{setErr('');try{await customerSignIn()}catch{setErr('Sign-in did not finish. Please try again.')}}}>Continue with Google</button>{err&&<p role="alert" className="prof-err">{err}</p>}</>}</section>
<section className="app-panel"><h3>Your details</h3>
<label className="prof-f">Full name<input value={p.name} onChange={e=>setP({...p,name:e.target.value})} autoComplete="name" placeholder="Your name"/></label>
<label className="prof-f">Mobile number<PhoneField value={p.phone} onChange={v=>setP({...p,phone:v})}/><small>Used only for delivery updates.</small></label><VerifyMobile phone={p.phone} onVerified={()=>setUser(customerAuth.currentUser)}/>
<label className="prof-f">Email<input value={user?.email||''} readOnly placeholder="Sign in to add your email"/></label>
<label className="prof-f">Date of birth (optional)<input type="date" value={p.dob||''} min="1900-01-01" max={new Date().toISOString().slice(0,10)} onChange={e=>setP({...p,dob:e.target.value})}/></label><fieldset className="prof-gender"><legend>Gender (optional)</legend>{([['male','Male'],['female','Female'],['','Prefer not to say']] as const).map(([v,l])=><button type="button" key={l} aria-pressed={p.gender===v} className={p.gender===v?'on':''} onClick={()=>setP({...p,gender:v})}>{l}</button>)}</fieldset>
<p className="prof-note">This is saved on this device only. It is not uploaded or shared.</p></section>
<section className="app-panel"><h3><MapPin size={16}/> Delivery addresses</h3>
{p.addresses.map(a=><div className="addr" key={a.id}><div><b>{a.label}</b>{a.isDefault&&<em>Default</em>}<p>{a.name}, {a.phone}<br/>{a.address}{a.landmark?`, ${a.landmark}`:''}<br/>{a.city}, {a.state} {a.pincode}</p></div><div className="addr-act">{!a.isDefault&&<button onClick={()=>mk(a.id)}>Set default</button>}<button aria-label="Edit address" onClick={()=>setEdit(a)}><Pencil size={15}/></button><button aria-label="Delete address" onClick={()=>del(a.id)}><Trash2 size={15}/></button></div></div>)}
{!p.addresses.length&&!edit&&<p>No saved address yet. Add one and it fills in at checkout.</p>}
{edit?<div className="addr-form"><div className="prof-gender">{(['Home','Work','Other'] as const).map(l=><button type="button" key={l} aria-pressed={edit.label===l} className={edit.label===l?'on':''} onClick={()=>setEdit({...edit,label:l})}>{l}</button>)}</div>
<label className="prof-f">Name<input value={edit.name} onChange={f('name')}/></label><label className="prof-f">Phone<PhoneField value={edit.phone} onChange={v=>setEdit({...edit,phone:v})}/></label><label className="prof-f">Address (house, street, area)<input value={edit.address} onChange={f('address')}/></label><label className="prof-f">Landmark (optional)<input value={edit.landmark} onChange={f('landmark')}/></label><div className="prof-row"><label className="prof-f">City<input value={edit.city} onChange={f('city')}/></label><label className="prof-f">PIN code<input value={edit.pincode} onChange={f('pincode')} inputMode="numeric" maxLength={6}/></label></div><label className="prof-f">State<select value={edit.state} onChange={f('state')}><option value="">Select state</option>{STATES.map(s=><option key={s}>{s}</option>)}</select></label>
<label className="prof-chk"><input type="checkbox" checked={edit.isDefault} onChange={e=>setEdit({...edit,isDefault:e.target.checked})}/> Make this my default address</label>{aerr&&<p role="alert" className="prof-err">{aerr}</p>}<div className="prof-row"><button className="app-btn" onClick={saveAddress}>Save address</button><button className="app-btn outline" onClick={()=>{setEdit(null);setAerr('')}}>Cancel</button></div></div>:<button className="app-btn outline" onClick={()=>setEdit({...blank(),name:p.name,phone:p.phone})}><Plus size={16}/> Add new address</button>}
{saved&&<p className="prof-ok"><Check size={14}/> Saved</p>}</section></main>}
