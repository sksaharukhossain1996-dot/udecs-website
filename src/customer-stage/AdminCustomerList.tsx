import React,{useState,useEffect} from 'react';
import './customer-stage.css';
import {auth,db} from '../firebase/config';
import {collection,getDocsFromServer,query,orderBy,limit} from 'firebase/firestore';
import {onAuthStateChanged} from 'firebase/auth';
import {ADMIN_EMAILS} from '../firebase/firestoreService';
export function AdminCustomerList({enabled=false}:{enabled?:boolean}){
 const [rows,setRows]=useState<any[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(!enabled)return;return onAuthStateChanged(auth,()=>{setRows([]);setError('');});},[enabled]);
 if(!enabled)return <section className="customer-stage"><h2>Customer list</h2><p>Not activated. No live customer data loaded.</p></section>;
 const load=async()=>{setError('');const user=auth.currentUser;if(!user?.emailVerified||!ADMIN_EMAILS.includes((user.email||'').toLowerCase())){setError('An authorized admin account is required.');return}setBusy(true);setRows([]);try{const ownerUid=user.uid;const result=await getDocsFromServer(query(collection(db,'customers'),orderBy('updatedAt','desc'),limit(100)));if(auth.currentUser?.uid!==ownerUid)throw Error('Account changed');setRows(result.docs.map(d=>({id:d.id,...d.data()})))}catch{setError('Customer list could not be loaded. No customer records are shown.');setRows([])}finally{setBusy(false)}};
 return <section className="customer-stage"><h2>Customer list</h2><p>Up to 100 most recently updated entries. Phone numbers are not verified.</p><button onClick={load} disabled={busy}>Load customer list</button>{error&&<p role="alert">{error}</p>}<div className="customer-cards">{rows.length===0?<p>No customer entries loaded.</p>:rows.map(r=><article key={r.id} className="customer-card"><strong>{String(r.name||'')}</strong><dl><dt>Phone (unverified)</dt><dd>{String(r.phone||'')}</dd><dt>Google email</dt><dd>{String(r.email||'')}</dd><dt>Gender</dt><dd>{r.gender==='prefer_not_to_say'?'Prefer not to say':String(r.gender||'')}</dd><dt>Address</dt><dd>{String(r.address||'')}</dd><dt>Source</dt><dd>{String(r.source||'')}</dd></dl></article>)}</div></section>;
}
