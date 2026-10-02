import {getApps,initializeApp} from 'firebase/app';
import {getAuth,setPersistence,browserSessionPersistence,GoogleAuthProvider,onAuthStateChanged,signInWithPopup,signOut} from 'firebase/auth';
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
