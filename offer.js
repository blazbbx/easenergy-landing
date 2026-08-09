(function () {

  /* ---------- site address suggestions ----------
     Nominatim (OpenStreetMap) needs no API key or billing, unlike Google Places
     or Mapbox. Results are limited to Hungary; drop the countrycodes param to
     search worldwide. The native autocomplete="street-address" on the input
     still works on its own if this request fails or is blocked. */
  var addr = document.getElementById('address');
  var acList = document.getElementById('addressList');

  if (addr && acList && window.fetch) {
    var acTimer = null;
    var acAbort = null;
    var acItems = [];
    var acIndex = -1;

    var closeAc = function () {
      acList.hidden = true;
      acList.innerHTML = '';
      acItems = [];
      acIndex = -1;
      addr.setAttribute('aria-expanded', 'false');
      addr.removeAttribute('aria-activedescendant');
    };

    var highlight = function (i) {
      var nodes = acList.querySelectorAll('.ac-item');
      if (!nodes.length) return;
      if (i < 0) i = nodes.length - 1;
      if (i >= nodes.length) i = 0;
      acIndex = i;
      nodes.forEach(function (n, k) { n.classList.toggle('is-active', k === i); });
      addr.setAttribute('aria-activedescendant', nodes[i].id);
    };

    var render = function (results) {
      acItems = results;
      acIndex = -1;
      if (!results.length) { closeAc(); return; }
      acList.innerHTML = '';
      results.forEach(function (r, i) {
        var li = document.createElement('li');
        li.className = 'ac-item';
        li.id = 'ac-item-' + i;
        li.setAttribute('role', 'option');
        li.textContent = r.display_name;
        li.addEventListener('mousedown', function (e) {
          // mousedown, not click: the input's blur would close the list first
          e.preventDefault();
          addr.value = r.display_name;
          closeAc();
        });
        acList.appendChild(li);
      });
      acList.hidden = false;
      addr.setAttribute('aria-expanded', 'true');
    };

    var search = function (q) {
      if (acAbort) acAbort.abort();
      acAbort = new AbortController();
      fetch('https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=hu&q=' +
        encodeURIComponent(q), { signal: acAbort.signal, headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.ok ? r.json() : []; })
        .then(render)
        .catch(function () { /* aborted or offline — the typed value still stands */ });
    };

    addr.addEventListener('input', function () {
      var q = addr.value.trim();
      clearTimeout(acTimer);
      if (q.length < 3) { closeAc(); return; }
      // debounced so we stay well inside Nominatim's 1 request/second policy
      acTimer = setTimeout(function () { search(q); }, 350);
    });

    addr.addEventListener('keydown', function (e) {
      if (acList.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); highlight(acIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(acIndex - 1); }
      else if (e.key === 'Enter' && acIndex > -1) {
        e.preventDefault();
        addr.value = acItems[acIndex].display_name;
        closeAc();
      } else if (e.key === 'Escape') { closeAc(); }
    });

    addr.addEventListener('blur', function () { setTimeout(closeAc, 120); });
  }

  /* ---------- surface checkboxes unlock their own area input ---------- */
  var surfaceBoxes = document.querySelectorAll('.surface-main input[type="checkbox"]');

  /* "at least one of the group" can't be expressed with the required attribute
     — required on a checkbox only demands that one box — so mirror the rule
     onto the first box as a custom constraint and let native validation report it */
  var syncSurfaceValidity = function () {
    if (!surfaceBoxes.length) return;
    var any = Array.prototype.some.call(surfaceBoxes, function (b) { return b.checked; });
    surfaceBoxes[0].setCustomValidity(any ? '' : 'Please tick at least one available surface.');
  };

  surfaceBoxes.forEach(function (box) {
    var area = document.getElementById(box.dataset.area);
    box.addEventListener('change', function () {
      if (area) {
        area.disabled = !box.checked;
        if (!box.checked) area.value = '';
        else area.focus();
      }
      syncSurfaceValidity();
    });
  });

  syncSurfaceValidity();

  /* ---------- consumption data upload ---------- */
  var drop = document.getElementById('drop');
  var input = document.getElementById('dataFiles');
  var fileList = document.getElementById('fileList');
  var fileHelp = document.getElementById('fileHelp');
  var OK_EXT = ['.csv', '.xlsx', '.xls'];

  if (drop && input && fileList) {
    var sizeOf = function (bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
      return (bytes / 1048576).toFixed(1) + ' MB';
    };

    var accepted = function (name) {
      return OK_EXT.some(function (ext) { return name.toLowerCase().endsWith(ext); });
    };

    var renderFiles = function (rejected) {
      fileList.innerHTML = '';
      Array.prototype.forEach.call(input.files, function (f) {
        var li = document.createElement('li');
        li.className = 'file-row';
        var name = document.createElement('span');
        name.className = 'file-name';
        name.textContent = f.name;
        var size = document.createElement('span');
        size.className = 'file-size';
        size.textContent = sizeOf(f.size);
        li.appendChild(name);
        li.appendChild(size);
        fileList.appendChild(li);
      });

      if (input.files.length) {
        var clear = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'file-clear';
        btn.textContent = 'Clear all';
        btn.addEventListener('click', function () {
          input.value = '';
          renderFiles(0);
        });
        clear.appendChild(btn);
        fileList.appendChild(clear);
      }

      if (fileHelp) {
        if (rejected) {
          fileHelp.textContent = rejected + (rejected === 1 ? ' file was' : ' files were') +
            ' skipped — only .csv, .xlsx and .xls are accepted.';
          fileHelp.hidden = false;
        } else {
          fileHelp.hidden = true;
        }
      }
    };

    // rebuild the FileList through a DataTransfer so dropped files land on the
    // input itself and travel with the form like browsed ones do
    var setFiles = function (files) {
      var dt = new DataTransfer();
      var rejected = 0;
      Array.prototype.forEach.call(files, function (f) {
        if (accepted(f.name)) dt.items.add(f);
        else rejected++;
      });
      input.files = dt.files;
      renderFiles(rejected);
    };

    input.addEventListener('change', function () { setFiles(input.files); });

    ['dragenter', 'dragover'].forEach(function (evt) {
      drop.addEventListener(evt, function (e) {
        e.preventDefault();
        drop.classList.add('is-over');
      });
    });

    ['dragleave', 'drop'].forEach(function (evt) {
      drop.addEventListener(evt, function (e) {
        e.preventDefault();
        if (evt === 'dragleave' && drop.contains(e.relatedTarget)) return;
        drop.classList.remove('is-over');
      });
    });

    drop.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) setFiles(e.dataTransfer.files);
    });
  }

  /* ---------- submit ----------
     The form has no novalidate attribute, so this only fires once every
     required field passes — which makes the redirect a way to exercise the
     mandatory-field behaviour end to end.
     TODO: replace the redirect with the real send (multipart/form-data to an
     endpoint or form service — files mean a mailto: link can't carry them),
     and only go to sent.html once that resolves. */
  var form = document.getElementById('offerForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      window.location.href = 'sent.html';
    });
  }

})();
