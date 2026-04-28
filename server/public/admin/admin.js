'use strict';

// ── Bulk-select checkboxes ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const selectAll  = document.getElementById('select-all');
  const checkboxes = () => document.querySelectorAll('.row-check');
  const bulkBar    = document.getElementById('bulk-bar');
  const bulkCount  = document.getElementById('bulk-count');

  function updateBulkBar() {
    const checked = document.querySelectorAll('.row-check:checked').length;
    if (bulkBar) {
      bulkBar.classList.toggle('visible', checked > 0);
      if (bulkCount) bulkCount.textContent = checked;
    }
  }

  if (selectAll) {
    selectAll.addEventListener('change', () => {
      checkboxes().forEach(cb => { cb.checked = selectAll.checked; });
      updateBulkBar();
    });
  }

  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('row-check')) {
      if (selectAll) selectAll.indeterminate = true;
      updateBulkBar();
    }
  });

  // ── Character counters ─────────────────────────────────────────────────
  document.querySelectorAll('[data-maxlen]').forEach(el => {
    const max     = parseInt(el.dataset.maxlen, 10);
    const counter = document.getElementById(el.id + '-counter');
    if (!counter) return;
    const update = () => {
      const len = el.value.length;
      counter.textContent = `${len}/${max}`;
      counter.style.color = len > max ? 'var(--color-danger)' : 'var(--color-text-muted)';
    };
    el.addEventListener('input', update);
    update();
  });

  // ── Flash auto-dismiss ────────────────────────────────────────────────
  document.querySelectorAll('.alert[data-autodismiss]').forEach(el => {
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.4s';
      setTimeout(() => el.remove(), 400);
    }, 4000);
  });

  // ── Confirm dangerous actions ─────────────────────────────────────────
  document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', (e) => {
      if (!confirm(el.dataset.confirm)) e.preventDefault();
    });
  });

  // ── Image alt-text inline save ────────────────────────────────────────
  document.querySelectorAll('.alt-save-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id    = btn.dataset.id;
      const input = document.getElementById(`alt-${id}`);
      if (!input) return;

      const res = await fetch(`/admin/media/${id}/alt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `alt_text=${encodeURIComponent(input.value)}`,
      });
      if (res.ok) {
        btn.textContent = 'Saved!';
        setTimeout(() => { btn.textContent = 'Save'; }, 1500);
      }
    });
  });

  // ── Import mapping helper: auto-suggest column → field ────────────────
  document.querySelectorAll('.map-select').forEach(sel => {
    const colName = sel.dataset.col?.toLowerCase().replace(/\s+/g, '_') || '';
    if (!sel.value) {
      const opts = [...sel.options].map(o => o.value);
      const match = opts.find(o => o && colName.includes(o.replace('_pence','').replace('_price','')));
      if (match) sel.value = match;
    }
  });

  // ── Mobile sidebar toggle ─────────────────────────────────────────────
  const menuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.admin-sidebar');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }
});
