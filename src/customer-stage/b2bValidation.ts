export function validateB2b(businessName:string,gstin:string,pan:string,deliveryAddress:string){
 businessName=businessName.trim();gstin=gstin.trim().toUpperCase();pan=pan.trim().toUpperCase();deliveryAddress=deliveryAddress.trim();
 if(businessName.length<2||businessName.length>160)throw Error('Enter your business name (2-160 characters).');
 if(!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan))throw Error('Enter a PAN in its 10-character format.');
 if(!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin)||gstin.slice(2,12)!==pan)throw Error('Enter a GSTIN containing the same PAN.');
 if(deliveryAddress.length<5||deliveryAddress.length>500)throw Error('Enter your delivery address (5-500 characters).');
 return {businessName,gstin,pan,deliveryAddress};
}
