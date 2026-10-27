import ts from 'typescript';
import fs from 'node:fs';import vm from 'node:vm';import {createHash} from 'node:crypto';
// Download qrcodegen.ts from Nayuki commit 3c6d0b3cefb4e049dc337e82237c9644399716a8, then pass its local path.
const root=new URL('../',import.meta.url),source=fs.readFileSync(process.argv[2],'utf8');
if(createHash('sha256').update(source).digest('hex')!=='1dc03fb5a10e0e2318ea162755bbdb9977ca6ce52cff959e9c9b6deafdccda9c')throw new Error('Expected the ADR 020 pinned Nayuki source');
const ctx={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText+';globalThis.reference=qrcodegen;',ctx);const {QrCode,QrSegment}=ctx.reference;
const vectors=[];for(const text of ['', '01234567890123456789','HELLO WORLD','https://github.com/SaadAlsaree/SheenUI','مرحبا بالعراق','بغداد 😀 QR 123','😀😃🚀','a'.repeat(260)])for(const level of ['LOW','MEDIUM','QUARTILE','HIGH'])for(let mask=-1;mask<8;mask++){const q=QrCode.encodeSegments(QrSegment.makeSegments(text),QrCode.Ecc[level],1,40,mask,false),bits=Array.from({length:q.size},(_,y)=>Array.from({length:q.size},(_,x)=>q.getModule(x,y)?'1':'0').join('')).join('');vectors.push({text,level,mask,version:q.version,selectedMask:q.mask,boost:false,hash:createHash('sha256').update(bits).digest('hex')})}
for(const version of [1,7,10,27,40])for(const boost of [false,true]){const text='123',q=QrCode.encodeSegments(QrSegment.makeSegments(text),QrCode.Ecc.LOW,version,version,-1,boost),bits=Array.from({length:q.size},(_,y)=>Array.from({length:q.size},(_,x)=>q.getModule(x,y)?'1':'0').join('')).join('');vectors.push({text,level:'LOW',mask:-1,version,selectedMask:q.mask,boost,fixedVersion:true,hash:createHash('sha256').update(bits).digest('hex')})}
const drawingSource=fs.readFileSync(new URL('registry/react/components/qr-code/qr-code-drawing.tsx',root),'utf8');
const drawingCode=drawingSource.slice(drawingSource.indexOf('export function roundedRect'),drawingSource.indexOf('const escapeAttribute')).replaceAll('export function','function');
const drawingContext={};vm.runInNewContext(ts.transpileModule(drawingCode,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText+';globalThis.path=qrPath',drawingContext);
const sample=QrCode.encodeSegments(QrSegment.makeSegments('SHEEN UI'),QrCode.Ecc.MEDIUM,1,1,0,false),matrix={count:sample.size,get:(row,col)=>sample.getModule(col,row)},drawings=[];
for(const shape of ['square','rounded','dots'])for(const margin of [0,2,4])for(const hole of [0,5])drawings.push({shape,margin,hole,hash:createHash('sha256').update(drawingContext.path(matrix,margin,shape,hole)).digest('hex')});
fs.writeFileSync(new URL('tests/SheenUI.Integration.Tests/Fixtures/QrNayukiVectors.json',root),JSON.stringify({commit:'3c6d0b3cefb4e049dc337e82237c9644399716a8',vectors,drawings},null,2)+'\n');
console.log(`${vectors.length} encoder vectors; ${drawings.length} drawing vectors`);
