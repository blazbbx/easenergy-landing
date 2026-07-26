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
      }, 3000);
    };

    installTabs.forEach(function (tab, n) {
      tab.addEventListener('click', function () {
        showInstall(n);
        startInstallAuto();
      });
    });

    startInstallAuto();
  }

  // scroll-pinned steps: while .steps-stage is stuck, scrolling swaps the panel
  // in place rather than moving it
  var stepsScroll = document.querySelector('.steps-scroll');
  if (stepsScroll) {
    var stepsStage = stepsScroll.querySelector('.steps-stage');
    var stepPanels = stepsScroll.querySelectorAll('.step-panel');
    var stepDots = stepsScroll.querySelectorAll('.step-dot');
    var stepsFill = stepsScroll.querySelector('.steps-rail-fill');
    var stepCount = stepPanels.length;
    var stepCurrent = 0;
    var stepsTicking = false;

    var setStep = function (i) {
      if (i === stepCurrent) return;
      stepCurrent = i;
      stepPanels.forEach(function (p, n) {
        // side is derived from position in the sequence, not travel direction,
        // so going back animates as the exact reverse of going forward
        p.classList.toggle('is-active', n === i);
        p.classList.toggle('is-prev', n < i);
        p.classList.toggle('is-next', n > i);
      });
      stepDots.forEach(function (d, n) {
        d.classList.toggle('is-active', n === i);
        if (n === i) { d.setAttribute('aria-current', 'true'); }
        else { d.removeAttribute('aria-current'); }
      });
    };

    // how far we are through the pinned stretch, 0..1 (-1 when not pinning,
    // i.e. the stacked mobile / reduced-motion layout)
    var stepsProgress = function () {
      var span = stepsScroll.offsetHeight - stepsStage.offsetHeight;
      if (span <= 0) return -1;
      var top = parseFloat(getComputedStyle(stepsStage).top) || 0;
      var p = (top - stepsScroll.getBoundingClientRect().top) / span;
      return Math.max(0, Math.min(1, p));
    };

    var updateSteps = function () {
      stepsTicking = false;
      var p = stepsProgress();
      if (p < 0) return;
      setStep(Math.min(stepCount - 1, Math.floor(p * stepCount)));
      // the fill runs dot-to-dot, so it lands on a marker at each step's midpoint
      var f = Math.max(0, Math.min(stepCount - 1, p * stepCount - .5)) / (stepCount - 1);
      if (stepsFill) stepsFill.style.width = (f * 100).toFixed(2) + '%';
    };

    stepDots.forEach(function (dot, n) {
      dot.addEventListener('click', function () {
        var span = stepsScroll.offsetHeight - stepsStage.offsetHeight;
        if (span <= 0) return;
        var top = parseFloat(getComputedStyle(stepsStage).top) || 0;
        // aim for the middle of that step's slice so it reads as settled, not mid-swap
        var y = window.scrollY + stepsScroll.getBoundingClientRect().top - top +
          ((n + .5) / stepCount) * span;
        window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
      });
    });

    window.addEventListener('scroll', function () {
      if (!stepsTicking) { requestAnimationFrame(updateSteps); stepsTicking = true; }
    }, { passive: true });
    window.addEventListener('resize', updateSteps);
    updateSteps();
  }

})();
