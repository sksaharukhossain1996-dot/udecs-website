export function validateCustomerContact(name:string,phone:string,email:string,gender='prefer_not_to_say',address=''){
 name=name.trim();phone=phone.trim();address=address.trim();
 if(name.length<2||name.length>120)throw Error('Enter a name between2 and120 characters.');
 if(!/^\+?[0-9]{7,15}$/.test(phone))throw Error('Enter a valid phone number with country code.');
 if(!email)throw Error('Verified Google email required.');
 if(!['female','male','other','prefer_not_to_say'].includes(gender))throw Error('Choose a gender option, or prefer not to say.');
 if(address.length<5||address.length>500)throw Error('Enter your address (5-500 characters).');
 return{name,phone,email,gender,address,source:'mysa' as const,phoneVerified:false as const,noticeVersion:'customer-profile-v2' as const};
}
