// Search by photo, fully on the customer's phone: the picture is never uploaded.
// MobileNet (free, loaded from a public CDN on first use) turns the photo into a
// fingerprint; it is compared with the fingerprints of product photos in /visual-index.json.
const TF='https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
const MN='https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js';
let model:any=null;let index:{ids:string[];dim:number;vecs:Int8Array}|null=null;
const load=(u:string)=>new Promise<void>((ok,no)=>{if([...document.scripts].some(s=>s.src===u))return ok();const s=document.createElement('script');s.src=u;s.onload=()=>ok();s.onerror=()=>no(new Error('load'));document.head.appendChild(s)});
async function ready(){
 if(!index){const j=await (await fetch('/visual-index.json')).json();const bin=atob(j.data);const v=new Int8Array(bin.length);for(let i=0;i<bin.length;i++)v[i]=(bin.charCodeAt(i)<<24)>>24;index={ids:j.ids,dim:j.dim,vecs:v}}
 if(!model){await load(TF);await load(MN);model=await (window as any).mobilenet.load({version:2,alpha:1.0})}
}
export async function searchByPhoto(file:File,limit=48):Promise<string[]>{
 await ready();const url=URL.createObjectURL(file);
 try{const img=new Image();img.src=url;await img.decode();
  const tf=(window as any).tf;const q:number[]=await (async()=>{const t=tf.tidy(()=>{const v=model.infer(img,true);return v.div(v.norm())});const a=Array.from(await t.data()) as number[];t.dispose();return a})();
  const {ids,dim,vecs}=index!;const scored:[number,string][]=[];
  for(let i=0;i<ids.length;i++){let s=0;const o=i*dim;for(let d=0;d<dim;d++)s+=q[d]*vecs[o+d];scored.push([s,ids[i]])}
  scored.sort((a,b)=>b[0]-a[0]);return scored.slice(0,limit).map(x=>x[1]);
 }finally{URL.revokeObjectURL(url)}
}
