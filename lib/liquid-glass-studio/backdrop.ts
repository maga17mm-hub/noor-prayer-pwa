type Scene={canvas:HTMLCanvasElement;x:number;y:number};
type Listener=(scene:Scene)=>void;
const listeners=new Set<Listener>();
let scene:Scene|null=null,observer:MutationObserver|null=null,timer:ReturnType<typeof setTimeout>|null=null,frame=0,capturing=false,pending=false;
function notify(){if(scene)for(const fn of listeners)fn(scene);}
function redraw(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;notify();});}
function requestCapture(){if(!timer)timer=setTimeout(capture,100);}
async function capture(){
 timer=null;if(!listeners.size||document.hidden)return;if(capturing){pending=true;return;}capturing=true;
 try{
  const {default:html2canvas}=await import('html2canvas');const margin=400,x=window.scrollX,scrollY=window.scrollY,y=Math.max(0,scrollY-margin),w=window.innerWidth,h=window.innerHeight;
  const canvas=await html2canvas(document.body,{x,y,width:w,height:h+margin*2,windowWidth:w,windowHeight:h,scrollX:x,scrollY,scale:1,logging:false,useCORS:true,backgroundColor:getComputedStyle(document.body).backgroundColor,removeContainer:true,
   onclone(doc){
    // Keep layout intact while exposing the actual surface behind every lens.
    doc.querySelectorAll<HTMLElement>('.liquid-glass').forEach(el=>el.style.setProperty('opacity','0','important'));
    doc.querySelectorAll<HTMLElement>('article,.surah-item,.discovery-card').forEach(el=>{const r=el.getBoundingClientRect();if(r.bottom<-margin||r.top>h+margin)el.style.visibility='hidden';});
   }});
  scene={canvas,x,y};notify();
 }catch(error){console.warn('Liquid Glass backdrop unavailable',error instanceof Error?error.message:'capture failed');}
 finally{capturing=false;if(pending){pending=false;requestCapture();}}
}
function onScroll(){redraw();requestCapture();}
function onVisibility(){if(!document.hidden)requestCapture();}
function start(){
 window.addEventListener('scroll',onScroll,{passive:true,capture:true});window.addEventListener('resize',requestCapture,{passive:true});window.addEventListener('load',requestCapture,true);document.addEventListener('visibilitychange',onVisibility);
 observer=new MutationObserver(records=>{
  const meaningful=records.some(r=>{
   const el=r.target instanceof Element?r.target:r.target.parentElement;
   if(el?.closest('.liquid-glass,.html2canvas-container'))return false;
   if(r.type==='childList'&&[...r.addedNodes,...r.removedNodes].every(n=>n instanceof Element&&n.classList.contains('html2canvas-container')))return false;
   return true;
  });if(meaningful)requestCapture();
 });observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','data-theme','data-glass']});
 document.fonts.ready.then(()=>requestCapture());requestCapture();
}
function stop(){observer?.disconnect();observer=null;window.removeEventListener('scroll',onScroll,true);window.removeEventListener('resize',requestCapture);window.removeEventListener('load',requestCapture,true);document.removeEventListener('visibilitychange',onVisibility);if(timer)clearTimeout(timer);if(frame)cancelAnimationFrame(frame);timer=null;frame=0;scene=null;}
export function subscribeBackdrop(fn:Listener){const first=listeners.size===0;listeners.add(fn);if(first)start();if(scene)fn(scene);return()=>{listeners.delete(fn);if(!listeners.size)stop();};}
export function refreshBackdrop(){requestCapture();}
