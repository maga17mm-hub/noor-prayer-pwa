'use client';
import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {refractionMap} from '../../lib/liquid-glass-studio/refraction-map';

// Live backdrop pixels stay in the browser compositor. No DOM snapshots,
// scroll listeners, animation loop or per-control WebGL contexts are used.
export default function Glass({children,className='',as='div',...props}:{children:ReactNode;className?:string;as?:'div'|'button'|'nav';[key:string]:any}){
 const root=useRef<HTMLElement>(null),id='lens-'+useId().replace(/[^a-zA-Z0-9-]/g,'');
 const [map,setMap]=useState<string|null>(null);const Tag=as as any;
 useEffect(()=>{
  const element=root.current;if(!element)return;
  // WebKit/Gecko do not render SVG URL backdrop filters consistently. They
  // use their native blur/saturation material, with the same static rim.
  if(!/Chrome|Chromium|Edg\//.test(navigator.userAgent)||/CriOS|EdgiOS/.test(navigator.userAgent))return;
  let previous='',frame=0;
  const resize=new ResizeObserver(entries=>{
   const box=entries[0].borderBoxSize?.[0],{width,height}=box?{width:box.inlineSize,height:box.blockSize}:element.getBoundingClientRect();
   const radius=parseFloat(getComputedStyle(element).borderTopLeftRadius)||0,key=`${Math.round(width)}:${Math.round(height)}:${radius}`;
   if(key===previous||width<=0||height<=0)return;previous=key;
   cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>setMap(refractionMap(width,height,radius)));
  });resize.observe(element);return()=>{resize.disconnect();cancelAnimationFrame(frame);};
 },[]);
 return <Tag ref={root} className={`liquid-glass ${className}`} data-glass-renderer={map?'compositor-refraction':'native-backdrop'} {...props}>
  {map&&<svg className="glass-filter-defs" aria-hidden="true" focusable="false"><defs><filter id={id} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
   <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="soft"/>
   <feImage href={map} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="lens"/>
   <feDisplacementMap in="soft" in2="lens" scale="28" xChannelSelector="R" yChannelSelector="G" result="refracted"/>
   <feColorMatrix in="refracted" type="saturate" values="1.2"/>
  </filter></defs></svg>}
  <span className="glass-surface" aria-hidden="true" style={map?{backdropFilter:`url(#${id})`}:undefined}/>
  <span className="glass-rim" aria-hidden="true"/>
  <span className="glass-content">{children}</span>
 </Tag>;
}
