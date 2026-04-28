'use strict';

function toPence(pounds) {
  if (pounds == null) return 0;
  return Math.round(parseFloat(pounds) * 100);
}

function formatGBP(pence) {
  if (pence == null) return '£0.00';
  const amount = pence / 100;
  return '£' + amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatGBPDecimal(pence) {
  if (pence == null) return '0.00';
  return (pence / 100).toFixed(2);
}

module.exports = { toPence, formatGBP, formatGBPDecimal };
