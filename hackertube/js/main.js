(function (H) {
  'use strict';
  var $ = function (s) { return document.querySelector(s); }, esc = H.escape;
  var platform = window.tizen && window.tizen.application ? window.tizen : null;
  var tv = H.createTV(platform, function (url) { window.open(url, '_blank', 'noopener'); });
  var api = H.createAPI(platform ? 'https://hackertube.org' : '');
  var storage; try { storage = window.localStorage; } catch (_) { storage = null; }
  var store = H.createStore(storage), content = $('#content'), overlay = $('#overlay');
  var page = {kind:'home',offset:0,seed:Math.floor(Math.random()*100000)}, generation = 0;
  var videos = [], detail = null, parentSnapshot = null, lastFocus = null, overlayFocus = null, toastTimer;
  var pages = {
    home:['Worth your time.', 'Talks, ideas and rabbit holes that stayed with people.'],
    search:['Find your next rabbit hole.', 'Search titles, ideas and topics.'],
    topics:['Follow your curiosity.', 'Explore the topics people keep coming back to.'],
    longs:['Settle in.', 'Lectures, deep dives and conversations over an hour.'],
    saved:['For another evening.', 'Your Watch later list, saved on this TV.'],
    history:['Pick up a thread.', 'Videos you opened from HackerTube on this TV.'],
    category:['Explore a topic.', 'Videos recommended in Hacker News conversations.']
  };
  function button(text, action, cls, attrs) {
    return '<button class="action '+(cls || '')+'" data-action="'+action+'" '+(attrs || '')+'>'+esc(text)+'</button>';
  }
  function focus(el) {
    if (!el) return;
    el.focus();
    if (content.contains(el)) el.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  function focusContent(id) {
    if (!overlay.hidden) return;
    focus((id && document.getElementById(id)) || content.querySelector('button:not(:disabled)') || $('nav button.active'));
  }
  function toast(message) {
    clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').hidden = false;
    toastTimer = setTimeout(function () { $('#toast').hidden = true; }, 4500);
  }
  function thumbnail(v, cls) {
    return '<img class="'+(cls || '')+'" src="https://i.ytimg.com/vi/'+v.vid+'/hq2.jpg" data-video-image="'+v.vid+'" alt="" loading="lazy">';
  }
  function card(v) {
    return '<button class="card" id="video-'+v.vid+'" data-video="'+v.vid+'" aria-label="'+esc(v.title)+'">'+
      '<span class="thumb">'+thumbnail(v)+'<span class="duration">'+esc(H.duration(v.duration_s))+'</span></span>'+
      '<span class="card-title">'+esc(v.title)+'</span><span class="card-sub">'+esc(v.channel)+'</span>'+
      '<span class="card-reason">'+esc(v.reason || (v.recommenders ? v.recommenders+' HN recommenders' : 'Recommended on Hacker News'))+'</span></button>';
  }
  function snapshot() { return {page:Object.assign({},page), videos:videos.slice(), html:content.innerHTML, scroll:content.scrollTop, focus:document.activeElement.id}; }
  function remember() {
    var id = detail ? 'video-'+detail.vid : (document.activeElement && document.activeElement.id);
    store.resume({page:page,focus:id || null});
  }
  function setHeader() {
    var copy = pages[page.kind] || pages.home;
    $('#heading').textContent = page.kind === 'category' ? page.title : page.kind === 'search' && page.query ? 'Results for “'+page.query+'”' : copy[0];
    $('#subtitle').textContent = copy[1];
    document.querySelectorAll('nav button').forEach(function (b) {
      var selected = b.dataset.page === page.kind || (page.kind === 'category' && b.dataset.page === 'topics');
      b.classList.toggle('active', selected);
      if (selected) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current');
    });
  }
  function empty(message) {
    content.innerHTML = '<div class="status"><h2>'+esc(message)+'</h2><p>Choose another section from the menu.</p>'+button('Back to Home','home')+'</div>';
    focusContent();
  }
  function showError(error) {
    content.innerHTML = '<div class="status"><h2>Couldn’t load this page.</h2><p>'+esc(error.message)+'. Check the TV’s internet connection and try again.</p>'+button('Try again','retry','primary')+'</div>';
    focusContent();
  }
  function renderVideos(rows, restoreId) {
    videos = rows;
    if (!rows.length) { empty(page.kind === 'saved' ? 'Save a video to watch it later.' : page.kind === 'history' ? 'Your next rabbit hole starts here.' : 'No videos found.'); return; }
    var paged = ['home','longs','category'].indexOf(page.kind) >= 0;
    content.innerHTML = (page.kind === 'search' ? '<div class="detail-back">'+button('Edit search','search')+'</div>' : '')+
      '<div class="grid">'+rows.map(card).join('')+'</div>'+
      (paged ? '<div class="pager">'+(page.offset ? button('Previous page','previous') : '')+
        '<span>Page '+(Math.floor(page.offset/24)+1)+'</span>'+ (rows.length === 24 ? button('More videos','next','primary') : '')+'</div>' : '');
    content.scrollTop = 0; focusContent(restoreId); remember();
  }
  function load(next, restoreId) {
    var token = ++generation;
    page = Object.assign({offset:0,seed:page.seed},next); detail = null; parentSnapshot = null;
    setHeader(); content.scrollTop = 0;
    content.innerHTML = '<p class="status">Loading '+(page.kind === 'topics' ? 'topics' : 'videos')+'…</p>';
    remember();
    if (page.kind === 'saved' || page.kind === 'history') { renderVideos(page.kind === 'saved' ? store.saved() : store.history(),restoreId); return; }
    if (page.kind === 'search' && !page.query) {
      content.innerHTML = '<div class="status"><h2>What are you curious about?</h2><p>Search with the on-screen keyboard, using your remote.</p>'+button('Search videos','search','primary')+'</div>';
      focusContent(); return;
    }
    if (page.kind === 'topics') {
      api.topics().then(function (areas) {
        if (token !== generation) return;
        if (!areas.length) { empty('No topics available.'); return; }
        content.innerHTML = areas.map(function (a) { return '<h2 class="section-title">'+esc(a.name)+'</h2><div class="topics">'+a.categories.map(function (c) {
          return '<button class="topic" id="topic-'+c.id+'" data-category="'+c.id+'" data-title="'+esc(c.name)+'">'+esc(c.name)+'</button>';
        }).join('')+'</div>'; }).join('');
        focusContent(restoreId);
      }).catch(function (error) { if (token === generation) showError(error); });
      return;
    }
    api.videos(page.kind,page).then(function (rows) { if (token === generation) renderVideos(rows,restoreId); })
      .catch(function (error) { if (token === generation) showError(error); });
  }
  function showDetail(video) {
    parentSnapshot = snapshot(); detail = video; var token = ++generation;
    $('#heading').textContent = 'A closer look.'; $('#subtitle').textContent = 'A good recommendation deserves a little context.';
    content.scrollTop = 0;
    content.innerHTML = '<div class="detail-back">'+button('‹ Back to videos','back')+'</div><article class="detail">'+
      '<div>'+thumbnail(video,'detail-image')+'<p class="detail-side">From <strong>HackerTube</strong><br>Videos recommended in Hacker News conversations.</p><p class="detail-side">Playback opens YouTube. Reopen HackerTube from your launcher to return to this list.</p></div>'+
      '<div><h2>'+esc(video.title)+'</h2><div class="detail-meta">'+esc(video.channel)+' · '+esc(H.duration(video.duration_s))+'</div>'+
      '<div class="detail-actions">'+button('▶ Watch on YouTube','play','primary','id="play"')+button(store.has(video.vid)?'✓ Saved':'＋ Watch later','save','','id="save"')+'</div>'+
      '<p class="error" id="play-error" hidden></p><p class="summary" id="summary">'+esc(video.summary || 'Loading description…')+'</p>'+
      '<p class="why" id="why">'+esc(video.why_hn || video.reason || 'Recommended on Hacker News.')+'</p>'+
      '<div class="detail-actions">'+button('Open in TV browser','browser')+'</div></div></article>';
    focusContent('play'); remember();
    api.detail(video.vid).then(function (full) {
      if (token !== generation || !detail) return;
      detail = full; $('#summary').textContent = full.summary || 'No description available.';
      $('#why').textContent = full.why_hn || 'Recommended on Hacker News.';
    }).catch(function () {
      if (token === generation && $('#summary') && !video.summary) $('#summary').textContent = 'The full description could not be loaded. You can still open this video.';
    });
  }
  function closeOverlay() {
    overlay.hidden = true; overlay.innerHTML = '';
    focus(overlayFocus && overlayFocus.isConnected ? overlayFocus : $('nav button.active'));
  }
  function openOverlay(html) {
    overlayFocus = document.activeElement; overlay.innerHTML = html; overlay.hidden = false;
    focus(overlay.querySelector('button'));
  }
  function search() {
    var keys = 'abcdefghijklmnopqrstuvwxyz0123456789-+?'.split('');
    openOverlay('<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="search-title"><h2 id="search-title">Find something worth watching.</h2>'+
      '<input id="query" class="search-value" aria-label="Search videos" maxlength="160" value="'+esc(page.query || '')+'" placeholder="Try: programming, physics, creativity…">'+
      '<div class="keys">'+keys.map(function (key) { return '<button class="key" data-key="'+esc(key)+'">'+esc(key)+'</button>'; }).join('')+'</div>'+
      '<div class="buttons">'+button('Search','submit-search','primary')+button('Space','space')+button('⌫ Delete','delete')+button('Clear','clear')+button('Cancel','cancel')+'</div>'+
      '<p class="keyboard-note">Use arrows and OK to type. Back closes the keyboard. A connected keyboard works too.</p></div>');
  }
  function back() {
    if (!overlay.hidden) { closeOverlay(); return; }
    if (detail && parentSnapshot) {
      ++generation; detail = null;
      var prev = parentSnapshot; parentSnapshot = null; page = prev.page; videos = prev.videos; setHeader();
      if (page.kind === 'saved' || page.kind === 'history') {
        var rows = page.kind === 'saved' ? store.saved() : store.history();
        var oldIndex = prev.videos.findIndex(function (v) { return 'video-'+v.vid === prev.focus; });
        var nearest = rows[Math.max(0,Math.min(oldIndex,rows.length-1))];
        renderVideos(rows, rows.some(function(v){return 'video-'+v.vid===prev.focus;}) ? prev.focus : nearest && 'video-'+nearest.vid);
        return;
      }
      content.innerHTML = prev.html; content.scrollTop = prev.scroll; focusContent(prev.focus); remember(); return;
    }
    if (page.kind === 'category') { load({kind:'topics'}); return; }
    if (!document.activeElement.closest('nav')) { focus($('nav button.active')); return; }
    if (page.kind !== 'home') { load({kind:'home'}); return; }
    openOverlay('<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="exit-title"><h2 id="exit-title">Leave HackerTube?</h2><p>Your saved videos will be here next time.</p><div class="buttons">'+button('Keep browsing','cancel','primary')+button('Exit','exit')+'</div></div>');
  }
  function launch(browser) {
    if (!detail) return;
    var video = detail, token = generation;
    remember(); $('#play-error').hidden = true;
    toast(browser ? 'Opening the TV browser…' : 'Opening YouTube…');
    (browser ? tv.browser(video.vid) : tv.play(video.vid)).then(function () { store.seen(video); }).catch(function (error) {
      if (token !== generation || !$('#play-error')) return;
      $('#play-error').textContent = 'Couldn’t open '+(browser?'the browser':'YouTube')+' ('+error.message+').'+(browser?'':' Try “Open in TV browser” below.');
      $('#play-error').hidden = false; toast('Couldn’t open the video.');
    });
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('button'); if (!el || el.disabled) return;
    if (!overlay.hidden && !overlay.contains(el)) return;
    if (el.dataset.page) { if (el.dataset.page === 'search') search(); else load({kind:el.dataset.page}); return; }
    if (el.dataset.video) { var v = videos.find(function (x) { return x.vid === el.dataset.video; }); if(v) showDetail(v); return; }
    if (el.dataset.category) { load({kind:'category',category:el.dataset.category,title:el.dataset.title}); return; }
    if (el.dataset.key) { var q=$('#query'); if(q.value.length<160) q.value += el.dataset.key; return; }
    switch (el.dataset.action) {
      case 'back': back(); break;
      case 'home': load({kind:'home'}); break;
      case 'retry': load(page); break;
      case 'next': load(Object.assign({},page,{offset:page.offset+24})); break;
      case 'previous': load(Object.assign({},page,{offset:Math.max(0,page.offset-24)})); break;
      case 'search': search(); break;
      case 'cancel': closeOverlay(); break;
      case 'exit': tv.exit(); closeOverlay(); break;
      case 'submit-search':
        var query=$('#query').value.trim(); if(!query) { toast('Type something to search for.'); return; }
        closeOverlay(); load({kind:'search',query:query}); break;
      case 'space': if($('#query').value.length<160) $('#query').value+=' '; break;
      case 'delete': $('#query').value=$('#query').value.slice(0,-1); break;
      case 'clear': $('#query').value=''; break;
      case 'save': if(detail) { var saved=store.toggle(detail); el.textContent=saved?'✓ Saved':'＋ Watch later'; toast(saved?'Saved to Watch later.':'Removed from Watch later.'); } break;
      case 'play': launch(false); break;
      case 'browser': launch(true); break;
    }
  });
  document.addEventListener('keydown', function (e) {
    var code = e.keyCode, active = document.activeElement;
    if (code === 10009 || code === 27) { e.preventDefault(); back(); return; }
    if (active && active.tagName === 'INPUT') {
      if (code === 13) { e.preventDefault(); $('[data-action="submit-search"]').click(); }
      else if (code === 40) { e.preventDefault(); focus(overlay.querySelector('.key')); }
      return;
    }
    if (code === 13) { e.preventDefault(); if (active && active.tagName === 'BUTTON') active.click(); return; }
    if (code === 415 || code === 10252) { e.preventDefault(); if (overlay.hidden && detail) launch(false); return; }
    if (code === 403 || e.key === '/') { e.preventDefault(); if (overlay.hidden) search(); return; }
    var direction = {37:'left',38:'up',39:'right',40:'down'}[code];
    if (!direction) return;
    e.preventDefault();
    var root = overlay.hidden ? document : overlay;
    var els = Array.prototype.slice.call(root.querySelectorAll('button:not(:disabled),input')).filter(function (b) { return b.getClientRects().length && !b.closest('[hidden]'); });
    var rects = els.map(function (b) { var r=b.getBoundingClientRect(); return {x:r.left,y:r.top,w:r.width,h:r.height}; });
    focus(els[H.moveFocus(rects,els.indexOf(active),direction)]);
  });
  document.addEventListener('focusin', function (e) { if(overlay.hidden) lastFocus=e.target; });
  document.addEventListener('visibilitychange',function () { if(document.hidden) remember(); else if(overlay.hidden) focus(lastFocus && lastFocus.isConnected ? lastFocus : $('nav button.active')); });
  document.addEventListener('error',function (e) {
    var img=e.target; if(img.tagName!=='IMG'||!H.validId(img.dataset.videoImage))return;
    if(img.src.indexOf('/hq2.jpg')>=0)img.src='https://i.ytimg.com/vi/'+img.dataset.videoImage+'/hqdefault.jpg';
  },true);
  function clock() { $('#clock').textContent=new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }
  clock(); setInterval(clock,30000); tv.register();
  var resume=store.resume();
  if(resume && resume.page && pages[resume.page.kind]) {
    var p=resume.page;
    load({kind:p.kind,query:typeof p.query==='string'?p.query.slice(0,160):'',category:typeof p.category==='string'?p.category:'',
      title:typeof p.title==='string'?p.title:'Explore a topic.',offset:Math.max(0,Math.floor(Number(p.offset)||0)),seed:Number(p.seed)||1},
      typeof resume.focus==='string'?resume.focus:null);
  } else load(page);
})(window.H);
