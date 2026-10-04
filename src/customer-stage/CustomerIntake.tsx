import {CustomerEmailLogin} from './CustomerEmailLogin';
import React,{useState,useEffect} from 'react';
import './customer-stage.css';
import {customerAuth,customerSignIn,customerSignOut,watchCustomerIdentity} from './customerIdentity';
import {getCustomerContact,saveCustomerContact} from './customerService';
interface Props {enabled?:boolean;reviewExisting?:boolean;onSaved:()=>void}
export function CustomerIntake({enabled=false,reviewExisting=false,onSaved}:Props){
 const [profileChecked,setProfileChecked]=useState(false);
 const [email,setEmail]=useState(''),[name,setName]=useState(''),[phone,setPhone]=useState(''),[gender,setGender]=useState('prefer_not_to_say'),[address,setAddress]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{
  if(!enabled)return;let current=0,alive=true;
  const unsubscribe=watchCustomerIdentity(async user=>{
   const request=++current;setProfileChecked(false);setEmail(user?.email||'');setName('');setPhone('');setGender('prefer_not_to_say');setAddress('');setConsent(false);setError('');
   if(!user?.emailVerified){setBusy(false);return;}
   setBusy(true);
   try{const saved=await getCustomerContact(user.uid);if(!alive||request!==current)return;setProfileChecked(true);if(saved){if(reviewExisting){setName(saved.name);setPhone(saved.phone);setGender(saved.gender);setAddress(saved.address);}else onSaved();}}
   catch(err){if(alive&&request===current)setError(err instanceof Error?err.message:'Saved registration could not be checked.');}
   finally{if(alive&&request===current)setBusy(false);}
  });
  return()=>{alive=false;current++;unsubscribe();};
 },[enabled,reviewExisting]);
 if(!enabled)return <section className="customer-stage"><h2>Customer intake</h2><p>Not activated. No customer details are collected.</p></section>;
 const signIn=async()=>{setBusy(true);setError('');try{const user=await customerSignIn();setEmail(user.email||'')}catch{setError('Google sign-in did not finish. Please try again.')}finally{setBusy(false)}};
 const save=async(e:React.FormEvent)=>{e.preventDefault();if(!consent||!profileChecked)return;setBusy(true);setError('');try{await saveCustomerContact(name,phone,gender,address);onSaved()}catch(err){setError(err instanceof Error?err.message:'Your details were not saved. Please try again.')}finally{setBusy(false)}};
 return <>{!email&&<CustomerEmailLogin/>}<section className="customer-stage"><h2>Customer sign up / log in</h2><p>UDECS stores your name, phone, verified email, gender choice and address in its customer list for order and support help. This chat is not saved. Your phone is not verified.</p>{!email?<><p>Use your Google account to create your customer profile or log in. No UDECS password is needed.</p><div className="customer-entry-buttons"><button onClick={signIn} disabled={busy}>Sign up with Google</button><button onClick={signIn} disabled={busy}>Log in with Google</button></div></>:<form onSubmit={save}><p>Verified email: {email}</p><button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{await customerSignOut();setEmail('');setConsent(false);}catch{setError('Sign-out did not finish. Please try again.');}finally{setBusy(false);}}}>Use a different account</button><label>Name<input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label><label>Phone with country code<input required type="tel" maxLength={16} pattern="\+?[0-9]{7,15}" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>Gender (optional)<select value={gender} onChange={e=>setGender(e.target.value)}><option value="prefer_not_to_say">Prefer not to say</option><option value="female">Female</option><option value="male">Male</option><option value="other">Other</option></select></label><label>Address<textarea required minLength={5} maxLength={500} autoComplete="street-address" value={address} onChange={e=>setAddress(e.target.value)}/></label><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I agree that UDECS may save my name, phone, verified email, gender choice and address for order and support help.</span></label><button disabled={busy||!profileChecked||!consent||!customerAuth.currentUser?.emailVerified}>{busy?'Checking / saving...':'Save and continue'}</button></form>}{error&&<p role="alert">{error}</p>}</section></>;
}
