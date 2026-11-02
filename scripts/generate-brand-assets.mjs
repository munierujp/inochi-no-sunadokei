import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root=fileURLToPath(new URL('../',import.meta.url));
const dist=path.join(root,'dist');
const assets=path.join(dist,'assets');
await mkdir(assets,{recursive:true});
const config=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
const origin=new URL(config.origin);
if(!['http:','https:'].includes(origin.protocol)||origin.username||origin.password||origin.search||origin.hash||origin.pathname!=='/')throw new Error('origin must be an HTTP(S) origin without a path or credentials');
const url=relative=>new URL(relative,origin).href;
const escape=value=>value.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');

// Keep all drawing inside the maskable icon's central safe circle.
const mark=`<path d="M166 140H346C346 202 285 226 268 251Q263 256 268 261C285 286 346 310 346 372H166C166 310 227 286 244 261Q249 256 244 251C227 226 166 202 166 140Z" fill="#fcfaf6" stroke="#92683f" stroke-width="10" stroke-linejoin="round"/>
<path d="M182 178H330C319 207 280 228 260 245Q256 248 252 245C232 228 193 207 182 178Z" fill="#b38958"/>
<path d="M179 361Q214 337 246 313Q256 305 266 313Q298 337 333 361Z" fill="#b38958"/>
<path d="M256 264V298" stroke="#b38958" stroke-width="7" stroke-linecap="round"/>
<path d="M150 126H362M150 386H362" stroke="#735239" stroke-width="16" stroke-linecap="round"/>`;
const icon=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#f5f2eb"/>${mark}</svg>`;
const favicon=icon.replace(mark,`<g transform="translate(256 256) scale(1.5) translate(-256 -256)">${mark}</g>`);
await writeFile(path.join(dist,'favicon.svg'),favicon);
for(const size of [16,32,48,192,512]){
  await sharp(Buffer.from(size<=48?favicon:icon)).resize(size,size).png().toFile(path.join(assets,`icon-${size}.png`));
}
await sharp(Buffer.from(icon)).resize(180,180).png().toFile(path.join(dist,'apple-touch-icon.png'));
await sharp(Buffer.from(icon)).png().toFile(path.join(assets,'icon-maskable-512.png'));
await sharp(Buffer.from(icon)).png().toFile(path.join(assets,'og-icon.png'));

// A multi-resolution ICO with PNG payloads for modern browsers.
const sizes=[16,32,48];
const pngs=await Promise.all(sizes.map(size=>readFile(path.join(assets,`icon-${size}.png`))));
const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);
let offset=header.length;
pngs.forEach((png,i)=>{const pos=6+i*16;header[pos]=sizes[i];header[pos+1]=sizes[i];header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(png.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=png.length;});
await writeFile(path.join(dist,'favicon.ico'),Buffer.concat([header,...pngs]));

// Preserve the adopted wordmark pixels exactly when composing the banners.
const logo=await readFile(path.join(assets,'logo-wordmark-a.png'));
const embedded=`data:image/png;base64,${logo.toString('base64')}`;
const banner=withGlass=>`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f5f2eb"/><image href="${embedded}" x="${withGlass?64:140}" y="${withGlass?191:162}" width="${withGlass?760:920}" height="${withGlass?254:307}"/>${withGlass?`<g transform="translate(770 64) scale(.98)">${mark}</g>`:''}</svg>`;
await sharp(Buffer.from(banner(true))).png().toFile(path.join(assets,'og-banner.png'));
await sharp(Buffer.from(banner(false))).png().toFile(path.join(assets,'og-banner-logo-only.png'));
if(!['assets/og-banner.png','assets/og-banner-logo-only.png'].includes(config.socialImage))throw new Error('Unknown socialImage');

const manifest={id:'./',name:'命の砂時計',short_name:'命の砂時計',lang:'ja',description:'生年月日と寿命から、残り時間を表示するアプリ。',start_url:'./',scope:'./',display:'standalone',background_color:'#f5f2eb',theme_color:'#f5f2eb',icons:[{src:'assets/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'assets/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'assets/icon-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]};
await writeFile(path.join(dist,'site.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
const metadata=`<!-- brand-metadata:start -->
<link rel="icon" href="favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" href="favicon.svg" type="image/svg+xml" sizes="any">
<link rel="apple-touch-icon" href="apple-touch-icon.png" sizes="180x180">
<link rel="manifest" href="site.webmanifest">
<meta name="application-name" content="命の砂時計">
<meta name="apple-mobile-web-app-title" content="命の砂時計">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="mobile-web-app-capable" content="yes">
<link rel="canonical" href="${escape(url('/'))}">
<meta property="og:type" content="website">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="命の砂時計">
<meta property="og:title" content="命の砂時計">
<meta property="og:description" content="生年月日と寿命から、残り時間を表示するアプリ。">
<meta property="og:url" content="${escape(url('/'))}">
<meta property="og:image" content="${escape(url(config.socialImage))}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="命の砂時計のロゴ${config.socialImage==='assets/og-banner.png'?'と砂時計':''}">
<meta property="og:image" content="${escape(url('assets/og-icon.png'))}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="512">
<meta property="og:image:height" content="512">
<meta property="og:image:alt" content="砂時計のアイコン">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@munieru_jp">
<meta name="twitter:creator" content="@munieru_jp">
<meta name="twitter:title" content="命の砂時計">
<meta name="twitter:description" content="生年月日と寿命から、残り時間を表示するアプリ。">
<meta name="twitter:image" content="${escape(url(config.socialImage))}">
<meta name="twitter:image:alt" content="命の砂時計のロゴ${config.socialImage==='assets/og-banner.png'?'と砂時計':''}">
<!-- brand-metadata:end -->`;
const index=path.join(dist,'index.html');
let html=await readFile(index,'utf8');
if(html.includes('<!-- brand-metadata:start -->'))html=html.replace(/<!-- brand-metadata:start -->[\s\S]*?<!-- brand-metadata:end -->/,metadata);
else html=html.replace(/<link rel="icon"[^>]*>/,metadata);
await writeFile(index,html);
console.log(`Generated favicon, home-screen icons and 1200x630 social banners. Metadata origin: ${origin.origin}`);
