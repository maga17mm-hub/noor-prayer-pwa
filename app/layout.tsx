import type {Metadata,Viewport} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Нур — время для главного',description:'Намаз по местоположению, полный Коран, Мединский мусхаф, азкары и кибла. Спокойное приложение для каждого дня.',manifest:'/manifest.webmanifest',applicationName:'Нур',appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'Нур'},icons:{icon:'/favicon.svg',apple:'/icons/apple-touch-icon.png'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#101211'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ru" data-theme="dark"><body>{children}</body></html>;}
