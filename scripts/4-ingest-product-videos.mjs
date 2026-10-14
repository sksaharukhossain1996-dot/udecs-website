// Offline product video ingest. Never reads credentials or writes production.
// Usage: node scripts/ingest-product-videos.mjs <sourceDir> <catalog-index.json> [--replace]
// <catalog-index.json> is an array of search entries ({id,sku,...}) exported from the live catalog index.
// Each source file must start with the product SKU digits (e.g. 0390-batch1.mp4 -> product 0390_*).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';

const [sourceDir,indexFile,flag]=process.argv.slice(2);
if(!sourceDir||!indexFile||(flag&&flag!=='--replace'))throw Error('Usage: node scripts/ingest-product-videos.mjs <sourceDir> <catalog-index.json> [--replace]');
const entries=JSON.parse(fs.readFileSync(indexFile,'utf8'));
if(!Array.isArray(entries)||!entries.length)throw Error('Catalog index must be a non-empty array.');
const MAX_BYTES=12*1024*1024,MAX_DURATION=40,MAX_W=1080,MAX_H=1920;
const outDir=path.join('public','product-videos');
const manifestFile=path.join(outDir,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
if(manifest.version!==1||typeof manifest.videos!=='object')throw Error('Manifest version unavailable.');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const report={added:[],replaced:[],unchanged:[],skipped:[]};
for(const name of fs.readdirSync(sourceDir).sort()){
  if(!name.toLowerCase().endsWith('.mp4'))continue;
  const sku=(name.match(/^(\d+)/)||[])[1];
  const src=path.join(sourceDir,name);
  const matches=sku?entries.filter(e=>e.id===sku||e.id.startsWith(sku+'_')||String(e.sku||'').startsWith(sku)):[];
  if(matches.length!==1){report.skipped.push({file:name,reason:matches.length?'ambiguous SKU '+sku:'no catalog product for SKU '+(sku||'unknown')});continue;}
  const id=matches[0].id;
  const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_type,codec_name,width,height:format=duration,size','-of','json',src],{encoding:'utf8'}));
  const v=probe.streams.find(s=>s.codec_type==='video'),a=probe.streams.find(s=>s.codec_type==='audio');
  const duration=Number(probe.format.duration),bytes=Number(probe.format.size);
  const problems=[];
  if(!v||v.codec_name!=='h264')problems.push('video codec must be h264');
  if(a&&a.codec_name!=='aac')problems.push('audio codec must be aac');
  if(!v||v.width>MAX_W||v.height>MAX_H)problems.push(`resolution over ${MAX_W}x${MAX_H}`);
  if(!(duration>0)||duration>MAX_DURATION)problems.push(`duration over ${MAX_DURATION}s`);
  if(bytes>MAX_BYTES)problems.push('file over 12MB');
  if(problems.length){report.skipped.push({file:name,reason:problems.join('; ')});continue;}
  const destName=id+'.mp4',dest=path.join(outDir,destName);
  const existed=fs.existsSync(dest);
  if(existed&&sha(dest)===sha(src)){report.unchanged.push(id);}
  else if(existed&&flag!=='--replace'){report.skipped.push({file:name,reason:'existing video differs; rerun with --replace after review'});continue;}
  else{fs.copyFileSync(src,dest);report[existed?'replaced':'added'].push(id);}
  manifest.videos[id]={file:destName,durationSec:Math.round(duration)};
}
const sorted={};for(const k of Object.keys(manifest.videos).sort())sorted[k]=manifest.videos[k];
manifest.videos=sorted;
fs.writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(report.skipped.length)process.exitCode=1;
