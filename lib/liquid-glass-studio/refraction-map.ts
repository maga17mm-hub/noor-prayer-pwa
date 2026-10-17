// Rounded lens geometry and the Snell edge profile from Liquid Glass Studio.
// Only the immutable displacement field is rasterized, never the page itself.
// Rebuilt on control resize; the browser applies it to its LIVE backdrop.
const cache=new Map<string,string>();
export function lensOffset(depth:number,thickness=20,index=1.4){
 if(depth<0||depth>=thickness)return 0;
 const ratio=1-depth/thickness,incident=Math.asin(Math.min(1,ratio*ratio));
 const transmitted=Math.asin(Math.sin(incident)/index);
 return Math.min(1,Math.tan(incident-transmitted));
}
export function roundedDistance(x:number,y:number,width:number,height:number,radius:number){
 const qx=Math.abs(x-width/2)-(width/2-radius),qy=Math.abs(y-height/2)-(height/2-radius);
 return Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-radius;
}
export function refractionMap(width:number,height:number,radius:number){
 const w=Math.max(1,Math.round(width)),h=Math.max(1,Math.round(height)),r=Math.min(radius,w/2,h/2),key=`${w}:${h}:${r}`;
 const hit=cache.get(key);if(hit)return hit;
 // Half-resolution geometry is sufficient; live backdrop pixels remain full
 // device resolution. This caps one-time CPU work on large tablets.
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(w/2);canvas.height=Math.ceil(h/2);
 const ctx=canvas.getContext('2d')!;const image=ctx.createImageData(canvas.width,canvas.height);
 for(let py=0;py<canvas.height;py++)for(let px=0;px<canvas.width;px++){
  const x=(px+.5)*w/canvas.width,y=(py+.5)*h/canvas.height,d=roundedDistance(x,y,w,h,r),i=(py*canvas.width+px)*4;
  const amount=lensOffset(-d),dx=roundedDistance(x+.5,y,w,h,r)-roundedDistance(x-.5,y,w,h,r),dy=roundedDistance(x,y+.5,w,h,r)-roundedDistance(x,y-.5,w,h,r),length=Math.hypot(dx,dy)||1;
  image.data[i]=Math.round(127.5-127.5*dx/length*amount);image.data[i+1]=Math.round(127.5-127.5*dy/length*amount);image.data[i+2]=128;image.data[i+3]=255;
 }
 ctx.putImageData(image,0,0);const value=canvas.toDataURL();if(cache.size>=20)cache.delete(cache.keys().next().value!);cache.set(key,value);return value;
}
