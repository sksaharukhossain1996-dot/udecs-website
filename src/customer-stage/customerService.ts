import {validateCustomerContact} from './customerValidation';
import {customerAuth as auth,customerDb as db} from './customerIdentity';
export {customerSignIn} from './customerIdentity';
import {doc,setDoc,getDocFromServer,serverTimestamp} from 'firebase/firestore';
export type CustomerContact={name:string;phone:string;email:string;source:'mysa';phoneVerified:false;noticeVersion:'customer-profile-v2';gender:string;address:string};
export async function saveCustomerContact(name:string,phone:string,gender:string,address:string){
 const user=auth.currentUser;
 if(!user?.emailVerified||!user.email)throw new Error('Sign in with your verified email first.');
 const contact=validateCustomerContact(name,phone,user.email,gender,address);
 const ref=doc(db,'customers',user.uid);
 await setDoc(ref,{...contact,updatedAt:serverTimestamp()});
 if(auth.currentUser?.uid!==user.uid)throw new Error('Account changed. Sign in again before continuing.');
 const saved=await getDocFromServer(ref);
 if(auth.currentUser?.uid!==user.uid)throw new Error('Account changed. Sign in again before continuing.');
 if(!saved.exists()||Object.entries(contact).some(([k,v])=>saved.data()?.[k]!==v))throw new Error('Save could not be confirmed. Please check your details before trying again.');
 return contact;
}

export async function getCustomerContact(uid:string):Promise<CustomerContact|null>{
 const user=auth.currentUser;
 if(!user?.emailVerified||user.uid!==uid||!user.email)throw new Error('Sign in with your verified email first.');
 const snapshot=await getDocFromServer(doc(db,'customers',uid));
 if(auth.currentUser?.uid!==uid)throw new Error('Account changed. Sign in again before continuing.');
 if(!snapshot.exists())return null;
 const data=snapshot.data();
 if(data.email!==user.email||data.source!=='mysa'||data.phoneVerified!==false||data.noticeVersion!=='customer-profile-v2')throw new Error('Saved customer details could not be verified. Please review your details.');
 return validateCustomerContact(data.name,data.phone,data.email,data.gender,data.address);
}
