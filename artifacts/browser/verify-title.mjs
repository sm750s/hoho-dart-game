import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const targets = await (await fetch('http://127.0.0.1:9223/json/list')).json();
const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id=0; const pending=new Map(); const errors=[];
ws.addEventListener('message', e => { const m=JSON.parse(e.data); if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);} else if(m.method==='Runtime.exceptionThrown') errors.push(m.params); });
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await send('Runtime.enable');await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument',{source:`window.__time=0;window.__frames=new Map();window.__fid=0;window.requestAnimationFrame=f=>{const id=++window.__fid;window.__frames.set(id,f);return id};window.cancelAnimationFrame=id=>window.__frames.delete(id);window.__step=async ms=>{while(ms>0){const d=Math.min(ms,25);ms-=d;window.__time+=d;const q=[...window.__frames.values()];window.__frames.clear();q.forEach(f=>f(window.__time));await new Promise(r=>setTimeout(r,0));}};`});
const reload=async()=>{await send('Page.navigate',{url:'http://localhost:6173/'});await wait(600);await ev('__step(25)');};
const click=async text=>{await ev(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent.trim().startsWith(${JSON.stringify(text)}));if(!b||b.disabled)throw Error('unavailable '+${JSON.stringify(text)});b.click()})()`);await wait(15);};
const step=ms=>ev(`__step(${ms})`);
const body=()=>ev('document.body.innerText');
const check=async(name,fn)=>{await fn();console.log('PASS '+name);};
const score=()=>ev(`document.querySelectorAll('.score-panel strong')[1].textContent`);
const shots=()=>ev(`document.querySelectorAll('.shot-record-thrown').length`);
const aim=()=>click('가로 위치 정하기');
const throwAt=async(x=200,y=200,speed=150)=>{await step((x-12)/speed*1000);await aim();await step((y-12)/speed*1000);await click('세로 위치 정하고');await step(451);};
const round=async(speed=150)=>{for(let i=0;i<3;i++)await throwAt(200,200,speed);};
const key=async(repeat=false)=>{await ev('document.activeElement?.blur()');await send('Input.dispatchKeyEvent',{type:'keyDown',code:'Space',key:' ',windowsVirtualKeyCode:32,autoRepeat:repeat});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'Space',key:' ',windowsVirtualKeyCode:32});await wait(15);};


await reload();
const title='호호가족의 다트 게임';
assert.equal(await ev('document.title'),title);
for(const state of ['home','playing','result']){if(state==='playing')await click('게임 시작');if(state==='result')await round();assert.equal(await ev(`document.querySelector('h1').getAttribute('aria-label')`),title);console.log('PASS '+state+' title');}
await click('결과 이미지 저장');await wait(200);assert.equal(await ev(`document.querySelector('.result-image-save a').download`),'호호가족-다트게임-결과.png');
const base64=await ev(`(async()=>{const img=document.querySelector('.result-image-preview');await img.decode();const blob=await(await fetch(img.src)).blob();return new Promise(r=>{const reader=new FileReader();reader.onload=()=>r(reader.result.split(',')[1]);reader.readAsDataURL(blob)})})()`);
await fs.writeFile('artifacts/browser/card-hoho-title.png',Buffer.from(base64,'base64'));console.log('PASS PNG creation and renamed download');assert.deepEqual(errors,[]);ws.close();
