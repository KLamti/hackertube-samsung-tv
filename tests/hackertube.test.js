const test = require('node:test');
const assert = require('node:assert/strict');
let H = {};
try { Object.assign(H, require('../hackertube/js/core.js'), require('../hackertube/js/api.js'), require('../hackertube/js/tizen.js')); } catch (_) {}
const sample = {vid: '5MgBikgcWnY', title: 'Learning <anything>', channel: 'TEDx', duration_s: 1167};

test('only YouTube IDs are accepted as playback destinations', () => {
  assert.equal(typeof H.validId, 'function');
  assert.equal(H.validId(sample.vid), true);
  for (const id of ['', null, 'https://evil.test', '../foo', '<script>abc', 'abc']) assert.equal(H.validId(id), false);
});
test('malformed catalogue rows are rejected and text is normalized', () => {
  assert.equal(typeof H.cleanVideo, 'function');
  assert.equal(H.cleanVideo(null), null);
  assert.equal(H.cleanVideo({vid: '../../bad'}), null);
  assert.deepEqual(H.cleanVideo(sample).title, 'Learning <anything>');
  assert.equal(H.cleanVideo({vid: sample.vid, title: {}, duration_s: -5}).duration_s, 0);
  assert.equal(H.cleanVideo({vid: sample.vid, title: {}}).title, 'Untitled video');
});
test('remote movement reaches partial last rows and does not wrap sideways', () => {
  assert.equal(typeof H.moveFocus, 'function');
  const rects = [{x:0,y:0,w:100,h:70},{x:120,y:0,w:100,h:70},{x:240,y:0,w:100,h:70},{x:0,y:100,w:100,h:70}];
  assert.equal(H.moveFocus(rects, 2, 'down'), 3);
  assert.equal(H.moveFocus(rects, 2, 'right'), 2);
  assert.equal(H.moveFocus(rects, 3, 'up'), 0);
  assert.equal(H.moveFocus([], 0, 'left'), -1);
});
test('saved videos survive reload, toggle off and reject malformed persisted values', () => {
  assert.equal(typeof H.createStore, 'function');
  const data = {}; const storage = {getItem:k=>data[k], setItem:(k,v)=>data[k]=v};
  const s = H.createStore(storage);
  assert.equal(s.toggle(sample), true);
  assert.equal(H.createStore(storage).saved()[0].vid, sample.vid);
  assert.equal(s.toggle(sample), false);
  assert.deepEqual(s.saved(), []);
  data['hackertube.state.1'] = '{broken';
  assert.deepEqual(H.createStore(storage).saved(), []);
  data['hackertube.state.1'] = JSON.stringify({saved: [null, {vid:'bad'}, sample], history: {bad:true}});
  assert.equal(H.createStore(storage).saved().length, 1);
  assert.deepEqual(H.createStore(storage).history(), []);
});
test('unavailable storage does not prevent session saves or deduplicated history', () => {
  assert.equal(typeof H.createStore, 'function');
  const s = H.createStore({getItem(){throw Error('blocked')},setItem(){throw Error('full')}});
  assert.equal(s.toggle(sample), true);
  s.seen(sample); s.seen(sample);
  assert.equal(s.history().length, 1);
  for(let i=0;i<110;i++) s.seen({...sample,vid:String(i).padStart(11,'0')});
  assert.equal(s.history().length, 100);
});
test('malformed numeric metadata in stored videos cannot crash startup', () => {
  const row = {...sample,recommenders:{toString:null}};
  const s=H.createStore({getItem:()=>JSON.stringify({saved:[row]}),setItem(){}});
  assert.equal(s.saved()[0].recommenders,0);
});
test('API queries encode search text and do not let it inject filters', () => {
  assert.equal(typeof H.apiPath, 'function');
  const url = new URL('https://hackertube.org' + H.apiPath('search',{query:'C++ & cat=evil'}));
  assert.equal(url.searchParams.get('q'), 'C++ & cat=evil');
  assert.equal(url.searchParams.has('cat'), false);
  assert.equal(new URL('https://hackertube.org'+H.apiPath('longs',{offset:24})).searchParams.get('dur'),'xlong');
});
test('API handles search envelopes, discards malformed rows and reports HTTP failures', async () => {
  assert.equal(typeof H.createAPI, 'function');
  const api=H.createAPI('', async()=>({ok:true,json:async()=>({results:[sample,null,{vid:'bad'}]})}));
  assert.equal((await api.videos('search',{query:'learning'})).length,1);
  await assert.rejects(H.createAPI('',async()=>({ok:false,status:503})).videos('home',{}), /503/);
  await assert.rejects(H.createAPI('',async()=>({ok:true,json:async()=>({unexpected:true})})).videos('home',{}), /catalogue/i);
});
test('YouTube handoff carries the selected video and errors stay visible to callers', async () => {
  assert.equal(typeof H.createTV, 'function');
  let request;
  const platform = {ApplicationControl:function(op,uri,mime,category,data){this.operation=op;this.uri=uri;this.data=data}, ApplicationControlData:function(key,value){this.key=key;this.value=value}, application:{launchAppControl(control,id,ok){request={control,id};ok()}}};
  await H.createTV(platform).play(sample.vid);
  assert.equal(request.id, '9Ur5IzDKqV.TizenYouTube');
  assert.equal(request.control.uri, 'https://www.youtube.com/watch?v=5MgBikgcWnY');
  assert.deepEqual(request.control.data.map(d=>({key:d.key,value:d.value})), [{key:'PAYLOAD',value:[JSON.stringify({values:'v=5MgBikgcWnY'})]}]);
  await H.createTV(platform).browser(sample.vid);
  assert.equal(request.id, 'org.tizen.browser');
  assert.equal(request.control.uri, 'https://www.youtube.com/watch?v=5MgBikgcWnY');
  assert.equal(request.control.data, null);
  await assert.rejects(H.createTV(platform).play('bad'), /video/i);
  platform.application.launchAppControl=(control,id,ok,fail)=>fail({name:'NotFoundError'});
  await assert.rejects(H.createTV(platform).play(sample.vid), /NotFoundError/);
});
test('detail responses cannot substitute a different video for the selection', async () => {
  const api=H.createAPI('',async()=>({ok:true,json:async()=>({video:{...sample,vid:'FnEWBtCnFs8'}})}));
  await assert.rejects(api.detail(sample.vid),/video/i);
});
