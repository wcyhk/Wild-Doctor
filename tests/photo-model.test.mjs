import test from 'node:test';
import assert from 'node:assert/strict';
import {fitPhoto,validateSource,normalizeCandidates,searchUrl} from '../js/photo-model.mjs';
test('large phone photos fit provider bounds without cropping',()=>{
 const p=fitPhoto(4032,3024);assert.deepEqual(p,{width:1600,height:1200,drawnWidth:1600,drawnHeight:1200});
 for(const [w,h]of [[6000,500],[500,6000],[1600,533],[533,1600]]){const p=fitPhoto(w,h);assert.ok(Math.max(p.width,p.height)<=1600);assert.ok(Math.max(p.width/p.height,p.height/p.width)<=3);assert.ok(p.width>=p.drawnWidth&&p.height>=p.drawnHeight);}
});
test('invalid dimensions and unsupported or excessive source files are rejected',()=>{
 for(const pair of [[0,100],[Infinity,100],[100000,100000],[14,500]])assert.throws(()=>fitPhoto(...pair));
 for(const file of [{type:'image/heic',size:400},{type:'image/png',size:0},{type:'image/jpeg',size:21*1024*1024}])assert.throws(()=>validateSource(file));
 assert.doesNotThrow(()=>validateSource({type:'image/jpeg',size:12*1024*1024}));
});
test('malformed provider candidates are bounded and search names cannot inject URL parameters',()=>{
 assert.deepEqual(normalizeCandidates(null),[]);assert.deepEqual(normalizeCandidates([null,{}, {name:'   '}]),[]);
 const result=normalizeCandidates([{name:' <script> ',score:99,description:'x'.repeat(9000)}]);assert.equal(result[0].name,'<script>');assert.equal(result[0].score,1);assert.equal(result[0].description.length,6000);
 const url=new URL(searchUrl('玫瑰 & evil=true'));assert.equal(url.searchParams.get('search'),'玫瑰 & evil=true');assert.equal([...url.searchParams].length,1);
});
