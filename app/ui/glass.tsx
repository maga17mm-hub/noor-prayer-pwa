'use client';
import {useEffect,useRef,useId,useState,type ReactNode} from 'react';

// The Snell-law edge profile uses the optical parameters studied in
// iyinchao/liquid-glass-studio: n=1.4, thickness=20, RGB dispersion.
// Unlike a noise overlay, this map actually refracts the live DOM backdrop.
function refractionMap(w:number,h:number){
 const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
 const ctx=canvas.getContext('2d')!;const image=ctx.createImageData(w,h);
 const r=Math.min(w,h)/2,thickness=Math.min(20,h*.27),halfX=w/2,halfY=h/2;
 const sdf=(x:number,y:number)=>{const qx=Math.abs(x-halfX)-(halfX-r),qy=Math.abs(y-halfY)-(halfY-r);return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-r;};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const d=-sdf(x+.5,y+.5);let nx=0,ny=0,bend=0;
  if(d>=0&&d<thickness){nx=sdf(x+1,y)-sdf(x-1,y);ny=sdf(x,y+1)-sdf(x,y-1);const len=Math.hypot(nx,ny)||1;nx/=len;ny/=len;const incidence=Math.asin(Math.min(1,(1-d/thickness)**2)),refracted=Math.asin(Math.sin(incidence)/1.4);bend=Math.min(1,-Math.tan(refracted-incidence));}
  const i=(y*w+x)*4;image.data[i]=Math.round(128+nx*bend*127);image.data[i+1]=Math.round(128+ny*bend*127);image.data[i+2]=128;image.data[i+3]=255;
 }ctx.putImageData(image,0,0);return canvas.toDataURL();
}
export default function Glass({children,className='',as='div',...props}:{children:ReactNode;className?:string;as?:'div'|'button'|'nav';[key:string]:any}){
 const ref=useRef<HTMLElement>(null),id='lens-'+useId().replace(/[^a-z0-9]/gi,'');const [lens,setLens]=useState<{url:string;w:number;h:number}|null>(null);const Tag=as as any;
 useEffect(()=>{const el=ref.current;if(!el)return;
  const move=(e:PointerEvent)=>{const r=el.getBoundingClientRect();el.style.setProperty('--glare-x',`${(e.clientX-r.left)/r.width*100}%`);el.style.setProperty('--glare-y',`${(e.clientY-r.top)/r.height*100}%`);};
  const safari=/Safari/.test(navigator.userAgent)&&!/Chrome|Chromium|Edg/.test(navigator.userAgent);
  let previous='';const resize=()=>{const rect=el.getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height);const key=w+'x'+h;if(!safari&&w>0&&h>0&&previous!==key){previous=key;setLens({url:refractionMap(w,h),w,h});}};
  const observer=new ResizeObserver(resize);observer.observe(el);resize();el.addEventListener('pointermove',move);return()=>{observer.disconnect();el.removeEventListener('pointermove',move);};
 },[]);
 return <Tag ref={ref} className={`liquid-glass ${className}`} {...props}>
 {lens&&<svg className="filter-defs" aria-hidden="true"><defs><filter id={id} x="0" y="0" width={lens.w} height={lens.h} filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB"><feImage href={lens.url} x="0" y="0" width={lens.w} height={lens.h} result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="20" xChannelSelector="R" yChannelSelector="G" result="refracted"/><feColorMatrix in="refracted" type="saturate" values="1.35"/></filter></defs></svg>}
 <span className="glass-backdrop" style={lens?{backdropFilter:`url(#${id}) blur(14px) saturate(1.3)`}:undefined} aria-hidden="true"/><span className="glass-optics" aria-hidden="true"/><span className="glass-content">{children}</span></Tag>;
}
