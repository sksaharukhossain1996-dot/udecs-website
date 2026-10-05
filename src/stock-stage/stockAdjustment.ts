export type StockChangeInput={productId:string;expectedStock:number;delta:number;reason:string;sourceReference:string;stockDate:string};
export type StockState={id:string;sku:string;stock:number;stockManaged?:boolean;supplier?:string;category?:string;hidden?:boolean;gatewayVerification?:boolean;updatedAt?:unknown};
export function validateStockChange(input:StockChangeInput){
 const v={...input,productId:input.productId.trim(),reason:input.reason.trim(),sourceReference:input.sourceReference.trim(),stockDate:input.stockDate.trim()};
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(v.productId))throw Error('Choose an existing exact product ID.');
 if(!Number.isSafeInteger(v.expectedStock)||v.expectedStock<0||v.expectedStock>10000000)throw Error('Refresh a valid available stock quantity.');
 if(!Number.isSafeInteger(v.delta)||v.delta===0||Math.abs(v.delta)>10000000)throw Error('Adjustment must be a non-zero whole number of units.');
 if(!v.reason||v.reason.length>500)throw Error('Enter an adjustment reason (max 500 characters).');
 if(v.sourceReference.length>200)throw Error('Source reference is too long.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(v.stockDate)||!Number.isFinite(Date.parse(v.stockDate+'T00:00:00Z'))||new Date(v.stockDate+'T00:00:00Z').toISOString().slice(0,10)!==v.stockDate)throw Error('Enter the recorded stock date.');
 return v;
}
export function planStockChange(current:StockState,input:StockChangeInput){const v=validateStockChange(input);
 if(current.id!==v.productId||!current.sku)throw Error('Exact product identity is unavailable.');
 if(current.stockManaged===false||current.supplier==='rajkot'||current.category==='wholesale')throw Error('Supplier-managed availability is separate from local stock.');
 if(current.hidden||current.gatewayVerification)throw Error('Hidden or verification-only products cannot be adjusted here.');
 if(!Number.isSafeInteger(current.stock)||current.stock<0)throw Error('Product has invalid local available stock.');
 if(current.stock!==v.expectedStock)throw Error('Available stock changed, possibly by an order reservation. Refresh before adjusting.');
 const after=current.stock+v.delta;if(!Number.isSafeInteger(after)||after<0||after>10000000)throw Error('Adjustment would make available stock invalid or negative.');
 return {input:v,beforeStock:current.stock,afterStock:after,sku:current.sku};
}
export function sameStockRequest(a:StockChangeInput,b:StockChangeInput){return JSON.stringify(validateStockChange(a))===JSON.stringify(validateStockChange(b));}
