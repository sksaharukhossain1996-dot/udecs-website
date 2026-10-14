import test from 'node:test';import assert from 'node:assert/strict';import {parseProductVideoManifest,productVideoUrl,MAX_PRODUCT_VIDEOS,MAX_VIDEO_DURATION_SEC} from '../src/lib/productVideos';

const good={version:1,videos:{'0131_rechargeable_juiceblender':{file:'0131_rechargeable_juiceblender.mp4',durationSec:16},'0390_2in1_vaccum_cleaner':{file:'0390_2in1_vaccum_cleaner.mp4'}}};

test('valid manifest parses into a lookup map',()=>{const m=parseProductVideoManifest(good);assert.equal(m.size,2);assert.equal(m.get('0131_rechargeable_juiceblender')?.file,'0131_rechargeable_juiceblender.mp4');assert.equal(m.get('0390_2in1_vaccum_cleaner')?.durationSec,undefined);assert.equal(m.get('nope'),undefined);});

test('video URLs stay inside /product-videos/',()=>{assert.equal(productVideoUrl({file:'a_b-1.mp4'}),'/product-videos/a_b-1.mp4');});

test('rejects wrong shapes and versions',()=>{for(const raw of [null,undefined,[],'x',{}, {version:2,videos:{}},{version:1},{version:1,videos:[]},{version:1,videos:null}])assert.throws(()=>parseProductVideoManifest(raw));});

test('rejects path traversal and unsafe file names',()=>{for(const file of ['../sw.js','a/b.mp4','/abs.mp4','https://x/v.mp4','v.mp4.exe','v.mp 4','','v.webm'])assert.throws(()=>parseProductVideoManifest({version:1,videos:{prod_1:{file}}}),file);});

test('rejects unsafe product IDs',()=>{for(const id of ['../x','a b','a/b','-lead','_lead',''])assert.throws(()=>parseProductVideoManifest({version:1,videos:{[id]:{file:'v.mp4'}}}),id);});

test('rejects bad durations and oversized manifests',()=>{for(const durationSec of [0,-1,NaN,Infinity,MAX_VIDEO_DURATION_SEC+1,'16'])assert.throws(()=>parseProductVideoManifest({version:1,videos:{prod_1:{file:'v.mp4',durationSec:durationSec as any}}}));const big:Record<string,{file:string}>={};for(let n=0;n<MAX_PRODUCT_VIDEOS+1;n++)big['p'+n]={file:'v.mp4'};assert.throws(()=>parseProductVideoManifest({version:1,videos:big}));});

test('entry values must be plain objects',()=>{for(const v of [null,'v.mp4',[],16])assert.throws(()=>parseProductVideoManifest({version:1,videos:{prod_1:v}}));});
