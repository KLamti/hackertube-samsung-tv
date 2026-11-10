/* Official YouTube iframe player. App-owned code adds no analytics. */
(function () {
  'use strict';
  var args = new URLSearchParams(location.search);
  var video = args.get('video') || 'M7lc1UVf-VE';
  var channel = location.hash.slice(1);
  var player, ready = false;
  var status = document.getElementById('status');
  function report(type, value) {
    // The packaged Tizen parent has an opaque origin; only nonsensitive player status is sent.
    if (parent !== window) parent.postMessage({app:'hackertube-player-v1',channel:channel,type:type,value:value}, '*');
  }
  function notice(message) { status.textContent = message; }
  if (!/^[A-Za-z0-9_-]{11}$/.test(video)) { notice('Invalid video ID'); return; }
  window.onYouTubeIframeAPIReady = function () {
    player = new YT.Player('player', {
      width:'100%',height:'100%',videoId:video,
      playerVars:{autoplay:0,controls:1,playsinline:1,origin:location.origin,rel:0},
      events:{
        onReady:function () { ready=true;notice('Ready — press OK to play');report('ready',true);if(parent===window&&!document.hidden)player.playVideo(); },
        onStateChange:function(e){notice(e.data===1?'':e.data===2?'Paused — OK to resume':e.data===3?'Buffering…':'Ready — OK to play');report('state',e.data);},
        onError:function(e){notice('YouTube error '+e.data);report('error',e.data);},
        onAutoplayBlocked:function(){notice('Autoplay blocked — press OK or click Play');report('blocked',true);}
      }
    });
  };
  function command(action) {
    if (!ready) return;
    if(action==='toggle') { if(player.getPlayerState()===1)player.pauseVideo();else player.playVideo(); }
    else if(action==='play')player.playVideo();
    else if(action==='pause')player.pauseVideo();
    else if(action==='forward')player.seekTo(player.getCurrentTime()+10,true);
    else if(action==='backward')player.seekTo(Math.max(0,player.getCurrentTime()-10),true);
    else if(action==='stop')player.stopVideo();
  }
  window.addEventListener('message',function(e){
    if(e.source!==parent||parent===window)return;
    var d=e.data;
    if(!d||d.app!=='hackertube-player-v1'||d.channel!==channel)return;
    command(d.action);
  });
  document.addEventListener('keydown',function(e){
    var action={13:'toggle',32:'toggle',37:'backward',39:'forward'}[e.keyCode];
    if(action){e.preventDefault();command(action);}
  });
  setTimeout(function(){if(!ready){notice('Player did not become ready');report('timeout',true);}},20000);
})();
