// Integration smoke test against the real app in an isolated headless Chromium.
// Start preview-hackertube.py and Chrome with --remote-debugging-port=9223 first.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const target = (await (await fetch('http://127.0.0.1:9223/json/list')).json()).find(t=>t.type==='page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let sequence=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{
  const m=JSON.parse(e.data);
  if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}
  if(m.method==='Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.text);
});
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function until(expression){for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,200));}throw Error('Timed out: '+expression);}
async function key(code,key){await send('Input.dispatchKeyEvent',{type:'keyDown',windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,key});await send('Input.dispatchKeyEvent',{type:'keyUp',windowsVirtualKeyCode:code,nativeVirtualKeyCode:code,key});}
async function click(selector){await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);}
async function shot(name){const s=await send('Page.captureScreenshot',{format:'png'});await fs.writeFile(path.join(os.tmpdir(),'hackertube-'+name+'.png'),Buffer.from(s.data,'base64'));}
try{
 await send('Runtime.enable');await send('Page.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
 const reset=await send('Page.addScriptToEvaluateOnNewDocument',{source:'localStorage.clear()'});
 await send('Page.navigate',{url:'http://127.0.0.1:8767/?smoke='+Date.now()});
 await until('document.querySelectorAll(".card").length===24');
 await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:reset.identifier});
 console.log('PASS live catalogue: 24 videos');
 await until('Array.from(document.images).slice(0,3).every(i=>i.complete)');await shot('home');
 const first=await evaluate('document.activeElement.id');
 await key(39,'ArrowRight');const second=await evaluate('document.activeElement.id');assert.notEqual(first,second);
 await key(40,'ArrowDown');assert.notEqual(await evaluate('document.activeElement.id'),second);
 await key(38,'ArrowUp');assert.equal(await evaluate('document.activeElement.id'),second);
 await key(13,'Enter');await until('!!document.querySelector("#play")');
 assert.equal(await evaluate('document.activeElement.id'),'play');await shot('detail');
 await key(13,'Enter');await until('!!document.querySelector("#player-frame")');
 assert.equal(await evaluate('document.activeElement.id'),'player-remote');
 await key(38,'ArrowUp');assert.equal(await evaluate('document.activeElement.id'),'player-toggle');
 await key(39,'ArrowRight');assert.equal(await evaluate('document.activeElement.id'),'player-youtube');
 await key(27,'Escape');assert.equal(await evaluate('document.querySelector("#player-frame")'),null);
 assert.equal(await evaluate('document.activeElement.id'),'play');
 await key(39,'ArrowRight');assert.equal(await evaluate('document.activeElement.id'),'youtube');
 await key(39,'ArrowRight');assert.equal(await evaluate('document.activeElement.id'),'save');await key(13,'Enter');
 assert.match(await evaluate('document.querySelector("#save").textContent'),/Saved/);
 await key(27,'Escape');assert.equal(await evaluate('document.activeElement.id'),second);
 console.log('PASS remote grid/detail/back focus and saving');
 await click('[data-page="saved"]');await until('document.querySelectorAll(".card").length===1');
 await send('Page.reload');await until('document.querySelectorAll(".card").length===1');
 assert.equal(await evaluate('document.querySelector("nav button.active").dataset.page'),'saved');
 console.log('PASS saved list and cold-start restoration');
 await key(13,'Enter');await until('!!document.querySelector("#save")');await click('#save');await key(27,'Escape');
 assert.equal(await evaluate('document.querySelectorAll(".card").length'),0);
 assert.equal(await evaluate('document.activeElement.dataset.action'),'home');
 console.log('PASS removing a saved video immediately updates the parent list');
 await click('[data-page="search"]');await until('!!document.querySelector("#query")');
 await key(13,'Enter');assert.equal(await evaluate('document.querySelector("#query").value'),'a');
 await click('[data-action="delete"]');assert.equal(await evaluate('document.querySelector("#query").value'),'');
 await evaluate('document.querySelector("#query").focus()');await send('Input.insertText',{text:'physics'});await shot('search');await key(13,'Enter');
 await until('document.querySelectorAll(".card").length>0 && document.querySelector("#overlay").hidden');
 assert.match(await evaluate('document.querySelector("#heading").textContent'),/physics/);
 console.log('PASS remote keyboard and live search');
 await click('[data-page="topics"]');await until('document.querySelectorAll(".topic").length>10');
 await key(13,'Enter');await until('document.querySelectorAll(".card").length>0');
 console.log('PASS live topic/category browsing');
 await click('[data-page="history"]');await until('!!document.querySelector("[data-action=home]")');
 assert.equal(await evaluate('document.activeElement.dataset.action'),'home');
 console.log('PASS empty history remains navigable');
 assert.deepEqual(errors,[]);console.log('PASS no uncaught browser exceptions');
} finally {ws.close();}
