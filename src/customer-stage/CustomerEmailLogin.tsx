import React,{useState} from 'react';
import {sendCustomerEmailLink,completeCustomerEmailLink,isCustomerEmailLink} from './customerIdentity';
export function CustomerEmailLogin(){
 const [email,setEmail]=useState(sessionStorage.getItem('udecs-email-link-address')||'');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const completing=isCustomerEmailLink();
 const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{if(completing){await completeCustomerEmailLink(email);setMessage('Email verified. Continue with your customer details below.');}else{await sendCustomerEmailLink(email);setMessage('Sign-in link requested. Check your inbox and spam folder. Open it on this device, or enter the same email when opening it elsewhere.');}}catch{setError(completing?'Link could not be verified. Check the email address or request a fresh link.':'Sign-in link could not be sent. The daily limit may have been reached. You can use Google sign-in instead.');}finally{setBusy(false)}};
 return <section className="customer-stage"><h2>{completing?'Finish email sign-in':'Sign up / log in by email link'}</h2><p>No UDECS password. {completing?'Enter the email that received this link.':'Email links have a small daily sending limit. Google sign-in remains available.'}</p><form onSubmit={submit}><label>Email address<input required type="email" autoComplete="email" maxLength={120} value={email} onChange={e=>setEmail(e.target.value)}/></label><button disabled={busy}>{busy?'Please wait...':completing?'Verify email and sign in':'Send sign-in link'}</button></form>{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</section>;
}
