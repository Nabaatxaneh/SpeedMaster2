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
    // "45-85 km" → 45
    var m = (str || '').match(/(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function inRange(val, lo, hi) {
    return val >= lo && val <= hi;
  }

  // ── READ CARD DATA FROM DOM ───────────────────────────────────────────────
  // Spec tiles order inside each .fp-card: [0]=Speed, [1]=Motor, [2]=Range

  var allCards = Array.from(grid.querySelectorAll('.fp-card')).map(function (el, i) {
    var priceEl  = el.querySelector('.fp-card__price');
    var specVals = el.querySelectorAll('.fp-card__spec-val');
    return {
      el:    el,
      orig:  i,
      price: parseNum(priceEl ? priceEl.textContent : '0'),
      speed: parseNum(specVals[0] ? specVals[0].textContent : ''),
      motor: parseNum(specVals[1] ? specVals[1].textContent : ''),
      range: parseRangeMin(specVals[2] ? specVals[2].textContent : '')
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
    var sortV  = getVal('sort');
    var priceV = getVal('price');
    var motorV = getVal('motor');
    var speedV = getVal('speed');
    var rangeV = getVal('range');

    var filtered = allCards.filter(function (c) {

      // Price filter (e-scooters page only)
      if (priceV && priceV.indexOf('All') === -1) {
        var p = c.price;
        if      (priceV.indexOf('Under') !== -1 && priceV.indexOf('750') !== -1 && p >= 750)                     return false;
        else if (priceV.indexOf('750') !== -1 && priceV.indexOf('1,000') !== -1 && !inRange(p, 750, 1000))      return false;
        else if (priceV.indexOf('1,000') !== -1 && priceV.indexOf('1,500') !== -1 && !inRange(p, 1000, 1500))  return false;
        else if (priceV.indexOf('1,500+') !== -1 && p < 1500)                                                    return false;
      }

      // Motor filter
      if (motorV && motorV.indexOf('All') === -1) {
        var m = c.motor;
        if      (motorV.indexOf('150') !== -1                                          && !inRange(m, 0, 150))   return false;
        else if (motorV.indexOf('200') !== -1 && motorV.indexOf('300') !== -1         && !inRange(m, 200, 300)) return false;
        else if (motorV.indexOf('350') !== -1                                          && !inRange(m, 350, 400)) return false;
        else if (motorV.indexOf('500') !== -1                                          && !inRange(m, 400, 500)) return false;
        else if (motorV.indexOf('600') !== -1                                          && !inRange(m, 600, 900)) return false;
        else if (motorV.indexOf('900+') !== -1                                         && m < 900)               return false;
        else if (motorV.indexOf('1000+') !== -1                                        && m < 1000)              return false;
      }

      // Speed filter — options use km/h: "Up to 25 km/h", "26–35 km/h", "36–50 km/h", "50+ km/h"
      if (speedV && speedV.indexOf('All') === -1) {
        var s = c.speed;
        if      (speedV.indexOf('Up') !== -1  && speedV.indexOf('25') !== -1 && s > 25)      return false;
        else if (speedV.indexOf('26') !== -1                                  && !inRange(s, 26, 35)) return false;
        else if (speedV.indexOf('36') !== -1                                  && !inRange(s, 36, 50)) return false;
        else if (speedV.indexOf('50+') !== -1                                 && s <= 50)     return false;
      }

      // Range filter — options use km: "Up to 50 km", "50–70 km", "70+ km"
      if (rangeV && rangeV.indexOf('All') === -1) {
        var r = c.range;
        if      (rangeV.indexOf('Up') !== -1                                             && r > 50)               return false;
        else if (rangeV.indexOf('50') !== -1 && rangeV.indexOf('70') !== -1            && !inRange(r, 50, 70))   return false;
        else if (rangeV.indexOf('70+') !== -1                                            && r <= 70)              return false;
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

    // Hide all cards, re-append filtered ones in sorted order, then show page slice
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

  selects.forEach(function (sel) {
    sel.addEventListener('change', applyAll);
  });

  applyAll();
})();
