(function () {
  var body = document.body,
    chip = document.getElementById('priceChip'),
    note = document.getElementById('dgNote'),
    bd = document.getElementById('btnDay'),
    bn = document.getElementById('btnNight'),
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    auto = null;

  function setMode(m) {
    body.classList.remove('mode-day', 'mode-night');
    body.classList.add('mode-' + m);
    if (m === 'day') {
      chip.innerHTML = 'Grid (day): <b>110–185 €/MWh</b>';
      note.textContent = 'Day — solar supplies your load and charges the battery at the cheapest hours';
    } else {
      chip.innerHTML = 'Grid (night): <b>200–260 €/MWh</b>';
      note.textContent = 'Night — the battery discharges instead of buying expensive grid power';
    }
  }
  function stopAuto() { if (auto) { clearInterval(auto); auto = null; } }
  bd.addEventListener('click', function () { stopAuto(); setMode('day'); });
  bn.addEventListener('click', function () { stopAuto(); setMode('night'); });
  if (!reduced) {
    auto = setInterval(function () {
      setMode(body.classList.contains('mode-day') ? 'night' : 'day');
    }, 6500);
  }

  // scroll reveals
  var els = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: .12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // gradual FAQ open/close
  document.querySelectorAll('.faq').forEach(function (details) {
    var summary = details.querySelector('summary');
    var content = details.querySelector('p');
    var anim = null;
    var closing = false;
    var expanding = false;

    if (reduced) return;

    summary.addEventListener('click', function (e) {
      e.preventDefault();
      details.style.overflow = 'hidden';
      if (!details.open || closing) {
        openFaq();
      } else if (expanding || details.open) {
        closeFaq();
      }
    });

    function openFaq() {
      details.style.height = details.offsetHeight + 'px';
      details.open = true;
      window.requestAnimationFrame(runExpand);
    }

    function runExpand() {
      expanding = true;
      closing = false;
      if (anim) anim.cancel();
      var startHeight = details.offsetHeight;
      var endHeight = summary.offsetHeight + content.scrollHeight;
      anim = details.animate(
        { height: [startHeight + 'px', endHeight + 'px'] },
        { duration: 400, easing: 'ease' }
      );
      content.style.opacity = 1;
      anim.onfinish = function () { onAnimEnd(true); };
      anim.oncancel = function () { expanding = false; };
    }

    function closeFaq() {
      expanding = false;
      closing = true;
      if (anim) anim.cancel();
      var startHeight = details.offsetHeight;
      var endHeight = summary.offsetHeight;
      anim = details.animate(
        { height: [startHeight + 'px', endHeight + 'px'] },
        { duration: 400, easing: 'ease' }
      );
      content.style.opacity = 0;
      anim.onfinish = function () { onAnimEnd(false); };
      anim.oncancel = function () { closing = false; };
    }

    function onAnimEnd(isOpen) {
      details.open = isOpen;
      anim = null;
      closing = false;
      expanding = false;
      details.style.height = '';
      details.style.overflow = '';
    }
  });

  // install-type image carousel
  var installCard = document.querySelector('.card-install');
  if (installCard) {
    var installSlides = installCard.querySelectorAll('.install-media img');
    var installTabs = installCard.querySelectorAll('.install-tab');
    var installIdx = 0;
    var installTimer = null;

    var showInstall = function (i) {
      installIdx = i;
      installSlides.forEach(function (img, n) { img.classList.toggle('is-active', n === i); });
      installTabs.forEach(function (tab, n) { tab.classList.toggle('is-active', n === i); });
    };

    var stopInstallAuto = function () {
      if (installTimer) { clearInterval(installTimer); installTimer = null; }
    };

    var startInstallAuto = function () {
      if (reduced || installSlides.length < 2) return;
      stopInstallAuto();
      installTimer = setInterval(function () {
        showInstall((installIdx + 1) % installSlides.length);
      }, 4000);
    };

    installTabs.forEach(function (tab, n) {
      tab.addEventListener('click', function () {
        showInstall(n);
        startInstallAuto();
      });
    });

    startInstallAuto();
  }

  // background parallax on odd sections
  var bgEls = document.querySelectorAll('main > section:nth-of-type(odd)');
  if (bgEls.length && !reduced) {
    var ticking = false;
    var updateParallax = function () {
      bgEls.forEach(function (el) {
        var shift = Math.max(-30, Math.min(30, el.getBoundingClientRect().top * .08));
        el.style.setProperty('--bg-shift', shift.toFixed(2) + 'px');
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(updateParallax); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', updateParallax);
    updateParallax();
  }

})();
