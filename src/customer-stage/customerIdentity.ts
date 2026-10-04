import {getApps,initializeApp} from 'firebase/app';
import {getAuth,setPersistence,browserSessionPersistence,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut,sendSignInLinkToEmail,isSignInWithEmailLink,signInWithEmailLink} from 'firebase/auth';
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
