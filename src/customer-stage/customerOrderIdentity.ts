import type {User} from 'firebase/auth';
export function isVerifiedGoogleCustomer(user:Pick<User,'uid'|'email'|'emailVerified'|'providerData'>|null):boolean{
 return !!(user?.uid&&user.email&&user.emailVerified&&user.providerData.some(p=>['google.com','password'].includes(p.providerId)));
}
