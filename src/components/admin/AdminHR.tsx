import {SmartPayroll} from './SmartPayroll';
import React,{useState} from 'react';
import {EmployeeActions} from './EmployeeActions';
import {LegacyAdminHR} from './LegacyAdminHR';
import {useStore} from '../../context/StoreContext';
import {ADMIN_EMAILS} from '../../firebase/firestoreService';
export const AdminHR=()=>{const{firebaseUser}=useStore();const[legacy,setLegacy]=useState(false);if(!firebaseUser?.emailVerified||!ADMIN_EMAILS.includes((firebaseUser.email||'').toLowerCase()))return <p className="p-6">HR records are owner-only.</p>;return <div className="p-4 sm:p-8 max-w-7xl mx-auto"><h1 className="text-2xl font-bold mb-4">HR & Payroll - Cloud employee directory</h1><EmployeeActions/><SmartPayroll/><div className="mt-6 border rounded p-4 bg-amber-50"><p className="text-sm">Legacy attendance/payroll is browser-only, not migrated or linked to this cloud directory. Old calculations and payment labels have not been verified. Do not treat them as proof of salary payment.</p><button className="border p-3 rounded mt-3" onClick={()=>setLegacy(!legacy)}>{legacy?'Hide legacy tools':'Open legacy browser tools'}</button></div>{legacy&&<LegacyAdminHR/>}</div>;};
