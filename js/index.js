const video=document.getElementById('video'),canvas=document.getElementById('canvas'),preview=document.getElementById('img');
const title=document.getElementById('ResultName'),description=document.getElementById('ResultDescription'),loading=document.getElementById('loadingMDI'),cameraButton=document.getElementById('snap');
let stream=null,busy=false;
const configuredOrigin=String(window.WILD_DOCTOR_API_ORIGIN||'').replace(/\/$/,'');
const apiOrigin=location.hostname.endsWith('.github.io')||['wcy.hk','www.wcy.hk'].includes(location.hostname)?configuredOrigin:location.origin;
function result(name,detail=''){title.textContent=name;description.textContent=detail;}
function stopCamera(){stream?.getTracks().forEach(track=>track.stop());stream=null;video.srcObject=null;video.style.display='none';cameraButton.textContent='開啟鏡頭';}
async function identify(img){
 if(busy)return;busy=true;loading.style.display='block';result('正在辨識植物…');
 try{
  const response=await fetch(apiOrigin+'/api/identify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({img}),signal:AbortSignal.timeout(35000)}),data=await response.json();
  if(!response.ok)throw Error(data.error||'暫時未能辨識，請稍後再試。');
  const top=data.candidates?.[0];if(!top)return result('未能找到合適結果','請選擇光線充足、植物主體清楚的照片再試。');
  result(top.name,top.description||'辨識結果只供植物探索及學習參考，請配合其他資料核對。');
  if(data.candidates.length>1){const p=document.createElement('p');p.textContent='其他可能：'+data.candidates.slice(1).map(x=>x.name).join('、');description.appendChild(p);}
 }catch(error){result('暫時未能完成辨識',error.name==='TimeoutError'?'服務正在啟動或回應較慢，請稍後再試。':error.message==='Failed to fetch'?'未能連接辨識服務，請稍後再試。':error.message);}
 finally{loading.style.display='none';busy=false;}
}
cameraButton.addEventListener('click',async()=>{
 if(busy)return;
 if(!stream){try{if(!navigator.mediaDevices?.getUserMedia)throw Error();stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});video.srcObject=stream;video.muted=true;video.playsInline=true;video.style.display='block';await video.play();cameraButton.textContent='拍照並辨識';result('鏡頭已開啟','請對準植物，再按「拍照並辨識」。');}catch{stopCamera();result('未能開啟鏡頭','你仍可以選擇 JPEG 或 PNG 相片進行辨識。');}return;}
 if(!video.videoWidth)return result('鏡頭準備中，請稍後再試。');
 const scale=Math.min(1,1600/video.videoWidth);canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
 const photo=canvas.toDataURL('image/jpeg',.88);preview.src=photo;preview.style.display='block';stopCamera();await identify(photo);
});
document.getElementById('uploadImage').addEventListener('change',async event=>{
 const file=event.target.files?.[0];if(!file||busy)return;
 if(!['image/jpeg','image/png'].includes(file.type))return result('請選擇 JPEG 或 PNG 相片。');
 if(file.size>6*1024*1024)return result('照片太大','請選擇 6 MB 以下的 JPEG 或 PNG 相片。');
 stopCamera();const reader=new FileReader();reader.onload=()=>{preview.src=reader.result;preview.style.display='block';identify(reader.result);};reader.onerror=()=>result('未能讀取相片，請重新選擇。');reader.readAsDataURL(file);
});
window.addEventListener('pagehide',stopCamera);
fetch(apiOrigin+'/api/status',{signal:AbortSignal.timeout(15000)}).then(r=>r.json()).then(s=>{if(!s.configured)result('植物辨識服務設定中','網站已恢復；待管理員加入新金鑰後即可進行照片辨識。');}).catch(()=>result('辨識服務正在啟動','首次連接可能需要稍候，你可以先選擇相片。'));
