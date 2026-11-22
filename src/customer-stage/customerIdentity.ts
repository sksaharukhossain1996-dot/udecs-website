import {getApps,initializeApp} from 'firebase/app';
import {getAuth,setPersistence,browserSessionPersistence,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink,RecaptchaVerifier,signInWithPhoneNumber,type ConfirmationResult} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
// Named client isolates customer sign-in from the existing staff listener/provider.
const name='udecs-customer-stage';
const app=getApps().find(a=>a.name===name)||initializeApp(firebaseConfig,name);
export const customerAuth=getAuth(app);
export const customerDb=getFirestore(app,(firebaseConfig as any).firestoreDatabaseId);
export async function customerSignIn(){
 await setPersistence(customerAuth,browserSessionPersistence);
 const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 return (await signInWithPopup(customerAuth,provider)).user;
}
export async function customerSignOut(){await signOut(customerAuth);}

export const watchCustomerIdentity=(callback:Parameters<typeof onAuthStateChanged>[1])=>onAuthStateChanged(customerAuth,callback);

export const isCustomerEmailLink=()=>isSignInWithEmailLink(customerAuth,window.location.href);
export async function sendCustomerEmailLink(email:string){
 const value=email.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('Enter your email address.');
 await sendSignInLinkToEmail(customerAuth,value,{url:window.location.origin+'/?customer-portal=1',handleCodeInApp:true});
 sessionStorage.setItem('udecs-email-link-address',value);
}
export async function completeCustomerEmailLink(email:string){
 if(!isCustomerEmailLink())throw Error('This is not a sign-in link.');
 await setPersistence(customerAuth,browserSessionPersistence);
 const result=await signInWithEmailLink(customerAuth,email.trim(),window.location.href);
 sessionStorage.removeItem('udecs-email-link-address');
 window.history.replaceState({},'',window.location.origin+'/?customer-portal=1');return result.user;
}

// Mobile OTP sign-in (Firebase Phone Auth). The verifier must live on a stable
// element; one pending confirmation at a time per page.
let phoneConfirmation:ConfirmationResult|null=null;
let phoneVerifier:RecaptchaVerifier|null=null;
export async function customerStartPhoneSignIn(phoneE164:string,containerId:string){
 const value=phoneE164.trim();
 if(!/^\+[1-9][0-9]{6,14}$/.test(value))throw Error('Enter your mobile number with country code, like +919876543210.');
 await setPersistence(customerAuth,browserSessionPersistence);
 if(phoneVerifier){try{phoneVerifier.clear();}catch{}}
 phoneVerifier=new RecaptchaVerifier(customerAuth,containerId,{size:'invisible'});
 phoneConfirmation=await signInWithPhoneNumber(customerAuth,value,phoneVerifier);
}
export async function customerConfirmPhoneCode(code:string){
 if(!phoneConfirmation)throw Error('Request the OTP first.');
 const value=code.trim();
 if(!/^[0-9]{6}$/.test(value))throw Error('Enter the 6-digit OTP.');
 const user=(await phoneConfirmation.confirm(value)).user;
 phoneConfirmation=null;
 return user;
}
