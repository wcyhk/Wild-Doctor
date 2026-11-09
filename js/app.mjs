import {fitPhoto,validateSource,normalizeCandidates,searchUrl,MAX_BASE64_LENGTH} from './photo-model.mjs';
const $=s=>document.querySelector(s),video=$('#camera'),preview=$('#preview');
let stream=null,photo=null,busy=false,preparing=false,request=null,cameraGeneration=0;
const history=[];
const externalHost=location.hostname.endsWith('.github.io')||['wcy.hk','www.wcy.hk'].includes(location.hostname);
const apiOrigin=externalHost?String(window.WILD_DOCTOR_API_ORIGIN||'https://wild-doctor-wcyhk.onrender.com').replace(/\/$/,''):location.origin;
const feedback=text=>{$('#feedback').textContent=text;};
function controls(){
 $('#identify').disabled=!photo||busy||preparing||!$('#consent').checked;
 for(const id of ['choose-photo','open-camera','take-photo'])$('#'+id).disabled=busy||preparing;
 $('#cancel').hidden=!busy;$('#clear-photo').hidden=!photo||busy||preparing;$('#photo-file').disabled=busy||preparing;
 $('.result').setAttribute('aria-busy',String(busy));
}
function stopCamera(){cameraGeneration++;stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;video.hidden=true;$('#take-photo').hidden=true;$('#close-camera').hidden=true;$('#open-camera').hidden=false;$('#empty-preview').hidden=Boolean(photo);}
function resultHeading(title,text){const root=$('#result-area');root.replaceChildren();const h=document.createElement('h3');h.id='result-title';h.textContent=title;const p=document.createElement('p');p.className='muted';p.textContent=text;root.append(h,p);return root;}
function setPhoto(data,width,height){photo=data;preview.src=data;preview.hidden=false;$('#empty-preview').hidden=true;$('#consent').checked=false;$('#photo-info').textContent=`${width} × ${height} · 裝置內縮圖`;feedback('相片只在裝置內預覽，尚未傳送。');resultHeading('相片已準備好','確認相片傳送選項，再按「辨識植物」。');controls();}
function encodePhoto(source,width,height){
 const fitted=fitPhoto(width,height),canvas=document.createElement('canvas');canvas.width=fitted.width;canvas.height=fitted.height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('瀏覽器未能準備相片，請重新選擇。');
 ctx.fillStyle='#f2f2e9';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(source,(canvas.width-fitted.drawnWidth)/2,(canvas.height-fitted.drawnHeight)/2,fitted.drawnWidth,fitted.drawnHeight);
 let data=canvas.toDataURL('image/jpeg',.86);if(data.split(',')[1].length>MAX_BASE64_LENGTH)data=canvas.toDataURL('image/jpeg',.65);if(data.split(',')[1].length>MAX_BASE64_LENGTH)throw Error('縮圖後仍然太大，請選擇另一張照片。');return {data,width:canvas.width,height:canvas.height};
}
async function loadPhoto(file){
 if(busy||preparing||!file)return;preparing=true;controls();feedback('正在裝置內準備相片…');let url;
 try{validateSource(file);stopCamera();url=URL.createObjectURL(file);const image=new Image();image.src=url;await image.decode();const encoded=encodePhoto(image,image.naturalWidth,image.naturalHeight);setPhoto(encoded.data,encoded.width,encoded.height);}
 catch(error){feedback(error.message||'未能讀取相片，請重新選擇。');}
 finally{if(url)URL.revokeObjectURL(url);preparing=false;controls();$('#photo-file').value='';}
}
$('#choose-photo').addEventListener('click',()=>$('#photo-file').click());$('#photo-file').addEventListener('change',e=>loadPhoto(e.target.files?.[0]));$('#consent').addEventListener('change',controls);
$('#clear-photo').addEventListener('click',()=>{photo=null;preview.removeAttribute('src');preview.hidden=true;$('#consent').checked=false;$('#photo-info').textContent='相片尚未傳送';$('#empty-preview').hidden=Boolean(stream);resultHeading('每片葉，都有故事。','加入一張清晰的植物照片，準備開始新的探索。');feedback('相片已從頁面清除。');controls();});
$('#open-camera').addEventListener('click',async()=>{
 if(busy||preparing)return;const mine=++cameraGeneration;$('#open-camera').disabled=true;
 try{if(!navigator.mediaDevices?.getUserMedia)throw Error('鏡頭需要 HTTPS 及瀏覽器支援；你亦可以選擇相片。');const next=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1600}},audio:false});if(mine!==cameraGeneration){next.getTracks().forEach(t=>t.stop());return;}stream=next;video.srcObject=stream;video.hidden=false;preview.hidden=true;$('#empty-preview').hidden=true;await video.play();if(mine!==cameraGeneration)return;$('#open-camera').hidden=true;$('#take-photo').hidden=false;$('#close-camera').hidden=false;feedback('鏡頭已開啟。對準植物，再按「拍下這一刻」；拍照後會關閉鏡頭。');}
 catch(error){if(mine===cameraGeneration){stopCamera();preview.hidden=!photo;feedback(error.name==='NotAllowedError'?'鏡頭權限未獲允許。你仍可選擇相片。':error.message||'未能開啟鏡頭，請改用選擇相片。');}}
 finally{controls();}
});
$('#close-camera').addEventListener('click',()=>{stopCamera();preview.hidden=!photo;feedback('鏡頭已關閉。');});
$('#take-photo').addEventListener('click',()=>{if(!video.videoWidth||preparing)return;preparing=true;controls();try{const encoded=encodePhoto(video,video.videoWidth,video.videoHeight);stopCamera();setPhoto(encoded.data,encoded.width,encoded.height);}catch(error){feedback(error.message);}finally{preparing=false;controls();}});
const drop=$('#dropzone');for(const name of ['dragenter','dragover'])drop.addEventListener(name,e=>{e.preventDefault();if(!busy)drop.classList.add('dragging');});for(const name of ['dragleave','drop'])drop.addEventListener(name,e=>{e.preventDefault();drop.classList.remove('dragging');if(name==='drop')loadPhoto(e.dataTransfer?.files?.[0]);});
function renderResults(candidates){
 const root=resultHeading(candidates.length?'這次的植物線索':'暫時未找到合適結果',candidates.length?'從候選植物開始，比較眼前的特徵。':'試試靠近葉片或花朵，讓主體清楚一點，再拍一張。');
 for(const [index,p]of candidates.entries()){
  const row=document.createElement('article');row.className='candidate';const name=document.createElement('span');name.className='candidate-name';name.textContent=`${String(index+1).padStart(2,'0')}　${p.name}`;const score=document.createElement('span');score.className='candidate-score';score.textContent=`相似分數 ${(p.score*100).toFixed(1)}%`;row.append(name,score);
  if(p.description){const text=document.createElement('p');text.className='result-description';text.textContent=p.description;row.append(text);}
  const link=document.createElement('a');link.href=searchUrl(p.name);link.target='_blank';link.rel='noopener noreferrer';link.className='candidate-more';link.textContent='搜尋維基百科資料 ↗';row.append(link);root.append(row);
 }
 if(candidates.length){const note=document.createElement('p');note.className='confidence-note';note.textContent='相似分數由辨識供應商提供，並非鑑定正確率。名稱及百科說明沿用供應商原文。';root.append(note);history.unshift({name:candidates[0].name,time:new Date().toLocaleTimeString('zh-HK',{hour:'2-digit',minute:'2-digit'})});history.splice(9);renderHistory();}
}
function renderHistory(){const root=$('#history');root.replaceChildren();for(const item of history){const card=document.createElement('div');card.className='history-item';const time=document.createElement('span');time.textContent=item.time+' · 本次探索';const name=document.createElement('strong');name.textContent=item.name;card.append(time,name);root.append(card);}$('#clear-history').hidden=!history.length;if(!history.length){const p=document.createElement('p');p.className='muted';p.textContent='第一個發現，正等着你。';root.append(p);}}
$('#clear-history').addEventListener('click',()=>{history.length=0;renderHistory();feedback('本次結果名稱已清除。');});$('#cancel').addEventListener('click',()=>request?.abort());
$('#identify').addEventListener('click',async()=>{
 if(busy||preparing||!photo||!$('#consent').checked)return;stopCamera();preview.hidden=false;busy=true;request=new AbortController();const active=request,deadline=setTimeout(()=>active.abort('timeout'),40000);controls();feedback('');const root=resultHeading('正在尋找植物線索…','首次使用可能需要等候服務啟動。相片正在送往辨識服務。');const spinner=document.createElement('div');spinner.className='spinner';spinner.setAttribute('aria-hidden','true');root.prepend(spinner);const loading=document.createElement('div');loading.className='loading-line';loading.setAttribute('aria-hidden','true');root.append(loading);
 try{const response=await fetch(apiOrigin+'/api/identify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({img:photo}),signal:active.signal});const data=await response.json();if(active.signal.aborted)return;if(!response.ok)throw Error(data.error||'辨識服務暫時未能完成，請稍後再試。');renderResults(normalizeCandidates(data.candidates));feedback('辨識完成，請比較植物特徵再作核對。');}
 catch(error){resultHeading(active.signal.aborted?'已停止等候':'暫時未能完成辨識',active.signal.aborted?(active.signal.reason==='timeout'?'服務回應較慢，請稍後再試。':'你已取消等候；已送出的供應商請求可能仍會完成。'):error.message==='Failed to fetch'?'未能連接辨識服務，請稍後再試。':error.message);}
 finally{clearTimeout(deadline);if(request===active){request=null;busy=false;controls();}}
});
window.addEventListener('pagehide',()=>{stopCamera();request?.abort();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopCamera();preview.hidden=!photo;}});
fetch(apiOrigin+'/api/status',{signal:AbortSignal.timeout(18000)}).then(async response=>{if(!response.ok)throw Error();const status=await response.json();$('#service-status').textContent=status.configured?'● 辨識服務已設定':'○ 辨識服務設定中 · 暫未能辨識';$('#service-status').classList.toggle('ready',Boolean(status.configured));}).catch(()=>{$('#service-status').textContent='○ 服務正在啟動 · 稍後可重試';});controls();
