import {validateCustomerContact,validateCustomerPhoneContact} from './customerValidation';
import {customerAuth as auth,customerDb as db} from './customerIdentity';
export {customerSignIn} from './customerIdentity';
import {doc,setDoc,getDocFromServer,serverTimestamp} from 'firebase/firestore';
export type CustomerContact={name:string;phone:string;email:string;source:'mysa';phoneVerified:boolean;noticeVersion:'customer-profile-v2';gender:string;address:string};
export async function saveCustomerContact(name:string,phone:string,gender:string,address:string){
 const user=auth.currentUser;
 let contact:CustomerContact;
 if(user?.emailVerified&&user.email){
  contact=validateCustomerContact(name,phone,user.email,gender,address);
 }else if(user?.phoneNumber){
  // Phone-OTP session: the verified number comes from the token, not the form.
  contact=validateCustomerPhoneContact(name,user.phoneNumber,gender,address);
 }else{
  throw new Error('Sign in with your verified email or mobile OTP first.');
 }
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
 const isEmailUser=!!(user?.emailVerified&&user.email);
 const isPhoneUser=!!(!isEmailUser&&user?.phoneNumber);
 if(!user||user.uid!==uid||(!isEmailUser&&!isPhoneUser))throw new Error('Sign in with your verified email or mobile OTP first.');
 const snapshot=await getDocFromServer(doc(db,'customers',uid));
 if(auth.currentUser?.uid!==uid)throw new Error('Account changed. Sign in again before continuing.');
 if(!snapshot.exists())return null;
 const data=snapshot.data();
 if(data.source!=='mysa'||data.noticeVersion!=='customer-profile-v2')throw new Error('Saved customer details could not be verified. Please review your details.');
 if(isEmailUser){
  if(data.email!==user.email||data.phoneVerified!==false)throw new Error('Saved customer details could not be verified. Please review your details.');
  return validateCustomerContact(data.name,data.phone,data.email,data.gender,data.address);
 }
 if(data.email!==''||data.phone!==user.phoneNumber||data.phoneVerified!==true)throw new Error('Saved customer details could not be verified. Please review your details.');
 return validateCustomerPhoneContact(data.name,data.phone,data.gender,data.address);
}
