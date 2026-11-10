const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const playerPath = '../hackertube/js/player.js';
const H = fs.existsSync(require('node:path').join(__dirname,playerPath)) ? require(playerPath) : {};
const id='5MgBikgcWnY', origin='https://klamti.github.io';
function fixture() {
  const states=[], commands=[], plays=[];
  const frame={src:'',contentWindow:{postMessage:(message,target)=>commands.push({message,target})},removeAttribute(name){if(name==='src')this.src='';}};
  assert.equal(typeof H.createEmbeddedPlayer,'function','embedded playback controller exists');
  const player=H.createEmbeddedPlayer(frame,s=>states.push(s),()=>plays.push(true));
  function event(type,value,extra={}) {return {origin,source:frame.contentWindow,data:{app:'hackertube-player-v1',channel:new URL(frame.src).hash.slice(1),type,value},...extra};}
  return {player,frame,states,commands,plays,event};
}
test('embedded playback validates destinations and loads the exact selected video',()=>{
  const f=fixture();
  assert.throws(()=>f.player.open('https://evil.test'),/video/i);
  assert.equal(f.frame.src,'');
  f.player.open(id);
  const u=new URL(f.frame.src);
  assert.equal(u.origin,origin);assert.equal(u.pathname,'/hackertube-samsung-tv/player/');
  assert.equal(u.searchParams.get('video'),id);assert.ok(u.hash.length>20);
  assert.equal(f.player.active(),true);f.player.close();
});
test('only matching origin, window and current session can update playback or history',()=>{
  const f=fixture();f.player.open(id);
  for(const extra of [{origin:'https://evil.test'},{source:{}},{data:{app:'hackertube-player-v1',channel:'stale',type:'state',value:1}}])f.player.receive(f.event('state',1,extra));
  assert.equal(f.plays.length,0);
  const stale=f.event('state',1);f.player.open('M7lc1UVf-VE');f.player.receive(stale);
  assert.equal(f.plays.length,0);
  f.player.receive(f.event('state',1));f.player.receive(f.event('state',1));
  assert.equal(f.plays.length,1);assert.equal(f.states.at(-1).kind,'playing');f.player.close();
});
test('remote commands are constrained and closing unloads playback and rejects late messages',()=>{
  const f=fixture();f.player.open(id);const late=f.event('state',1);
  f.player.command('forward');f.player.command('arbitrary');
  assert.equal(f.commands.length,1);assert.equal(f.commands[0].target,origin);
  assert.equal(f.commands[0].message.action,'forward');
  f.player.close();f.player.command('play');f.player.receive(late);
  assert.equal(f.frame.src,'');assert.equal(f.player.active(),false);assert.equal(f.plays.length,0);assert.equal(f.commands.length,1);
});
test('unreachable player times out and close cancels pending failure',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture();f.player.open(id);t.mock.timers.tick(30000);
  assert.equal(f.states.at(-1).kind,'error');assert.match(f.states.at(-1).message,/YouTube/);
  f.player.open(id);f.player.close();const count=f.states.length;t.mock.timers.tick(60000);assert.equal(f.states.length,count);
});
test('YouTube errors offer fallback and a stalled buffer cannot spin forever',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture();f.player.open(id);f.player.receive(f.event('error',101));
  assert.equal(f.states.at(-1).kind,'error');assert.match(f.states.at(-1).message,/101/);
  f.player.open(id);f.player.receive(f.event('ready',true));f.player.receive(f.event('state',3));t.mock.timers.tick(30000);
  assert.equal(f.states.at(-1).kind,'error');f.player.close();
});
test('playing or paused cancels loading timeout and blocked autoplay is actionable',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture();f.player.open(id);f.player.receive(f.event('blocked',true));
  assert.match(f.states.at(-1).message,/OK/);
  f.player.receive(f.event('state',1));t.mock.timers.tick(60000);assert.equal(f.states.at(-1).kind,'playing');
  f.player.receive(f.event('state',2));assert.equal(f.states.at(-1).kind,'paused');f.player.close();
});
test('pause requested before the HTTPS page loads remains paused when it becomes ready',t=>{
  const f=fixture();t.after(()=>f.player.close());f.player.open(id);f.player.command('pause');f.player.receive(f.event('ready',true));
  assert.equal(f.commands.length,2);assert.equal(f.commands.at(-1).message.action,'pause');f.player.close();
});
test('hosted iframe waits for the parent playback command and rejects unrelated messages',()=>{
  const vm=require('node:vm'), listeners={},calls=[],reports=[];
  const parent={postMessage:m=>reports.push(m)}, status={textContent:''};let options;
  const context={URLSearchParams,location:{search:'?video=5MgBikgcWnY',hash:'#session',origin},parent,
    document:{hidden:false,getElementById:()=>status,addEventListener(){}},setTimeout(){},
    YT:{Player:function(id,o){options=o;return {playVideo:()=>calls.push('play'),pauseVideo:()=>calls.push('pause'),stopVideo:()=>calls.push('stop'),getPlayerState:()=>1}}}};
  context.window=context;context.addEventListener=(name,handler)=>listeners[name]=handler;
  vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../player/player.js'),'utf8'),context);
  context.onYouTubeIframeAPIReady();options.events.onReady();
  assert.equal(options.playerVars.autoplay,0);assert.deepEqual(calls,[]);assert.equal(reports[0].type,'ready');
  const data={app:'hackertube-player-v1',channel:'session',action:'play'};
  listeners.message({source:{},data});listeners.message({source:parent,data:{...data,channel:'stale'}});assert.deepEqual(calls,[]);
  listeners.message({source:parent,data:{...data,action:'pause'}});assert.deepEqual(calls,['pause']);
  listeners.message({source:parent,data});assert.deepEqual(calls,['pause','play']);
});
test('background pause does not cancel the deadline for an unreachable host',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const f=fixture();f.player.open(id);f.player.command('pause');t.mock.timers.tick(30000);
  assert.equal(f.states.at(-1).kind,'error');f.player.close();
});
