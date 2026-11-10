(function (H) {
  'use strict';
  var core = typeof module !== 'undefined' ? require('./core.js') : H;
  H.createTV = function (platform, openExternal) {
    function play(id, browser) {
      if (!core.validId(id)) return Promise.reject(new Error('Invalid video'));
      var url = 'https://www.youtube.com/watch?v=' + id;
      return new Promise(function (resolve, reject) {
        if (!platform) {
          if (openExternal) { openExternal(url); resolve(); } else reject(new Error('TV playback is unavailable'));
          return;
        }
        var settled = false;
        var timer = setTimeout(function () { done(new Error('The TV did not respond')); }, 10000);
        function done(error) {
          if (settled) return; settled = true; clearTimeout(timer);
          if (error) reject(new Error(error.message || error.name || 'Could not open YouTube')); else resolve();
        }
        try {
          // Some Samsung YouTube builds ignore the URI and read the video from PAYLOAD.
          var data = browser ? null : [new platform.ApplicationControlData('PAYLOAD', [JSON.stringify({values: 'v=' + id})])];
          var control = new platform.ApplicationControl('http://tizen.org/appcontrol/operation/view', url, null, null, data);
          platform.application.launchAppControl(control, browser ? 'org.tizen.browser' : '9Ur5IzDKqV.TizenYouTube',
            function () { done(); }, done);
        } catch (e) { done(e); }
      });
    }
    return {
      play: function (id) { return play(id, false); }, browser: function (id) { return play(id, true); },
      register: function () { if (platform) ['MediaPlayPause', 'MediaPlay', 'ColorF0Red'].forEach(function (key) {
        try { platform.tvinputdevice.registerKey(key); } catch (_) {}
      }); },
      exit: function () { if (platform) { try { platform.application.getCurrentApplication().exit(); } catch (_) {} } }
    };
  };
})(typeof module !== 'undefined' ? module.exports : (window.H = window.H || {}));
