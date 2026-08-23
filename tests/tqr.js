const fs=require('fs');
let src=fs.readFileSync('/tmp/qr.js','utf8').replace('"use strict";','').replace(/\n"use strict";/,'\n');
src+='\n'+fs.readFileSync('/tmp/app.js','utf8').match(/function qrSvg[\s\S]*?\n}/)[0];
src+=`
const url='https://fks.netlify.app/index.html#/f/abcdefghjkmnpqr23456';
const svg=qrSvg(url,210);
const rects=(svg.match(/<rect/g)||[]).length;
T(rects>300&&rects<700,'qrSvg '+rects+' rects');
T(svg.includes('background:#fff')&&svg.includes('border-radius:10px'),'svg style OK');
T(svg.startsWith('<svg xmlns'),'svg format OK');
// contenu décodable : re-décoder via la lib elle-même n'est pas exposé ; on vérifie la structure des 3finders (déjà fait) et la stabilité
const svg2=qrSvg(url,210);
T(svg===svg2,'déterministe');
T(qrSvg('bonjour',120).includes('viewBox="0 0 120 120"'),'px paramétrable');
`;
const ts=[];function T(ok,m){ts.push([ok,m]);if(!ok)console.log('ECHEC:',m);}
eval(src);
let f=0;ts.forEach(t=>{if(!t[0])f++;console.log((t[0]?'PASS':'FAIL')+' — '+t[1]);});
if(f)process.exit(1);console.log('QR: TOUT PASSE');
