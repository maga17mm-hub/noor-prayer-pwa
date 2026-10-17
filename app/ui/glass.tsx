'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {MultiPassRenderer} from '../../lib/liquid-glass-studio/GLUtils';
import {STUDIO_SHADERS as shaders,STUDIO_PRESET} from '../../lib/liquid-glass-studio/shaders';
import {subscribeBackdrop,refreshBackdrop} from '../../lib/liquid-glass-studio/backdrop';

export default function Glass({children,className='',as='div',...props}:{children:ReactNode;className?:string;as?:'div'|'button'|'nav';[key:string]:any}){
 const root=useRef<HTMLElement>(null),canvasRef=useRef<HTMLCanvasElement>(null);const [generation,setGeneration]=useState(0);const Tag=as as any;
 useEffect(()=>{
  const element=root.current,canvas=canvasRef.current;if(!element||!canvas)return;
  let renderer:MultiPassRenderer|null=null,texture:WebGLTexture|null=null,unsub:(()=>void)|null=null;
  const padding=100,backing=document.createElement('canvas'),ctx=backing.getContext('2d')!;
  let w=0,h=0;const gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:false,antialias:true});
  if(!gl){element.dataset.glassRenderer='fallback';return;}
  try{
   renderer=new MultiPassRenderer(canvas,[
    {name:'bgPass',shader:{vertex:shaders.vertex,fragment:shaders.background}},
    {name:'vBlurPass',shader:{vertex:shaders.vertex,fragment:shaders.vertical},inputs:{u_prevPassTexture:'bgPass'}},
    {name:'hBlurPass',shader:{vertex:shaders.vertex,fragment:shaders.horizontal},inputs:{u_prevPassTexture:'vBlurPass'}},
    {name:'mainPass',shader:{vertex:shaders.vertex,fragment:shaders.main},inputs:{u_blurredBg:'hBlurPass',u_bg:'bgPass'},outputToScreen:true},
   ]);
   texture=gl.createTexture();if(!texture)throw Error('Unable to create backdrop texture');
   const paint=(scene:{canvas:HTMLCanvasElement;x:number;y:number})=>{
    if(!renderer||!texture||document.documentElement.dataset.glass==='reduced'){canvas.style.visibility='hidden';return;}
    const rect=element.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight||rect.width<=0||rect.height<=0){canvas.style.visibility='hidden';return;}
    const width=Math.ceil(rect.width)+padding*2,height=Math.ceil(rect.height)+padding*2;
    if(width!==w||height!==h){w=width;h=height;canvas.width=w;canvas.height=h;canvas.style.width=w+'px';canvas.style.height=h+'px';canvas.style.left=-padding+'px';canvas.style.top=-padding+'px';backing.width=w;backing.height=h;gl.viewport(0,0,w,h);renderer.resize(w,h);}
    ctx.fillStyle=getComputedStyle(document.body).backgroundColor;ctx.fillRect(0,0,w,h);
    const sx=rect.left-padding+window.scrollX-scene.x,sy=rect.top-padding+window.scrollY-scene.y;
    ctx.drawImage(scene.canvas,-sx,-sy);
    gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,backing);gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    renderer.setUniforms({...STUDIO_PRESET,u_resolution:[w,h],u_dpr:1,u_mouse:[w/2,h/2],u_mouseSpring:[w/2,h/2],u_shapeWidth:rect.width-2,u_shapeHeight:rect.height-2,u_shapeRoundness:2,u_shapeRadius:Math.min(parseFloat(getComputedStyle(element).borderTopLeftRadius)||0,(Math.min(rect.width,rect.height)-2)/2)});
    renderer.render({bgPass:{u_bgType:3,u_bgTexture:texture,u_bgTextureRatio:w/h,u_bgTextureReady:1}});
    canvas.style.visibility='visible';element.dataset.glassRenderer='webgl2';
   };
   unsub=subscribeBackdrop(paint);
  }catch(error){element.dataset.glassRenderer='fallback';console.error('Liquid Glass Studio renderer',error instanceof Error?error.message:'initialization failed');renderer?.dispose();renderer=null;}
  const resize=new ResizeObserver(()=>refreshBackdrop());resize.observe(element);
  const lost=(e:Event)=>{e.preventDefault();element.dataset.glassRenderer='fallback';canvas.style.visibility='hidden';};const restored=()=>setGeneration(v=>v+1);canvas.addEventListener('webglcontextlost',lost);canvas.addEventListener('webglcontextrestored',restored);
  return()=>{resize.disconnect();unsub?.();canvas.removeEventListener('webglcontextlost',lost);canvas.removeEventListener('webglcontextrestored',restored);if(texture)gl.deleteTexture(texture);renderer?.dispose();if(process.env.NODE_ENV==='production')gl.getExtension('WEBGL_lose_context')?.loseContext();};
 },[generation]);
 return <Tag ref={root} className={`liquid-glass ${className}`} {...props}><canvas key={generation} ref={canvasRef} className="studio-glass-canvas" aria-hidden="true"/><span className="glass-content">{children}</span></Tag>;
}
