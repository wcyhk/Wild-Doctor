import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {dirname,resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=dirname(fileURLToPath(import.meta.url));
const MAX_BYTES=8*1024*1024;
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon'};

export function createServer({apiKey=process.env.BAIDU_API_KEY,secretKey=process.env.BAIDU_SECRET_KEY,fetcher=fetch,clock=Date.now,dailyLimit=Number(process.env.DAILY_REQUEST_LIMIT)||100}={}){
 let token=null,tokenExpiry=0,tokenRequest=null;
 let usageDay='',dailyUsed=0;
 const configured=()=>Boolean(apiKey&&secretKey);
 const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 async function accessToken(){
  if(token&&clock()<tokenExpiry)return token;
  if(tokenRequest)return tokenRequest;
  tokenRequest=(async()=>{
   const response=await fetcher('https://aip.baidubce.com/oauth/2.0/token',{method:'POST',body:new URLSearchParams({grant_type:'client_credentials',client_id:apiKey,client_secret:secretKey}),signal:AbortSignal.timeout(15000)});
   const data=await response.json();
   if(!response.ok||!data.access_token)throw Object.assign(Error('植物辨識服務的金鑰未能通過驗證，請管理員檢查後台設定。'),{status:502});
   token=data.access_token;tokenExpiry=clock()+Math.max(30,(Number(data.expires_in)||300)-60)*1000;return token;
  })().finally(()=>{tokenRequest=null;});
  return tokenRequest;
 }
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  try{
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/')||url.pathname==='/wd/'){
    const origin=req.headers.origin;
    const ownHost=origin&&new URL(origin).host===req.headers.host;
    const allowed=origin&&(['https://wcy.hk','https://www.wcy.hk','https://wcyhk.github.io'].includes(origin)||ownHost);
    if(origin&&!allowed)return reply(res,403,{error:'不接受來自這個網站的請求。'});
    if(allowed){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS'){res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.writeHead(204);return res.end();}
   }
   if(url.pathname==='/healthz'||url.pathname==='/api/status')return reply(res,200,{ok:true,configured:configured()});
   if(['/api/identify','/wd/'].includes(url.pathname)&&req.method==='POST'){
    let size=0,chunks=[];
    for await(const chunk of req){size+=chunk.length;if(size>MAX_BYTES){reply(res,413,{error:'照片太大，請選擇 6 MB 以下的相片。'});return;}chunks.push(chunk);}
    let data;try{const body=Buffer.concat(chunks).toString('utf8');data=(req.headers['content-type']||'').includes('application/json')?JSON.parse(body):Object.fromEntries(new URLSearchParams(body));}catch{return reply(res,400,{error:'照片格式不正確。'});}
    const image=typeof data.img==='string'?data.img:'';
    const match=/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=\r\n]+)$/.exec(image);
    if(!match)return reply(res,400,{error:'請上傳 JPEG 或 PNG 相片。'});
    if(match[2].length>4*1024*1024)return reply(res,413,{error:'照片超過辨識服務上限，請先縮小再傳送。'});
    const bytes=Buffer.from(match[2],'base64');
    if(bytes.length>6*1024*1024)return reply(res,413,{error:'照片太大，請選擇 6 MB 以下的相片。'});
    const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
    if((match[1]==='png'&&!png)||(match[1]==='jpeg'&&!jpeg))return reply(res,400,{error:'未能讀取這張相片，請重新選擇。'});
    if(!configured())return reply(res,503,{error:'植物辨識服務尚待管理員設定新金鑰。相片未有傳送。'});
    const today=new Date(clock()).toISOString().slice(0,10);
    if(today!==usageDay){usageDay=today;dailyUsed=0;}
    if(dailyUsed>=Math.max(1,Math.min(10000,dailyLimit)))return reply(res,429,{error:'今日的網站辨識次數已達上限，請明日再試。'});
    dailyUsed++;
    const auth=await accessToken();
    const response=await fetcher('https://aip.baidubce.com/rest/2.0/image-classify/v1/plant?access_token='+encodeURIComponent(auth),{method:'POST',body:new URLSearchParams({image:match[2],baike_num:'3'}),signal:AbortSignal.timeout(20000)});
    const result=await response.json();
    if(!response.ok||result.error_code){if([110,111].includes(result.error_code)){token=null;tokenExpiry=0;}return reply(res,502,{error:'植物辨識服務暫時未能完成，請稍後再試，或請管理員檢查 API 權限及額度。'});}
    const candidates=(Array.isArray(result.result)?result.result:[]).slice(0,5).filter(x=>typeof x.name==='string').map(x=>({name:x.name,score:Math.max(0,Math.min(1,Number(x.score)||0)),description:typeof x.baike_info?.description==='string'?x.baike_info.description:''}));
    return reply(res,200,{candidates});
   }
   if(req.method!=='GET'&&req.method!=='HEAD')return reply(res,405,{error:'不支援這個操作。'});
   const path=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
   if(!(/^\/(?:index|about|contact)\.html$/.test(path)||/^\/(?:css|images|vendor)\/[\w./-]+$/.test(path)||['/js/index.js','/js/app.mjs','/js/photo-model.mjs','/config.js','/styles.css'].includes(path)))return reply(res,404,{error:'找不到頁面。'});
   const file=resolve(ROOT,'.'+path);if(!file.startsWith(ROOT+sep))return reply(res,404,{error:'找不到頁面。'});
   if(!(await stat(file)).isFile())return reply(res,404,{error:'找不到頁面。'});
   res.writeHead(200,{'Content-Type':MIME[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});
   res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch(error){reply(res,error.status||502,{error:error.status?error.message:'服務暫時未能完成，請稍後再試。'});}
 });
}
export function start(){const server=createServer();server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('Wild Doctor web service ready'));return server;}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))start();
