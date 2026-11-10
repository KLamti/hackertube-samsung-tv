(function (H) {
  'use strict';
  var core = typeof module !== 'undefined' ? require('./core.js') : H;
  H.apiPath = function (kind, o) {
    o = o || {};
    var endpoint = kind === 'home' ? 'feed' : kind === 'search' ? 'search' : 'list';
    var params = { n: 24, offset: Math.max(0, Number(o.offset) || 0) };
    if (kind === 'home') params.seed = Number(o.seed) || 1;
    if (kind === 'search') params.q = String(o.query || '').slice(0, 160);
    if (kind === 'longs') params.dur = 'xlong';
    if (kind === 'category') params.cat = String(o.category || '');
    return '/api/' + endpoint + '?' + Object.keys(params).map(function (k) { return k + '=' + encodeURIComponent(params[k]); }).join('&');
  };
  H.createAPI = function (base, fetcher) {
    fetcher = fetcher || function (url) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest(); xhr.open('GET', url); xhr.timeout = 15000;
        xhr.onload = function () {
          resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status,
            json: function () { return JSON.parse(xhr.responseText); } });
        };
        xhr.onerror = function () { reject(new Error('Connection failed')); };
        xhr.ontimeout = function () { reject(new Error('Connection timed out')); };
        xhr.send();
      });
    };
    function get(path) {
      return fetcher(base + path).then(function (r) {
        if (!r.ok) throw new Error('HackerTube returned ' + r.status);
        return r.json();
      });
    }
    return {
      videos: function (kind, options) {
        return get(H.apiPath(kind, options)).then(function (data) {
          var rows = kind === 'search' && data ? data.results : data;
          if (!Array.isArray(rows)) throw new Error('Unexpected catalogue response');
          return rows.map(core.cleanVideo).filter(Boolean);
        });
      },
      topics: function () { return get('/api/browse').then(function (data) {
        if (!Array.isArray(data)) throw new Error('Unexpected topics response');
        return data.filter(function (a) { return a && typeof a.name === 'string' && Array.isArray(a.categories); }).map(function (a) {
          return { name: a.name, categories: a.categories.filter(function (c) {
            return c && typeof c.id === 'string' && /^[a-z0-9-]+$/.test(c.id) && typeof c.name === 'string';
          }) };
        });
      }); },
      detail: function (id) {
        if (!core.validId(id)) return Promise.reject(new Error('Invalid video'));
        return get('/api/video?vid=' + id).then(function (data) {
          var video = core.cleanVideo(data && data.video);
          if (!video || video.vid !== id) throw new Error('This video is unavailable');
          return video;
        });
      }
    };
  };
})(typeof module !== 'undefined' ? module.exports : (window.H = window.H || {}));
