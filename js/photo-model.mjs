export const MAX_BASE64_LENGTH=4*1024*1024;
export function fitPhoto(width,height,maxEdge=1600){
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<15||height<15||width*height>60000000)throw Error('相片尺寸不合適，請選擇清晰的植物照片。');
 const scale=Math.min(1,maxEdge/Math.max(width,height));
 const drawnWidth=Math.round(width*scale),drawnHeight=Math.round(height*scale);
 // Pad extremely wide images to the provider's 3:1 bound, preserving the entire subject.
 return {width:Math.max(drawnWidth,Math.ceil(drawnHeight/3)),height:Math.max(drawnHeight,Math.ceil(drawnWidth/3)),drawnWidth,drawnHeight};
}
export function validateSource(file){
 if(!file||!['image/jpeg','image/png'].includes(file.type))throw Error('請選擇 JPEG 或 PNG 相片；HEIC 相片請先轉換格式。');
 if(file.size<=0||file.size>20*1024*1024)throw Error('請選擇 20 MB 以下的相片，新版會自動縮小後再辨識。');
}
export function normalizeCandidates(value){
 if(!Array.isArray(value))return [];
 return value.slice(0,5).filter(p=>p&&typeof p.name==='string'&&p.name.trim()).map(p=>({name:p.name.trim().slice(0,120),score:Math.max(0,Math.min(1,Number(p.score)||0)),description:typeof p.description==='string'?p.description.slice(0,6000):''}));
}
export function searchUrl(name){return 'https://zh.wikipedia.org/w/index.php?search='+encodeURIComponent(name);}
