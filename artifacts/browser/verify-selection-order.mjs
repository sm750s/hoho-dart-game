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


await send('Emulation.setDeviceMetricsOverride',{width:320,height:740,deviceScaleFactor:1,mobile:true});await reload();
const choose=async(group,label,keyboard=false)=>{await ev(`(()=>{const f=[...document.querySelectorAll('fieldset')].find(f=>f.querySelector('legend').textContent===${JSON.stringify(group)});const b=[...f.querySelectorAll('button')].find(b=>b.querySelector('strong').textContent===${JSON.stringify(label)});${keyboard?'b.focus()':'b.click()'}})()`);if(keyboard){await send('Input.dispatchKeyEvent',{type:'keyDown',code:'Space',key:' ',windowsVirtualKeyCode:32});await send('Input.dispatchKeyEvent',{type:'keyUp',code:'Space',key:' ',windowsVirtualKeyCode:32});}await wait(30);};
const selected=group=>ev(`(()=>{const f=[...document.querySelectorAll('fieldset')].find(f=>f.querySelector('legend').textContent===${JSON.stringify(group)});return [...f.querySelectorAll('button')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.querySelector('strong').textContent)})()`);
await check('home order and normal default in every mode',async()=>{
  for(const mode of ['기본 도전','미션 도전','행운의 점수','가족 대결']) {
    await click(mode);
    assert.equal(await ev(`(()=>{const mode=document.querySelector('[aria-label="게임 모드"]');const aim=[...document.querySelectorAll('fieldset')].find(f=>f.querySelector('legend').textContent==='조준 방식');const difficulty=[...document.querySelectorAll('fieldset')].filter(f=>f.querySelector('legend').textContent.includes('난이도'));return !!(mode.compareDocumentPosition(aim)&Node.DOCUMENT_POSITION_FOLLOWING)&&difficulty.every(f=>!!(aim.compareDocumentPosition(f)&Node.DOCUMENT_POSITION_FOLLOWING))})()`),true);
    for(const group of mode==='가족 대결'?['플레이어 1 난이도','플레이어 2 난이도']:['난이도']) assert.deepEqual(await selected(group),['보통']);
  }
  await click('기본 도전');
});
await check('difficulty and aim cards select exactly one; keyboard Space works',async()=>{assert.equal(await ev('document.querySelectorAll("select").length'),0);await choose('난이도','매우 빠름');assert.deepEqual(await selected('난이도'),['매우 빠름']);await choose('난이도','보통',true);assert.deepEqual(await selected('난이도'),['보통']);await choose('조준 방식','회오리 조준');assert.deepEqual(await selected('조준 방식'),['회오리 조준']);assert.equal(await ev('document.documentElement.scrollWidth<=innerWidth'),true);await fs.writeFile('artifacts/browser/selection-order-home.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));await click('게임 시작');assert.match(await body(),/회오리 조준점을/);assert.match(await ev(`document.querySelectorAll('.keyboard-hint')[1].textContent`),/보통/);await click('홈으로');assert.deepEqual(await selected('조준 방식'),['회오리 조준']);});
await check('reset confirmation disables cards and cancel restores selection',async()=>{await ev(`document.querySelector('.home-extras').open=true`);await click('별·보물 초기화');assert.equal(await ev(`[...document.querySelectorAll('.choice-cards button')].every(b=>b.matches(':disabled'))`),true);await click('취소');assert.deepEqual(await selected('난이도'),['보통']);});
await click('가족 대결');
await check('family independent difficulty cards and mobile layout',async()=>{await choose('플레이어 1 난이도','빠름');await choose('플레이어 2 난이도','쉬움');assert.deepEqual(await selected('플레이어 1 난이도'),['빠름']);assert.deepEqual(await selected('플레이어 2 난이도'),['쉬움']);assert.equal(await ev('document.documentElement.scrollWidth<=innerWidth'),true);await fs.writeFile('artifacts/browser/selection-order-family.png',Buffer.from((await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true})).data,'base64'));await click('게임 시작');assert.match(await body(),/플레이어 1.*빠름/s);for(let i=0;i<3;i++){await click('지금 위치에 던지기');await step(451);}await click('다음 플레이어');assert.match(await ev(`document.querySelectorAll('.keyboard-hint')[1].textContent`),/쉬움/);});
assert.deepEqual(errors,[]);console.log('PASS no uncaught browser exceptions');ws.close();
