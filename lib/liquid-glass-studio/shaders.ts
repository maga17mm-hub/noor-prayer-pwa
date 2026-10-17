// Optical shaders and WebGL renderer are vendored verbatim from
// iyinchao/liquid-glass-studio (MIT). Only the output alpha is masked to allow
// the original scene renderer to composite over real application DOM.
import vertex from './shaders/vertex.glsl?raw';
import background from './shaders/fragment-bg.glsl?raw';
import vertical from './shaders/fragment-bg-vblur.glsl?raw';
import horizontal from './shaders/fragment-bg-hblur.glsl?raw';
import main from './shaders/fragment-main.glsl?raw';
import sdf from './shaders/lib/sdf.glsl?raw';
import math from './shaders/lib/math.glsl?raw';
import color from './shaders/lib/color.glsl?raw';
function expand(source:string){return source.replace("#include './lib/sdf.glsl'",sdf).replace("#include './lib/math.glsl'",math).replace("#include './lib/color.glsl'",color);}
export const STUDIO_SHADERS={vertex,background:expand(background),vertical,horizontal,main:expand(main).replace('fragColor = outColor;','fragColor = outColor;\n  fragColor.a *= 1.0 - smoothstep(-0.0005, 0.0005, merged);')};
// Defaults copied from the reference Controls.tsx, including its unit scaling
// performed by App.tsx. No white/green tint or extra CSS blur is applied.
export const STUDIO_PRESET={
 u_refThickness:20,u_refDistance:.05,u_refFactor:1.4,u_refDispersion:7,
 u_refFresnelRange:30,u_refFresnelHardness:.2,u_refFresnelFactor:.2,
 u_glareRange:30,u_glareHardness:.2,u_glareFactor:.9,u_glareConvergence:.5,
 u_glareOppositeFactor:.8,u_glareAngle:-Math.PI/4,
 u_blurRadius:1,u_blurWeights:[.978264916850449,.010867541574775536],
 u_blurEdge:1,u_tint:[1,1,1,0],STEP:9,
 u_shadowExpand:25,u_shadowFactor:.15,u_shadowPosition:[0,10],
 u_shapeRoundness:5,u_mergeRate:.05,u_showShape1:0,
};
