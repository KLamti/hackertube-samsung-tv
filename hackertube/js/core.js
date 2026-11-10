(function (H) {
  'use strict';
  H.validId = function (id) { return typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id); };
  function text(value, fallback) { return typeof value === 'string' ? value.slice(0, 6000) : (fallback || ''); }
  H.cleanVideo = function (v) {
    if (!v || !H.validId(v.vid)) return null;
    return { vid: v.vid, title: text(v.title, 'Untitled video'), channel: text(v.channel),
      duration_s: Number.isFinite(v.duration_s) && v.duration_s > 0 ? Math.floor(v.duration_s) : 0,
      summary: text(v.summary), why_hn: text(v.why_hn), reason: text(v.reason),
      recommenders: v.hn && Number.isFinite(v.hn.recommenders) ? Math.max(0,v.hn.recommenders) : (Number.isFinite(v.recommenders) ? Math.max(0,v.recommenders) : 0) };
  };
  H.escape = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); };
  H.duration = function (s) { var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? h + 'h ' + m + 'm' : m + ' min'; };
  // Spatial navigation prefers aligned elements, then the nearest diagonal candidate.
  H.moveFocus = function (rects, current, direction) {
    if (!rects.length) return -1;
    if (!rects[current]) return 0;
    var from = rects[current], horizontal = direction === 'left' || direction === 'right';
    var sign = direction === 'left' || direction === 'up' ? -1 : 1;
    var best = current, score = Infinity;
    rects.forEach(function (r, i) {
      if (i === current) return;
      var dx = (r.x + r.w / 2) - (from.x + from.w / 2), dy = (r.y + r.h / 2) - (from.y + from.h / 2);
      var primary = sign * (horizontal ? dx : dy), secondary = Math.abs(horizontal ? dy : dx);
      if (primary <= 2) return;
      // Horizontal movement never wraps from the end of one row to another.
      var overlap = horizontal ? Math.min(from.y + from.h, r.y + r.h) - Math.max(from.y, r.y)
        : Math.min(from.x + from.w, r.x + r.w) - Math.max(from.x, r.x);
      if (horizontal && overlap <= 0) return;
      var s = primary + secondary * 3 + (overlap <= 0 ? 10000 : 0);
      if (s < score) { score = s; best = i; }
    });
    return best;
  };
  H.createStore = function (storage) {
    var key = 'hackertube.state.1', state = {};
    try { state = JSON.parse(storage.getItem(key) || '{}') || {}; } catch (_) {}
    function clean(rows) {
      var found = {};
      return (Array.isArray(rows) ? rows : []).map(H.cleanVideo).filter(function (v) {
        if (!v || found[v.vid]) return false; found[v.vid] = true; return true;
      }).slice(0, 100);
    }
    state = { saved: clean(state.saved), history: clean(state.history), resume: state.resume || null };
    function persist() { try { storage.setItem(key, JSON.stringify(state)); } catch (_) { /* session state still works */ } }
    return {
      saved: function () { return state.saved.slice(); }, history: function () { return state.history.slice(); },
      has: function (id) { return state.saved.some(function (v) { return v.vid === id; }); },
      toggle: function (video) {
        var v = H.cleanVideo(video); if (!v) return false;
        var exists = this.has(v.vid);
        state.saved = state.saved.filter(function (x) { return x.vid !== v.vid; });
        if (!exists) state.saved.unshift(v);
        state.saved = state.saved.slice(0, 100); persist(); return !exists;
      },
      seen: function (video) {
        var v = H.cleanVideo(video); if (!v) return;
        state.history = [v].concat(state.history.filter(function (x) { return x.vid !== v.vid; })).slice(0, 100); persist();
      },
      resume: function (value) { if (arguments.length) { state.resume = value; persist(); } return state.resume; }
    };
  };
})(typeof module !== 'undefined' ? module.exports : (window.H = window.H || {}));
