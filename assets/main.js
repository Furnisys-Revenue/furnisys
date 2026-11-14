// Furnisys site: mobile menu, contact form, footer year.
(function () {
  var h = document.querySelector('.site-header');
  function sc() { if (h) h.classList.toggle('scrolled', scrollY > 8); }
  addEventListener('scroll', sc, { passive: true }); sc();
  document.querySelectorAll('.photo img').forEach(function (im) {
    function miss() {
      var fb = im.getAttribute('data-fallback');
      if (fb) { im.removeAttribute('data-fallback'); im.src = fb; return; }
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
