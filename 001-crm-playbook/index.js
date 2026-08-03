  (function () {
    var ANIM_MS = 220;

    function setupDetail(detail) {
      var summary = detail.querySelector(':scope > summary');
      var body = detail.querySelector(':scope > .detail-body');
      if (!summary || !body) return null;
      var animation = null;
      var token = 0;

      function animateTo(open) {
        var my = ++token;
        if (animation) animation.cancel();
        var startHeight = detail.offsetHeight;
        if (open) detail.open = true;
        var endHeight = open ? summary.offsetHeight + body.offsetHeight : summary.offsetHeight;
        animation = detail.animate(
          { height: [startHeight + 'px', endHeight + 'px'] },
          { duration: ANIM_MS, easing: 'ease' }
        );

        function settle() {
          if (my !== token) return;
          detail.open = open;
          detail.style.height = '';
          animation = null;
        }
        animation.onfinish = settle;
        // Fallback in case the animation's finish event never fires (e.g. a backgrounded tab).
        setTimeout(settle, ANIM_MS + 50);
      }

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        animateTo(!detail.open);
      });

      return {
        open: function () { if (!detail.open) animateTo(true); },
        close: function () { if (detail.open) animateTo(false); }
      };
    }

    document.querySelectorAll('.tab-panel').forEach(function (panel) {
      var details = Array.from(panel.querySelectorAll(':scope > details.stage-detail'));
      if (!details.length) return;
      var controllers = details.map(setupDetail).filter(Boolean);

      if (details.length > 1) {
        var toolbar = document.createElement('div');
        toolbar.className = 'accordion-toolbar';

        var expandBtn = document.createElement('button');
        expandBtn.type = 'button';
        expandBtn.className = 'accordion-toolbar-btn';
        expandBtn.textContent = 'Expand All';
        expandBtn.addEventListener('click', function () {
          controllers.forEach(function (c) { c.open(); });
        });

        var collapseBtn = document.createElement('button');
        collapseBtn.type = 'button';
        collapseBtn.className = 'accordion-toolbar-btn';
        collapseBtn.textContent = 'Collapse All';
        collapseBtn.addEventListener('click', function () {
          controllers.forEach(function (c) { c.close(); });
        });

        toolbar.appendChild(expandBtn);
        toolbar.appendChild(collapseBtn);
        var groupLabel = panel.querySelector(':scope > .group-label');
        var anchor = groupLabel || details[0];
        anchor.parentNode.insertBefore(toolbar, anchor.nextSibling);
      }
    });
  })();

  (function () {
    var wrap = document.getElementById('diagramZoomWrap');
    var svg = wrap && wrap.querySelector('svg');
    var label = document.getElementById('zoomLabel');
    if (!wrap || !svg || !label) return;

    // 100% is the map's native size. The earlier one-row layout was ~6512 units wide and
    // had to be down-scaled to be usable; the serpentine layout is ~1970 wide, so native
    // is the right default — 13px box labels render at 13px.
    var nativeWidth = svg.viewBox.baseVal.width || parseFloat(svg.getAttribute('width'));
    var nativeHeight = svg.viewBox.baseVal.height || parseFloat(svg.getAttribute('height'));
    var BASE_SCALE = 1;
    var baseWidth = nativeWidth * BASE_SCALE;
    var MIN_ZOOM = 20;
    var MAX_ZOOM = 200;
    var STEP = 20;
    // Opens (and Resets) at 60% rather than native. Native is more detail than the embedded
    // card's width can show without panning; 60% is the level this map is actually read at
    // in place, with Open ↗ / Fit there when you want the whole thing.
    var DEFAULT_ZOOM = 60;
    var zoom = DEFAULT_ZOOM;

    function applyZoom() {
      svg.style.width = (baseWidth * zoom / 100) + 'px';
      svg.style.height = (nativeHeight * BASE_SCALE * zoom / 100) + 'px';
      label.textContent = Math.round(zoom) + '%';
    }

    function setZoom(next, anchorRatio) {
      // Keep whatever was centred in view centred across a zoom change, so zooming
      // doesn't throw the reader back to the far left of a very wide diagram.
      var ratio = typeof anchorRatio === 'number'
        ? anchorRatio
        : (wrap.scrollWidth > wrap.clientWidth
            ? (wrap.scrollLeft + wrap.clientWidth / 2) / wrap.scrollWidth
            : 0.5);
      zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
      applyZoom();
      wrap.scrollLeft = ratio * wrap.scrollWidth - wrap.clientWidth / 2;
    }

    // "Fit" = whole map visible at once. Constrained by height as well as width now that
    // the map is banded rather than a single wide ribbon — fitting width alone would still
    // leave the lower bands below the fold.
    function fitZoom() {
      var availW = wrap.clientWidth - 8;
      var availH = wrap.clientHeight - 8;
      if (availW <= 0) return;
      var byW = (availW / baseWidth) * 100;
      var byH = availH > 0 ? (availH / (nativeHeight * BASE_SCALE)) * 100 : byW;
      setZoom(Math.min(byW, byH), 0.5);
      wrap.scrollLeft = 0;
      wrap.scrollTop = 0;
    }

    document.getElementById('zoomInBtn').addEventListener('click', function () { setZoom(zoom + STEP); });
    document.getElementById('zoomOutBtn').addEventListener('click', function () { setZoom(zoom - STEP); });
    document.getElementById('zoomResetBtn').addEventListener('click', function () {
      setZoom(DEFAULT_ZOOM, 0);
      wrap.scrollLeft = 0;
      wrap.scrollTop = 0;
    });
    var fitBtn = document.getElementById('zoomFitBtn');
    if (fitBtn) fitBtn.addEventListener('click', fitZoom);

    // Drag-to-pan. Pointer events cover mouse/pen/touch in one path; the SVG boxes keep
    // their own click handler because a click only fires when the pointer barely moved.
    var panning = false, startX = 0, startY = 0, startLeft = 0, startTop = 0, moved = 0;
    wrap.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      panning = true;
      moved = 0;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = wrap.scrollLeft;
      startTop = wrap.scrollTop;
      wrap.classList.add('is-panning');
    });
    wrap.addEventListener('pointermove', function (e) {
      if (!panning) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
      wrap.scrollLeft = startLeft - dx;
      wrap.scrollTop = startTop - dy;
      if (moved > 4) e.preventDefault();
    });
    function endPan() {
      if (!panning) return;
      panning = false;
      wrap.classList.remove('is-panning');
    }
    wrap.addEventListener('pointerup', endPan);
    wrap.addEventListener('pointercancel', endPan);
    wrap.addEventListener('pointerleave', endPan);
    // Swallow the click that follows a real drag so panning never opens a box popover.
    wrap.addEventListener('click', function (e) {
      if (moved > 4) {
        e.stopPropagation();
        e.preventDefault();
        moved = 0;
      }
    }, true);

    applyZoom();
  })();

  (function () {
    var links = document.querySelectorAll('.side-nav-link');
    var panels = Array.from(links).map(function (link) {
      return document.querySelector(link.getAttribute('href'));
    });

    function activate(id) {
      panels.forEach(function (panel) {
        if (panel) panel.classList.toggle('active', '#' + panel.id === id);
      });
      links.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === id);
      });
    }

    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute('href');
      if (!document.querySelector('.tab-panel' + id)) return;
      e.preventDefault();
      activate(id);
      history.replaceState(null, '', id);
      window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    });

    var initial = window.location.hash && document.querySelector(window.location.hash)
      ? window.location.hash
      : links[0].getAttribute('href');
    activate(initial);
  })();

  (function () {
    var RULES = [
      { test: /Flag for Serge/, cls: 'badge-flag', label: 'Flag' },
      { test: /Not yet audited/, cls: 'badge-audit', label: 'Not Audited' },
      { test: /Open question/, cls: 'badge-open', label: 'Open Q' },
      { test: /Confirmed(:|\s+—|\s+from\s)/, cls: 'badge-confirmed', label: 'Confirmed' },
      { test: /Terminating status/, cls: 'badge-audit', label: 'Terminating' }
    ];
    var scopes = document.querySelectorAll('#main-pipeline, #branch-exit');
    scopes.forEach(function (scope) {
      scope.querySelectorAll('details.stage-detail').forEach(function (detail) {
        var body = detail.querySelector('.detail-body');
        var summary = detail.querySelector('summary');
        if (!body || !summary) return;
        var text = body.textContent;
        var matched = RULES.filter(function (r) { return r.test.test(text); });
        if (!matched.length) return;
        var wrap = document.createElement('span');
        wrap.className = 'status-badges';
        matched.forEach(function (r) {
          var b = document.createElement('span');
          b.className = 'badge ' + r.cls;
          b.textContent = r.label;
          wrap.appendChild(b);
        });
        summary.appendChild(wrap);
      });
    });
  })();

  (function () {
  function normKey(s) { return s.replace(/\s+/g, '').toLowerCase(); }
  function titleText(summary) {
    var clone = summary.cloneNode(true);
    var badges = clone.querySelector('.status-badges');
    if (badges) badges.remove();
    return clone.textContent;
  }

  var details = Array.from(document.querySelectorAll('details.stage-detail'));

  var popover = document.createElement('div');
  popover.className = 'box-popover';
  popover.innerHTML = '<button type="button" class="box-popover-close" aria-label="Close">\u00d7</button><div class="box-popover-title"></div><div class="box-popover-body"></div>';
  document.body.appendChild(popover);
  var titleEl = popover.querySelector('.box-popover-title');
  var bodyEl = popover.querySelector('.box-popover-body');
  popover.querySelector('.box-popover-close').addEventListener('click', function () {
    popover.classList.remove('open');
  });

  function showPopover(box, detail) {
    var summary = detail.querySelector('summary');
    var body = detail.querySelector('.detail-body');
    titleEl.textContent = summary ? titleText(summary) : '';
    bodyEl.innerHTML = body ? body.innerHTML : '';
    popover.style.left = '-9999px';
    popover.classList.add('open');
    var rect = box.getBoundingClientRect();
    var pw = popover.offsetWidth || 280;
    var left = rect.right + 14;
    if (left + pw > window.innerWidth - 12) {
      left = rect.left - pw - 14;
    }
    popover.style.top = rect.top + 'px';
    popover.style.left = left + 'px';
  }

  document.querySelectorAll('.diagram-card .stage-box, .diagram-card .branch-box').forEach(function (box) {
    box.style.cursor = 'pointer';
    box.addEventListener('click', function (e) {
      e.stopPropagation();
      var texts = Array.from(box.querySelectorAll('text:not(.box-badge)')).map(function (t) { return t.textContent; }).join(' ');
      var key = normKey(texts);
      var match = details.find(function (d) {
        var s = d.querySelector('summary');
        return s && normKey(titleText(s)) === key;
      });
      if (match) showPopover(box, match);
    });
  });

  document.addEventListener('click', function (e) {
    if (!popover.contains(e.target)) popover.classList.remove('open');
  });
  window.addEventListener('scroll', function () { popover.classList.remove('open'); }, true);
})();

(function () {
  var svgNS = 'http://www.w3.org/2000/svg';
  function drawBadgePills() {
    document.querySelectorAll('.box-badge').forEach(function (t) {
      var existing = t.previousSibling;
      if (existing && existing.tagName === 'rect' && existing.classList && existing.classList.contains('badge-pill')) {
        existing.remove();
      }
      var bbox = t.getBBox();
      var padX = 13, padY = 6;
      var color = t.getAttribute('fill');
      var pill = document.createElementNS(svgNS, 'rect');
      pill.setAttribute('class', 'badge-pill');
      pill.setAttribute('x', bbox.x - padX);
      pill.setAttribute('y', bbox.y - padY);
      pill.setAttribute('width', bbox.width + padX * 2);
      pill.setAttribute('height', bbox.height + padY * 2);
      pill.setAttribute('rx', (bbox.height + padY * 2) / 2);
      pill.setAttribute('fill', color);
      pill.setAttribute('stroke', '#ffffff');
      pill.setAttribute('stroke-width', '1.5');
      t.parentNode.insertBefore(pill, t);
      t.setAttribute('fill', '#ffffff');
    });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(drawBadgePills);
  } else {
    drawBadgePills();
  }
})();