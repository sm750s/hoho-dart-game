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


await reload();await ev('localStorage.clear();Math.random=()=>0.75');await reload();await ev('Math.random=()=>0.75');
const change=async(value)=>{await ev(`(()=>{const s=[...document.querySelectorAll('select')].find(s=>[...s.options].some(o=>o.value===${JSON.stringify(value)}));s.value=${JSON.stringify(value)};s.dispatchEvent(new Event('change',{bubbles:true}))})()`);await wait(20);};
await change('swirl');
for(const difficulty of ['easy','normal','fast','veryFast']){await change(difficulty);await click('게임 시작');await check('continuous rendered movement '+difficulty,async()=>{const metrics=await ev(`(async()=>{let minSpeed=Infinity,centerMinSpeed=Infinity,centerSamples=0;const point=()=>document.querySelector('.aim-marker g').getAttribute('transform').match(/[0-9.]+/g).map(Number);let p=point();for(let i=0;i<800;i++){await __step(25);await new Promise(r=>setTimeout(r,2));const q=point();const speed=Math.hypot(q[0]-p[0],q[1]-p[1])/.025;minSpeed=Math.min(minSpeed,speed);if(Math.hypot(p[0]-200,p[1]-200)<24){centerSamples++;centerMinSpeed=Math.min(centerMinSpeed,speed)}if(q.some(v=>v<12||v>388))throw Error('out of board');p=q;}return {minSpeed,centerSamples,centerMinSpeed:Number.isFinite(centerMinSpeed)?centerMinSpeed:null}})()`);console.log(JSON.stringify({difficulty,...metrics}));assert.ok(metrics.minSpeed>100);});await click('지금 위치에 던지기');await key();await step(451);assert.equal(await shots(),1);await click('홈으로');}
await change('easy');await click('게임 시작');await click('지금 위치에 던지기');await click('다시 하기');await step(451);assert.equal(await shots(),0);for(let i=0;i<3;i++){await step(170);await click('지금 위치에 던지기');await step(451);}assert.match(await ev(`document.querySelector('main').className`),/screen-result/);assert.equal(await shots(),3);await key();assert.equal(await shots(),3);console.log('PASS flight cancellation, duplicate input blocking, three-shot results');assert.deepEqual(errors,[]);console.log('PASS no uncaught browser exceptions');ws.close();
