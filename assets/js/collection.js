(function () {
  'use strict';

  var grid = document.querySelector('.collection-grid');
  if (!grid) return;

  var PAGE_SIZE = 8;
  var currentPage = 1;
  var lastFiltered = [];

  // ── HELPERS ───────────────────────────────────────────────────────────────

  function parseNum(str) {
    var m = (str || '').replace(/,/g, '').match(/[\d.]+/);
    return m ? parseFloat(m[0]) : 0;
  }

  function parseRangeMin(str) {
    var m = (str || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function inRange(val, lo, hi) {
    return val >= lo && val <= hi;
  }

  // Parses any price-range option text into {min, max}.
  // Handles: "Under £100", "£100–£500", "£3,000+", "Price: All", etc.
  function parsePriceRange(text) {
    if (!text || text.indexOf('All') !== -1) return null;
    var nums = text.replace(/[£,]/g, '').match(/\d+/g);
    if (!nums || nums.length === 0) return null;
    if (text.toLowerCase().indexOf('under') !== -1) {
      return { min: 0, max: parseInt(nums[0]) - 1 };
    }
    if (text.indexOf('+') !== -1 && nums.length === 1) {
      return { min: parseInt(nums[0]), max: Infinity };
    }
    if (nums.length >= 2) {
      return { min: parseInt(nums[0]), max: parseInt(nums[nums.length - 1]) };
    }
    return null;
  }

  // ── READ CARD DATA FROM DOM ───────────────────────────────────────────────
  // Spec tiles order: [0]=Speed, [1]=Motor, [2]=Range (where present)

  var allCards = Array.from(grid.querySelectorAll('.fp-card')).map(function (el, i) {
    var priceEl  = el.querySelector('.fp-card__price');
    var specVals = el.querySelectorAll('.fp-card__spec-val');
    var catEl    = el.querySelector('.fp-card__category');
    var cat      = catEl ? catEl.textContent.trim() : '';
    return {
      el:    el,
      orig:  i,
      price: parseNum(priceEl ? priceEl.textContent : '0'),
      speed: parseNum(specVals[0] ? specVals[0].textContent : ''),
      motor: parseNum(specVals[1] ? specVals[1].textContent : ''),
      range: parseRangeMin(specVals[2] ? specVals[2].textContent : ''),
      cat:   cat,
      catLo: cat.toLowerCase()
    };
  });

  var selects = Array.from(document.querySelectorAll('.filter-select'));
  var countEl = document.querySelector('.collection-filters__count');
  var pagEl   = document.querySelector('.pagination');

  function getVal(ariaContains) {
    for (var i = 0; i < selects.length; i++) {
      if ((selects[i].getAttribute('aria-label') || '').toLowerCase().indexOf(ariaContains) !== -1) {
        return selects[i].value;
      }
    }
    return '';
  }

  // ── FILTER + SORT ─────────────────────────────────────────────────────────

  function applyAll() {
    var sortV     = getVal('sort');
    var priceV    = getVal('price');
    var motorV    = getVal('motor');
    var speedV    = getVal('speed');
    var rangeV    = getVal('range');
    var typeV     = getVal('type');      // all-products.html: E-Bikes / E-Scooters / Parts
    var categoryV = getVal('category'); // parts-accessories.html: Safety / Lighting / etc.

    var priceRange = parsePriceRange(priceV);

    var filtered = allCards.filter(function (c) {

      // ── Price (works for any page's price ranges) ─────────────────────────
      if (priceRange && !inRange(c.price, priceRange.min, priceRange.max)) return false;

      // ── Type (all-products.html) ──────────────────────────────────────────
      if (typeV && typeV.indexOf('All') === -1) {
        var tv = typeV.toLowerCase();
        if (tv.indexOf('bike') !== -1      && c.catLo.indexOf('bike') === -1)    return false;
        if (tv.indexOf('scooter') !== -1   && c.catLo.indexOf('scooter') === -1) return false;
        if ((tv.indexOf('part') !== -1 || tv.indexOf('accessor') !== -1) &&
            (c.catLo.indexOf('bike') !== -1 || c.catLo.indexOf('scooter') !== -1)) return false;
      }

      // ── Category (parts-accessories.html) ────────────────────────────────
      if (categoryV && categoryV.indexOf('All') === -1) {
        var cv = categoryV.toLowerCase();
        var cat = c.catLo;
        var match = false;
        if      (cv.indexOf('safety') !== -1 || cv.indexOf('helmet') !== -1)       match = cat.indexOf('safety') !== -1 || cat.indexOf('helmet') !== -1;
        else if (cv.indexOf('light') !== -1)                                        match = cat.indexOf('light') !== -1;
        else if (cv.indexOf('batter') !== -1 || cv.indexOf('charg') !== -1)         match = cat.indexOf('batter') !== -1 || cat.indexOf('charg') !== -1;
        else if (cv.indexOf('secur') !== -1)                                        match = cat.indexOf('secur') !== -1 || cat.indexOf('lock') !== -1;
        else if (cv.indexOf('bag') !== -1 || cv.indexOf('storage') !== -1)          match = cat.indexOf('bag') !== -1 || cat.indexOf('storage') !== -1;
        else if (cv.indexOf('maintenance') !== -1)                                  match = cat.indexOf('maintenance') !== -1 || cat.indexOf('tool') !== -1;
        else match = true;
        if (!match) return false;
      }

      // ── Motor ─────────────────────────────────────────────────────────────
      if (motorV && motorV.indexOf('All') === -1) {
        var m = c.motor;
        if      (motorV.indexOf('150') !== -1                                  && !inRange(m, 0, 150))   return false;
        else if (motorV.indexOf('200') !== -1 && motorV.indexOf('300') !== -1 && !inRange(m, 200, 300)) return false;
        else if (motorV.indexOf('350') !== -1                                  && !inRange(m, 350, 400)) return false;
        else if (motorV.indexOf('500') !== -1                                  && !inRange(m, 400, 500)) return false;
        else if (motorV.indexOf('600') !== -1                                  && !inRange(m, 600, 900)) return false;
        else if (motorV.indexOf('900+') !== -1                                 && m < 900)               return false;
        else if (motorV.indexOf('1000+') !== -1                                && m < 1000)              return false;
      }

      // ── Speed (km/h: "Up to 25 km/h", "26–35 km/h", "36–50 km/h", "50+") ─
      if (speedV && speedV.indexOf('All') === -1) {
        var s = c.speed;
        if      (speedV.indexOf('Up') !== -1 && speedV.indexOf('25') !== -1 && s > 25)      return false;
        else if (speedV.indexOf('26') !== -1                                 && !inRange(s, 26, 35)) return false;
        else if (speedV.indexOf('36') !== -1                                 && !inRange(s, 36, 50)) return false;
        else if (speedV.indexOf('50+') !== -1                                && s <= 50)     return false;
      }

      // ── Range (km: "Up to 50 km", "50–70 km", "70+ km") ──────────────────
      if (rangeV && rangeV.indexOf('All') === -1) {
        var r = c.range;
        if      (rangeV.indexOf('Up') !== -1                                           && r > 50)             return false;
        else if (rangeV.indexOf('50') !== -1 && rangeV.indexOf('70') !== -1          && !inRange(r, 50, 70)) return false;
        else if (rangeV.indexOf('70+') !== -1                                          && r <= 70)            return false;
      }

      return true;
    });

    // Sort
    if (sortV.indexOf('Low to High') !== -1) {
      filtered.sort(function (a, b) { return a.price - b.price; });
    } else if (sortV.indexOf('High to Low') !== -1) {
      filtered.sort(function (a, b) { return b.price - a.price; });
    } else {
      filtered.sort(function (a, b) { return a.orig - b.orig; });
    }

    currentPage = 1;
    lastFiltered = filtered;
    renderPage(filtered);
  }

  // ── RENDER PAGE ───────────────────────────────────────────────────────────

  function renderPage(filtered) {
    var total      = filtered.length;
    var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    var start = (currentPage - 1) * PAGE_SIZE;
    var end   = start + PAGE_SIZE;

    // Hide all, re-append filtered in sorted order, show current page slice
    allCards.forEach(function (c) { c.el.style.display = 'none'; });
    filtered.forEach(function (c) { grid.appendChild(c.el); });
    filtered.slice(start, end).forEach(function (c) { c.el.style.display = ''; });

    if (countEl) {
      var showing = Math.min(end, total) - start;
      countEl.textContent = 'Showing ' + showing + ' of ' + total + ' products';
    }

    renderPagination(totalPages);
  }

  // ── RENDER PAGINATION ─────────────────────────────────────────────────────

  function renderPagination(totalPages) {
    if (!pagEl) return;

    if (totalPages <= 1) {
      pagEl.style.visibility = 'hidden';
      return;
    }
    pagEl.style.visibility = '';
    pagEl.innerHTML = '';

    function addBtn(label, targetPage, isNav) {
      var btn = document.createElement('button');
      var isActive   = !isNav && targetPage === currentPage;
      var isDisabled = isNav && (
        (label === '←' && currentPage === 1) ||
        (label === '→' && currentPage === totalPages)
      );
      btn.className = 'page-btn' +
        (isNav    ? ' page-btn--nav'    : '') +
        (isActive ? ' page-btn--active' : '');
      btn.textContent = label;
      btn.disabled = isDisabled;
      if (isActive) btn.setAttribute('aria-current', 'page');
      if (!isDisabled) {
        btn.addEventListener('click', function () {
          currentPage = targetPage;
          renderPage(lastFiltered);
          var anchor = document.querySelector('.collection-filters');
          if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
      pagEl.appendChild(btn);
    }

    addBtn('←', currentPage - 1, true);
    for (var i = 1; i <= totalPages; i++) addBtn(String(i), i, false);
    addBtn('→', currentPage + 1, true);
  }

  // ── WIRE SELECTS + INIT ───────────────────────────────────────────────────

  selects.forEach(function (sel) { sel.addEventListener('change', applyAll); });
  applyAll();
})();
