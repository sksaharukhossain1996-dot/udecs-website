export type GstDraftInput={invoiceNumber:string;invoiceDate:string;customerName:string;recipientGstin:string;placeOfSupply:string;taxableValue:number;cgst:number;sgst:number;igst:number;invoiceValue:number;sourceOrderId:string;note:string};
export type GstDraft=GstDraftInput&{id:string;status:'draft'|'archived';revision:number;createdBy:string;createdAt:string;updatedBy:string;updatedAt:string};
export const GST_FIELDS=['invoiceNumber','invoiceDate','customerName','recipientGstin','placeOfSupply','taxableValue','cgst','sgst','igst','invoiceValue','sourceOrderId','note'] as const;
export function validateGstDraft(input:GstDraftInput):GstDraftInput{
 const out={...input};for(const [key,max] of [['invoiceNumber',16],['invoiceDate',10],['customerName',120],['recipientGstin',15],['placeOfSupply',2],['sourceOrderId',128],['note',1000]] as const){if(typeof out[key]!=='string'||out[key].length>max)throw Error(`Invalid ${key}`);out[key]=out[key].trim();}
 if(!/^[A-Za-z0-9/-]{1,16}$/.test(out.invoiceNumber))throw Error('Invoice number: 1-16 letters, digits, / or -.');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(out.invoiceDate)||new Date(out.invoiceDate+'T00:00:00Z').toISOString().slice(0,10)!==out.invoiceDate)throw Error('Enter a valid invoice date.');
 if(!out.customerName)throw Error('Customer name required.');
 if(out.recipientGstin&&!/^\d{2}[A-Z0-9]{13}$/.test(out.recipientGstin))throw Error('GSTIN must be 15 uppercase characters. Check it against the invoice; registration is not verified here.');
 if(!/^(0[1-9]|[12]\d|3[0-8]|97)$/.test(out.placeOfSupply))throw Error('Enter a valid two-digit place-of-supply code from the invoice.');
 for(const k of ['taxableValue','cgst','sgst','igst','invoiceValue']as const)if(!Number.isFinite(out[k])||out[k]<0||out[k]>100000000||Math.abs(out[k]*100-Math.round(out[k]*100))>0.00001)throw Error('Amounts must be non-negative rupees with at most two decimals.');
 if(out.igst>0&&(out.cgst>0||out.sgst>0))throw Error('IGST and CGST/SGST cannot both be entered for this draft invoice.');
 if(out.invoiceValue+0.01<out.taxableValue+out.cgst+out.sgst+out.igst)throw Error('Invoice value cannot be below the recorded taxable value plus taxes.');
 return out;
}
export function assertDraftRevision(current:GstDraft,opened:GstDraft){if(current.status!=='draft'||current.revision!==opened.revision)throw Error('Invoice draft changed or was archived. Refresh before saving.');}
export const EMPTY_GST_DRAFT:GstDraftInput={invoiceNumber:'',invoiceDate:'',customerName:'',recipientGstin:'',placeOfSupply:'',taxableValue:0,cgst:0,sgst:0,igst:0,invoiceValue:0,sourceOrderId:'',note:''};
