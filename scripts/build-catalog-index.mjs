// Offline manifest builder. Never reads credentials or writes production.
import fs from 'node:fs';
import {CHUNK_COUNT,chunkId,searchEntry,INDEX_VERSION} from '../public/catalog-index-core.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node scripts/build-catalog-index.mjs verified-products.json catalog-index.json');
const products=JSON.parse(fs.readFileSync(input,'utf8'));
if(!Array.isArray(products))throw Error('Input must be an array of verified live product records with id.');
const chunks=Array.from({length:CHUNK_COUNT},(_,n)=>({id:String(n).padStart(2,'0'),version:INDEX_VERSION,entries:[]}));
const seen=new Set();
for(const p of products){if(!p.id||seen.has(p.id))throw Error('Missing/duplicate product ID');seen.add(p.id);const entry=searchEntry(p.id,p);if(entry)chunks[Number(chunkId(p.id))].entries.push(entry);}
for(const chunk of chunks){chunk.entries.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);if(Buffer.byteLength(JSON.stringify(chunk))>700000)throw Error('Chunk exceeds safe capacity');}
fs.writeFileSync(output,JSON.stringify({version:INDEX_VERSION,chunks},null,2)+'\n');
console.log(JSON.stringify({products:products.length,searchEntries:chunks.reduce((n,c)=>n+c.entries.length,0),chunks:chunks.length,largestBytes:Math.max(...chunks.map(c=>Buffer.byteLength(JSON.stringify(c))))}));
