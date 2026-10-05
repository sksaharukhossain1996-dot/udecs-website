export interface ListingFacts {name:string;listingType:'retail'|'b2b';material:string;dimensions:string;included:string;use:string;care:string;}
const safe=(v:string,max=500)=>v.trim().slice(0,max);
export function factualListingDraft(f:ListingFacts){
 const name=safe(f.name,200);if(!name)throw Error('Enter the product name first.');
 const parts=[name];
 if(safe(f.use))parts.push('Use: '+safe(f.use)+'.');
 if(safe(f.material))parts.push('Material: '+safe(f.material)+'.');
 if(safe(f.dimensions))parts.push('Dimensions: '+safe(f.dimensions)+'.');
 if(safe(f.included))parts.push('Package includes: '+safe(f.included)+'.');
 if(safe(f.care))parts.push('Care: '+safe(f.care)+'.');
 if(parts.length<2)throw Error('Add at least one verified product fact. Nothing will be guessed from the name or photo.');
 return parts.join('\n\n');
}
export function imageDraftSize(width:number,height:number,target:800|2048|4096){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1)throw Error('Photo dimensions could not be verified.');
 const scale=target/Math.max(width,height);
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale)),enlarged:scale>1};
}
export function validateAssistantOutput(value:unknown){
 if(!value||typeof value!=='object')throw Error('AI response could not be verified.');
 const v=value as Record<string,unknown>;
 if(typeof v.description!=='string'||!v.description.trim()||v.description.length>4000||!Array.isArray(v.claimsToCheck)||v.claimsToCheck.some(x=>typeof x!=='string'))throw Error('AI response needs a description and fact-check list.');
 return {description:v.description,claimsToCheck:v.claimsToCheck as string[]};
}
