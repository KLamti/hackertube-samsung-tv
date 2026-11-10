(function (H) {
  'use strict';
  var core = typeof module !== 'undefined' ? require('./core.js') : H;
  var origin = 'https://klamti.github.io', protocol = 'hackertube-player-v1';
  H.createEmbeddedPlayer = function (frame, onStatus, onPlaying) {
    var channel = '', timer, seen = false, ready = false, intent = 'play';
    function status(kind, message) { onStatus({kind:kind, message:message}); }
    function wait() {
      clearTimeout(timer);
      timer = setTimeout(function () { status('error', 'Playback timed out. Try Open in YouTube or go back and retry.'); }, 30000);
    }
    function close() { channel = ''; ready = false; clearTimeout(timer); frame.removeAttribute('src'); }
    function receive(e) {
      if (!channel || e.origin !== origin || e.source !== frame.contentWindow) return;
      var d = e.data;
      if (!d || d.app !== protocol || d.channel !== channel) return;
      if (d.type === 'ready') { ready = true; status('ready', 'Ready — press OK to play'); command(intent); if (intent === 'play') wait(); }
      else if (d.type === 'blocked') { clearTimeout(timer); status('ready', 'Press OK to start playback'); }
      else if (d.type === 'error' || d.type === 'timeout') {
        clearTimeout(timer);
        status('error', 'Couldn’t play here'+(d.type === 'error' && typeof d.value === 'number' ? ' (YouTube '+d.value+')' : '')+'. Try Open in YouTube.');
      } else if (d.type === 'state') {
        if (d.value === 1) {
          intent = 'play'; clearTimeout(timer); status('playing', 'Playing');
          if (!seen) { seen = true; onPlaying(); }
        } else if (d.value === 2) { intent = 'pause'; clearTimeout(timer); status('paused', 'Paused — press OK to resume'); }
        else if (d.value === 0) { clearTimeout(timer); status('ended', 'Finished — press OK to replay'); }
        else if (d.value === 3) { status('loading', 'Buffering…'); wait(); }
        else if (d.value === -1 || d.value === 5) { status('ready', 'Ready — press OK to play'); }
      }
    }
    function command(action) {
      if (!channel || ['toggle','play','pause','forward','backward','stop'].indexOf(action) < 0) return;
      if (action === 'play' || action === 'pause' || action === 'stop') intent = action;
      if (ready && (action === 'pause' || action === 'stop')) clearTimeout(timer);
      frame.contentWindow.postMessage({app:protocol,channel:channel,action:action}, origin);
    }
    return {
      open:function (id) {
        if (!core.validId(id)) throw new Error('Invalid video');
        close(); seen = false; intent = 'play';
        var random = new Uint32Array(4); crypto.getRandomValues(random);
        channel = Array.prototype.map.call(random,function (n) { return n.toString(16).padStart(8,'0'); }).join('');
        status('loading', 'Loading player…');
        frame.src = origin+'/hackertube-samsung-tv/player/?video='+id+'#'+channel;
        wait();
      },
      close:close, active:function () { return !!channel; }, receive:receive,
      command:command
    };
  };
})(typeof module !== 'undefined' ? module.exports : (window.H = window.H || {}));
