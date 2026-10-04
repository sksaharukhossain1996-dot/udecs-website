import type {Product} from '../types';
export const LISTING_CATEGORIES=['kitchen','sports','wholesale','industrial'] as const;
export interface ListingInput {name:string;description:string;price:string;stock:string;category:string;hsn:string;gstRate:string;photos:string[];listingType?:'retail'|'b2b';minimumOrderQty?:string;wholesalePrice?:string;}
export function buildListing(input:ListingInput,id:string):Product & {photos:string[];listingSource:string;listingType:'retail'|'b2b'} {
 const name=input.name.trim(),hsn=input.hsn.trim();
 if(!name||name.length>200)throw Error('Enter a product name (up to200 characters).');
 if(!/^\d+(\.\d{1,2})?$/.test(input.price)||Number(input.price)<=0||Number(input.price)>10000000)throw Error('Enter a valid price in rupees, up to2 decimal places.');
 if(!/^\d+$/.test(input.stock)||!Number.isSafeInteger(Number(input.stock))||Number(input.stock)>10000000)throw Error('Stock must be a whole number, including0.');
 if(!LISTING_CATEGORIES.includes(input.category as any))throw Error('Choose a category.');
 if(!/^\d{4,8}$/.test(hsn))throw Error('Enter the correct4 to8 digit HSN code. Check your supplier invoice; do not guess.');
 if(!['5','12','18','28'].includes(input.gstRate))throw Error('Choose the correct GST rate from your supplier invoice.');
 if(input.description.length>4000)throw Error('Description is too long (maximum4000 characters).');
 if(!input.photos.length||input.photos.length>3||input.photos.some(p=>!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(p)||p.length>160000))throw Error('Add1 to3 photos using Choose photos.');
 if(!/^OWNER_[a-f0-9]{32}$/.test(id))throw Error('Invalid listing reference.');
 const price=Number(input.price),listingType=input.listingType||'retail';
 if(!['retail','b2b'].includes(listingType))throw Error('Choose retail or B2B wholesale listing.');
 const minQty=listingType==='b2b'?Number(input.minimumOrderQty):1;
 const wholesalePrice=listingType==='b2b'?Number(input.wholesalePrice):price;
 if(listingType==='b2b'&&(!/^\d+$/.test(input.minimumOrderQty||'')||!Number.isSafeInteger(minQty)||minQty<2||minQty>10000000))throw Error('Wholesale minimum order must be a whole number of at least 2 pieces.');
 if(listingType==='b2b'&&(!/^\d+(\.\d{1,2})?$/.test(input.wholesalePrice||'')||wholesalePrice<=0||wholesalePrice>10000000))throw Error('Enter a valid wholesale price per piece.');
 return {id,sku:id,name,nameBn:name,nameHi:name,description:input.description.trim(),descriptionBn:input.description.trim(),category:input.category as Product['category'],price,wholesalePrice,minWholesaleQty:minQty,stock:Number(input.stock),minStockAlert:5,hsn,gstRate:Number(input.gstRate),gstExtra:true,shippingMode:'quote',stockManaged:true,minimumOrderQty:minQty,quantityStep:1,rating:0,reviewsCount:0,imageIcon:'i-box',imageUrl:input.photos[0],photos:input.photos,featured:false,listingSource:'owner-self-service',listingType};
}
export function sameListing(a:Record<string,any>,b:Record<string,any>){return JSON.stringify(sort(a))===JSON.stringify(sort(b));}
function sort(v:any):any{return Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;}
