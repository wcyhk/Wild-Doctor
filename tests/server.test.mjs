import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {createServer} from '../server.mjs';
const image='data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64');
async function withServer(options,run){const s=createServer(options);s.listen(0,'127.0.0.1');await once(s,'listening');try{await run('http://127.0.0.1:'+s.address().port);}finally{s.closeAllConnections();await new Promise(r=>s.close(r));}}
test('public site works without keys while identification reports configuration requirement',async()=>{
 await withServer({apiKey:'',secretKey:''},async origin=>{
  assert.equal((await fetch(origin+'/')).status,200);
  assert.match((await fetch(origin+'/js/app.mjs')).headers.get('content-type'),/javascript/);
  assert.match((await fetch(origin+'/images/explorer.webp')).headers.get('content-type'),/image\/webp/);
  assert.deepEqual(await(await fetch(origin+'/api/status')).json(),{ok:true,configured:false});
  const result=await fetch(origin+'/api/identify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({img:image})});
  assert.equal(result.status,503);assert.ok((await result.json()).error.includes('未有傳送'));
  assert.equal((await fetch(origin+'/server.mjs')).status,404);
  assert.equal((await fetch(origin+'/js/server.js')).status,404);
 });
});
test('validates images and allows only own website origins',async()=>{
 await withServer({apiKey:'',secretKey:''},async origin=>{
  assert.equal((await fetch(origin+'/api/identify',{method:'OPTIONS',headers:{Origin:'https://evil.example'}})).status,403);
  const preflight=await fetch(origin+'/api/identify',{method:'OPTIONS',headers:{Origin:'https://wcy.hk'}});
  assert.equal(preflight.status,204);assert.equal(preflight.headers.get('access-control-allow-origin'),'https://wcy.hk');
  const result=await fetch(origin+'/api/identify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({img:'data:image/png;base64,YWJj'})});
  assert.equal(result.status,400);
 });
});
test('server-only credentials obtain a cached token and return bounded plain text plant results',async()=>{
 let calls=[];const fetcher=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.includes('/oauth/')?{access_token:'private-test-token',expires_in:3600}:{result:[{name:'測試植物',score:.9,baike_info:{description:'示範說明'}}]}));};
 await withServer({apiKey:'test-key',secretKey:'test-secret',fetcher},async origin=>{
  for(let i=0;i<2;i++){
   const response=await fetch(origin+'/api/identify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({img:image})});
   assert.equal(response.status,200);const raw=await response.text();assert.ok(!raw.includes('private-test-token'));assert.ok(!raw.includes('test-secret'));assert.equal(JSON.parse(raw).candidates[0].name,'測試植物');
  }
 });
 assert.equal(calls.filter(x=>x.url.includes('/oauth/')).length,1);
 assert.equal(calls[0].options.body.get('client_secret'),'test-secret');
});
test('daily admission limit prevents additional paid provider requests',async()=>{
 let calls=0;const fetcher=async url=>{calls++;return new Response(JSON.stringify(url.includes('/oauth/')?{access_token:'t',expires_in:3600}:{result:[]}));};
 await withServer({apiKey:'test',secretKey:'test',fetcher,dailyLimit:1},async origin=>{
  const send=()=>fetch(origin+'/api/identify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({img:image})});
  assert.equal((await send()).status,200);assert.equal((await send()).status,429);assert.equal(calls,2);
 });
});
