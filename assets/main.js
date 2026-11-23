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

/* Enquiry forms: quantity question follows the product chosen (lockers, wall, storage), and ?program= / ?product= preselects it */
(function () {
  var Q = {
    lockers: { l: 'Number of lockers', o: ['Up to 25', '26–50', '51–100', '101–250', 'More than 250'] },
    wall: { l: 'Number of walls or tool areas', o: ['1', '2–5', '6–10', '11–25', 'More than 25'] },
    storage: { l: 'Number of cabinets', o: ['1–4', '5–10', '11–25', '26–50', 'More than 50'] },
    trolleys: { l: 'Number of trolleys or racks', o: ['1–4', '5–10', '11–25', '26–50', 'More than 50'] },
    def: { l: 'Number of workstations', o: ['1–4', '5–10', '11–25', '26–50', 'More than 50'] }
  };
  function kind(v) { v = String(v || '').toLowerCase(); return /locker/.test(v) ? 'lockers' : /wall|pegboard/.test(v) ? 'wall' : /cabinet|storage/.test(v) ? 'storage' : /trolley|flow rack/.test(v) ? 'trolleys' : 'def'; }
  var qs = new URLSearchParams(location.search), want = qs.get('program') || qs.get('product') || '';
  document.querySelectorAll('form.nf-form').forEach(function (F) {
    var need = F.querySelector('select[data-k=need]'), qty = F.querySelector('select[data-k=qty]');
    if (!need) return;
    if (want && !need.value) {
      var k = kind(want), pick = Array.prototype.find.call(need.options, function (o) { return o.value && (k !== 'def' ? kind(o.text) === k : /workbench/i.test(o.text) && /workbench|workstation|series|flexi|esd/i.test(want)); });
      if (pick) need.value = pick.value || pick.text;
    }
    if (!qty) return;
    var lab = qty.closest('label'), span = lab && lab.querySelector('span');
    function apply() {
      var q = Q[kind(need.value)], cur = qty.value;
      if (qty.getAttribute('data-l') === q.l) return;
      qty.setAttribute('data-l', q.l);
      if (span) span.innerHTML = q.l + ' <em>*</em>';
      qty.innerHTML = '<option value="" selected disabled>Select</option>' + q.o.map(function (x) { return '<option>' + x + '</option>'; }).join('');
      if (q.o.indexOf(cur) > -1) qty.value = cur;
    }
    need.addEventListener('change', apply); apply();
  });
})();
