// ---- stubs navigateur ----
const __els={};
function mkEl(id){const e={id,innerHTML:'',textContent:'',value:'',checked:false,style:{},dataset:{},files:null,disabled:false,
 classList:{add(){},remove(){},toggle(){},contains(){return false}},
 setAttribute(){},getAttribute(){return null},removeAttribute(){},appendChild(){return mkEl()},removeChild(){},remove(){},
 addEventListener(){},focus(){},select(){},blur(){},click(){},firstChild:null,parentNode:null};
 Object.defineProperty(e,'onclick',{set(){},get(){return null}});
 return e;}
global.document={getElementById(id){if(!__els[id])__els[id]=mkEl(id);return __els[id];},
 querySelector(sel){if(sel&&sel.charAt(0)==='#')return this.getElementById(sel.slice(1));return mkEl('q');},querySelectorAll(){return[]},createElement(){return mkEl('c')},
 addEventListener(){},body:mkEl('body'),head:mkEl('head'),documentElement:mkEl('html'),title:''};
global.addEventListener=()=>{};global.removeEventListener=()=>{};global.dispatchEvent=()=>{};global.postMessage=()=>{};global.window=global;global.self=global;
global.location={hash:'',href:'https://fks.example/',protocol:'https:'};
global.navigator={userAgent:'node',language:'fr',onLine:true,serviceWorker:{register(){return Promise.resolve({});}}};
global.localStorage={_d:{},getItem(k){return this._d[k]??null},setItem(k,v){this._d[k]=String(v)},removeItem(k){delete this._d[k]},clear(){this._d={}}};
global.sessionStorage={_d:{},getItem(){return null},setItem(){},removeItem(){}};
global.history={replaceState(){},pushState(){}};
global.alert=()=>{};global.confirm=()=>true;global.prompt=()=>null;
global.matchMedia=()=>({matches:false,addEventListener(){}});
global.Blob=class{constructor(parts,opts){this.parts=parts;this.opts=opts;this.size=(parts||[]).join('').length;}arrayBuffer(){return Promise.resolve(Buffer.from((this.parts||[]).join(''),'binary'));}};
global.FileReader=class{readAsDataURL(){setTimeout(()=>{if(this.onload)this.onload({target:{result:''}})},0)}readAsText(){}};
global.URL={createObjectURL(){return 'blob:x'},revokeObjectURL(){}};
global.fetch=(u,o)=>Promise.resolve({ok:false,status:0,json:()=>Promise.resolve({}),text:()=>Promise.resolve('')});
global.OfflineReady=false;
global.requestAnimationFrame=f=>setTimeout(f,0);
const _siShim=setInterval;global.setInterval=(fn,ms,...a)=>{const t=_siShim(fn,ms,...a);if(t&&t.unref)t.unref();return t;};
// ---- eval unique app+tests ----
const fs=require('fs');
const _path=require('path');const _SRCHTML=_path.join(__dirname,'..','index.html');
/* auto-réparation (v35.38) : si /tmp a été purgé, régénérer qr.js et app.js depuis index.html */
if(!fs.existsSync('/tmp/qr.js')){try{const _h=fs.readFileSync(_SRCHTML,'utf8');const _m=_h.match(/<script>([\s\S]*?var qrcodegen;[\s\S]*?)<\/script>/);if(_m&&_m[1].indexOf('QrSegment')>=0)fs.writeFileSync('/tmp/qr.js',_m[1]);}catch(e){}}
const _appf=process.argv[2]||'/tmp/app.js';
if(!fs.existsSync(_appf)){try{const _h=fs.readFileSync(_SRCHTML,'utf8');const _b=_h.match(/<script>[\s\S]*?<\/script>/g)||[];if(_b.length>=2)fs.writeFileSync(_appf,_b[1].slice(8,-9));}catch(e){}}
let src='';
try{src+=fs.readFileSync('/tmp/qr.js','utf8').replace('"use strict";','').replace(/\n"use strict";/,'\n')+'\n';}catch(e){}
src+=fs.readFileSync(process.argv[2]||'/tmp/app.js','utf8');
src+='\n'+fs.readFileSync(process.argv[3]||'/tmp/tv3.js','utf8');
process.on('unhandledRejection',r=>{console.error('REJECTION:',r&&(r.stack||r));process.exit(1);});
eval(src);
