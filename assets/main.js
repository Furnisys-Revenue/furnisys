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
