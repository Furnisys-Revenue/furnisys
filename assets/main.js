// Furnisys site: mobile menu, contact form, footer year.
(function () {
  var h = document.querySelector('.site-header');
  function sc() { if (h) h.classList.toggle('scrolled', scrollY > 8); }
  addEventListener('scroll', sc, { passive: true }); sc();
  // relevant real photo for any frame whose image fails to load
  var PH = [[/esd|pcb|electron/i, 'ph-pcb-testing-line'], [/scitec|test|instrument|lab/i, 'ph-electronics-test-bench'], [/metrolog|inspect|calibrat|gauge/i, 'ph-metrology-bench'],
    [/pro series|heavy|fabricat|weld|machin|metal/i, 'ph-metalworking-benches'], [/mobile|trolley|cart/i, 'ph-mobile-site-workshop'], [/flow rack|kitting|\bbins?\b/i, 'ph-kitting-flow-racks'],
    [/issue|counter|spare|parts/i, 'ph-parts-issue-counter'], [/drawer|cabinet|storage/i, 'ph-spare-parts-cabinets'], [/peg|wall|tool board|uprighter|overhead/i, 'ph-point-of-use-tools'],
    [/locker/i, 'cat-lockers-system'], [/flexi|assembly|workstation/i, 'ph-assembly-line'], [/aero|aircraft|aviation/i, 'ph-aerospace-rd'], [/auto|car|vehicle|service/i, 'ph-auto-service-bay'],
    [/tractor|agri|farm/i, 'ph-tractor-service'], [/oil|gas|valve|pump/i, 'ph-oilgas-maintenance'], [/power|plant|maint/i, 'ph-power-maintenance'], [/container|site/i, 'ph-container-workshop']];
  var POOL = ['ph-assembly-line', 'ph-metalworking-benches', 'ph-gauge-test-bench', 'ph-spare-parts-cabinets', 'ph-kitting-flow-racks', 'ph-point-of-use-tools'], pi = 0;
  function pickPhoto(alt) { for (var i = 0; i < PH.length; i++) if (PH[i][0].test(alt)) return PH[i][1]; return POOL[(pi++) % POOL.length]; }
  document.querySelectorAll('.photo img').forEach(function (im) {
    function miss() {
      var fb = im.getAttribute('data-fallback');
      if (fb) { im.removeAttribute('data-fallback'); im.src = fb; return; }
      if (!im.dataset.filled) { im.dataset.filled = '1'; im.src = 'assets/img/' + pickPhoto(im.alt || '') + '.jpg'; return; }
      im.parentNode.classList.add('missing');
    }
    if (im.complete && im.naturalWidth === 0) miss(); else im.addEventListener('error', miss);
  });
  document.querySelectorAll('.dd-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var dd = b.parentNode, open = !dd.classList.contains('open');
      document.querySelectorAll('.dd.open').forEach(function (o) { if (o !== dd) { o.classList.remove('open'); o.firstChild.setAttribute('aria-expanded', 'false'); } });
      dd.classList.toggle('open', open); b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.dd')) document.querySelectorAll('.dd.open').forEach(function (o) { o.classList.remove('open'); }); });
  var t = document.querySelector('.nav-toggle'), n = document.getElementById('site-nav');
  if (t && n) t.addEventListener('click', function () {
    var open = n.classList.toggle('open'); t.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  var y = document.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  function openHash(h) { var el = h && document.getElementById(h.slice(1)); if (el && el.tagName === 'DETAILS') el.open = true; }
  openHash(location.hash);
  document.querySelectorAll('.toc-links a').forEach(function (a) { a.addEventListener('click', function () { openHash(a.getAttribute('href')); }); });
  document.querySelectorAll('.toc-all').forEach(function (b) {
    b.addEventListener('click', function () {
      var all = document.querySelectorAll('details.sec'), anyClosed = Array.prototype.some.call(all, function (d) { return !d.open; });
      all.forEach(function (d) { d.open = anyClosed; }); b.textContent = anyClosed ? 'Collapse all sections' : 'Expand all sections';
    });
  });
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = list.querySelectorAll('[role="tab"]');
    function selectTab(t) {
      tabs.forEach(function (x) { var on = x === t; x.setAttribute('aria-selected', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1;
        var p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { selectTab(t); });
      t.addEventListener('keydown', function (e) {
        var d = (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? 1 : (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 0; if (!d) return;
        e.preventDefault(); var n = tabs[(i + d + tabs.length) % tabs.length]; selectTab(n); n.focus();
      });
    });
  });
  document.querySelectorAll('.fchips').forEach(function (g) {
    var grid = g.nextElementSibling;
    if (!grid || !grid.classList.contains('filterable')) return;
    g.querySelectorAll('.fchip').forEach(function (b) {
      b.addEventListener('click', function () {
        g.querySelectorAll('.fchip').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        var f = b.getAttribute('data-f');
        Array.prototype.forEach.call(grid.children, function (c) { c.hidden = f !== 'all' && (' ' + (c.getAttribute('data-cat') || '') + ' ').indexOf(' ' + f + ' ') < 0; });
      });
    });
  });
  // gallery lightbox
  var lb = document.getElementById('lightbox');
  if (lb) {
    var items = Array.prototype.slice.call(document.querySelectorAll('.g-item')), cur = 0, lbImg = lb.querySelector('img'), cap = lb.querySelector('figcaption'), last;
    function recount() {
      document.querySelectorAll('.g-sub').forEach(function (sub) { var n = sub.querySelectorAll('.g-item').length; var c = sub.querySelector('h3 .cnt'); if (c) c.textContent = n; if (!n) sub.remove(); });
      document.querySelectorAll('.g-sec').forEach(function (sec) { var n = sec.querySelectorAll('.g-item').length; var a = document.querySelector('.g-nav a[href="#' + sec.id + '"] .cnt'); if (a) a.textContent = n; if (!n) { sec.remove(); var l = document.querySelector('.g-nav a[href="#' + sec.id + '"]'); if (l) l.remove(); } });
    }
    function drop(b) { var li = b.parentNode; items.splice(items.indexOf(b), 1); li.remove(); recount(); }
    items.slice().forEach(function (b) { var im = b.querySelector('img');
      function bad() { var fb = im.getAttribute('data-fallback'); if (fb && im.src !== fb) { im.src = fb; b.setAttribute('data-full', fb); im.removeAttribute('data-fallback'); } else drop(b); }
      im.addEventListener('error', bad);
      im.addEventListener('load', function () { if (im.naturalWidth < 60) drop(b); });
      if (im.complete && im.naturalWidth === 0 && im.src) bad();
    });
    function show(i) { cur = (i + items.length) % items.length; var b = items[cur]; lbImg.src = b.getAttribute('data-full'); lbImg.alt = b.getAttribute('data-cap'); cap.textContent = b.getAttribute('data-cap'); }
    lbImg.addEventListener('error', function () { var fb = items[cur].getAttribute('data-fallback'); if (fb && lbImg.src !== fb) lbImg.src = fb; });
    function open(i) { last = document.activeElement; show(i); lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus(); }
    function close() { lb.hidden = true; document.body.style.overflow = ''; if (last) last.focus(); }
    items.forEach(function (b) { b.addEventListener('click', function () { open(items.indexOf(b)); }); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
    lb.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.querySelectorAll('.g-grid').forEach(function (g) { g.addEventListener('contextmenu', function (e) { e.preventDefault(); }); });
  }
  // FAQ search + filter
  var fq = document.getElementById('faq-q');
  if (fq) {
    var groups = document.querySelectorAll('.faq-group'), empty = document.querySelector('.faq-empty'), cat = 'all';
    function apply() {
      var q = fq.value.trim().toLowerCase(), any = false;
      groups.forEach(function (g) {
        var vis = 0;
        g.querySelectorAll('.faq-item').forEach(function (it) { var ok = (!q || it.textContent.toLowerCase().indexOf(q) >= 0); it.hidden = !ok; if (ok) { vis++; if (q) it.open = true; } });
        g.hidden = !vis || (cat !== 'all' && g.getAttribute('data-cat') !== cat); if (!g.hidden) any = true;
      });
      empty.hidden = any;
    }
    fq.addEventListener('input', apply);
    document.querySelectorAll('.faq-chips .fchip').forEach(function (b) { b.addEventListener('click', function () {
      document.querySelectorAll('.faq-chips .fchip').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); }); cat = b.getAttribute('data-f'); apply(); }); });
  }
  var qq = new URLSearchParams(location.search);
  document.querySelectorAll('form.qform').forEach(function (fm) {
    var note = fm.querySelector('.form-note'), res = fm.querySelector('.form-result'), pre = res.querySelector('pre');
    if (qq.get('product') && fm.message) fm.message.value = 'Interested in: ' + qq.get('product') + '\n';
    if (qq.get('type') === 'partner' && fm.ptype) fm.ptype.value = 'Channel partnership';
    fm.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = Array.prototype.filter.call(fm.querySelectorAll('[required]'), function (el) { return !el.value.trim(); });
      if (bad.length || !/^\S+@\S+\.\S+$/.test(fm.email.value)) {
        note.textContent = 'Fill in all fields, including a valid work email, then submit again.'; note.hidden = false; (bad[0] || fm.email).focus(); return;
      }
      note.hidden = true;
      var L = function (el) { var lab = fm.querySelector('label[for="' + el.id + '"]'); return (lab ? lab.textContent : el.name) + ': ' + el.value; };
      var body = Array.prototype.map.call(fm.querySelectorAll('input,select'), L).join('\n') + '\n\nProject brief:\n' + fm.message.value;
      pre.textContent = body; res.hidden = false;
      location.href = 'mailto:enquiry@furnisys.co?subject=' + encodeURIComponent('Project brief - ' + fm.company.value + ' (' + fm.size.value + ')') + '&body=' + encodeURIComponent(body);
    });
    res.querySelector('.copy-btn').addEventListener('click', function () {
      var b = this; if (navigator.clipboard) navigator.clipboard.writeText(pre.textContent).then(function () { b.textContent = 'Copied'; });
    });
  });
  var f = document.getElementById('enquiry-form'); if (!f) return;
  var q = new URLSearchParams(location.search);
  if (q.get('program')) f.program.value = q.get('program');
  if (q.get('type')) f.type.value = q.get('type');
  if (q.get('product')) f.message.value = 'Product: ' + q.get('product') + '\n';
  var err = document.getElementById('form-error'), res = document.getElementById('form-result'), txt = document.getElementById('form-text');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var missing = ['name', 'company', 'email', 'message'].filter(function (k) { return !f[k].value.trim(); });
    if (missing.length || !/^\S+@\S+\.\S+$/.test(f.email.value)) {
      err.textContent = 'Add your name, company, a valid work email and a short description of your space, then send again.';
      err.hidden = false; return;
    }
    err.hidden = true;
    var body = 'Name: ' + f.name.value + '\nCompany: ' + f.company.value + '\nEmail: ' + f.email.value +
      '\nPhone: ' + f.phone.value + '\nEnquiry type: ' + f.type.options[f.type.selectedIndex].text +
      '\nProgram: ' + f.program.value + '\nIndustry: ' + f.industry.value + '\n\n' + f.message.value;
    txt.textContent = body; res.hidden = false;
    var subj = (f.type.value === 'partner' ? 'Channel partner enquiry' : 'Website enquiry') + ' - ' + f.company.value;
    location.href = 'mailto:enquiry@furnisys.co?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body);
  });
  document.getElementById('copy-btn').addEventListener('click', function () {
    var b = this;
    function sel() { var r = document.createRange(); r.selectNodeContents(txt); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }
    if (navigator.clipboard) navigator.clipboard.writeText(txt.textContent).then(function () { b.textContent = 'Copied'; }, sel); else sel();
  });
})();

// Quick-contact bar on phones: Call / WhatsApp / Get a quote, on every page (desktop keeps the existing floating WhatsApp button).
(function () {
  if (document.querySelector('.qc-bar') || /^configurator\./.test(location.host)) return;
  var PHONE = '917045763012', TEL = '+917045763012';
  var h1 = document.querySelector('h1'), topic = h1 ? h1.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : '';
  var msg = 'Hello Furnisys, I\'d like to know more' + (topic && location.pathname !== '/' ? ' about ' + topic : '') + '. (Page: ' + location.host + location.pathname + ')';
  var wa = 'https://wa.me/' + PHONE + '?text=' + encodeURIComponent(msg);
  var ql = document.querySelector('a[href^="/contact?product="]'), quote = ql ? ql.getAttribute('href') : '/contact';
  var icoWA = '<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7c-2 0-4-.5-5.7-1.6l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6.3-.5c.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.3 1.4 3.5c.2.2 2.4 3.6 5.7 5 .8.4 1.4.6 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.1-.3-.2-.6-.4z"/></svg>';
  var icoTel = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>';
  var bar = document.createElement('nav');
  bar.className = 'qc-bar'; bar.setAttribute('aria-label', 'Quick contact');
  bar.innerHTML = '<a href="tel:' + TEL + '">' + icoTel + '<span>Call</span></a>' +
    '<a href="' + wa + '" target="_blank" rel="noopener" class="qc-bar-wa">' + icoWA.replace(/26/g, '20') + '<span>WhatsApp</span></a>' +
    '<a href="' + quote + '" class="qc-bar-quote"><span>Get a quote</span></a>';
  document.body.appendChild(bar); document.body.classList.add('has-qc');
})();
