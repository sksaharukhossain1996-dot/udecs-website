import {collection,query,where,onSnapshot,doc,runTransaction,serverTimestamp,getDocFromServer} from 'firebase/firestore';
import {db,auth} from './config';
import {requireHROwner} from './employeeService';
export type CloudAttendance={id:string;employeeId:string;employeeName:string;date:string;month:string;status:'present'|'half-day'|'absent'|'leave';note:string;updatedBy:string};
export function subscribeAttendance(month:string,onData:(rows:CloudAttendance[])=>void,onError:(e:Error)=>void){
 const uid=requireHROwner();return onSnapshot(query(collection(db,'hrAttendance'),where('month','==',month)),{includeMetadataChanges:true},snapshot=>{
  if(auth.currentUser?.uid!==uid){onError(new Error('Account changed.'));return;}
  if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
  onData(snapshot.docs.map(d=>({...d.data(),id:d.id} as CloudAttendance)));
 },onError);
}
export async function saveAttendance(employeeId:string,employeeName:string,date:string,status:CloudAttendance['status'],note:string){
 const uid=requireHROwner();if(!/^EMP-[a-zA-Z0-9-]{10,80}$/.test(employeeId)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['present','half-day','absent','leave'].includes(status)||note.length>500)throw Error('Invalid attendance details.');
 const id=employeeId+'_'+date,ref=doc(db,'hrAttendance',id);const data={id,employeeId,employeeName,date,month:date.slice(0,7),status,note:note.trim(),updatedBy:uid};
 await runTransaction(db,async tx=>{if(requireHROwner()!==uid)throw Error('Account changed.');const employee=await tx.get(doc(db,'hrEmployees',employeeId));const old=await tx.get(ref);if(!employee.exists()||employee.data().name!==employeeName||employee.data().status!=='active')throw Error('Employee changed. Reload the roster before marking attendance.');tx.set(ref,{...data,createdAt:old.exists()?old.data().createdAt:serverTimestamp(),updatedAt:serverTimestamp()});});
 if(requireHROwner()!==uid)throw Error('Account changed.');const saved=await getDocFromServer(ref);if(!saved.exists()||Object.entries(data).some(([k,v])=>saved.data()[k]!==v))throw Error('Save could not be confirmed. Reload before retrying.');
}
