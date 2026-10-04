'use strict';
const $ = id => document.getElementById(id);
const fmt = n => Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
let scanResult = null;
function syncEnchant() {
  const max = Market.maxEnchant($('resource').value, Number($('tier').value));
  for (const option of $('ench').options) option.disabled = Number(option.value) > max;
  if (Number($('ench').value) > max) $('ench').value = '0';
}
function clearResults() {
  scanResult = null;
  $('best').classList.remove('show');
  $('rows').replaceChildren();
  $('status').textContent = 'Selección actualizada. Pulsa Escanear para consultar.';
}
function addCell(tr, text) { const td = document.createElement('td'); td.textContent = text; tr.append(td); return td; }
function quoteCell(tr, q) {
  const td = addCell(tr, fmt(q.price));
  const detail = document.createElement('small');
  detail.textContent = q.price === null ? 'SIN DATA' : q.age.text + ' · ' + q.label;
  detail.className = q.price === null ? 'nodata' : q.fresh ? 'fresh' : 'stale';
  if (q.age.iso) detail.title = q.age.iso;
  td.append(detail);
}
function render() {
  if (!scanResult) return;
  const { data, id, qty } = scanResult;
  const rows = Market.normalize(data, id, qty, Number($('freshness').value));
  $('rows').replaceChildren();
  for (const row of Market.sorted(rows, $('sort').value)) {
    const tr = document.createElement('tr');
    addCell(tr, row.city);
    quoteCell(tr, row.buyNow);
    quoteCell(tr, row.sellNow);
    addCell(tr, fmt(row.total));
    $('rows').append(tr);
  }
  const best = Market.bestBuy(rows);
  $('best').classList.add('show');
  $('bestheading').textContent = best ? 'MENOR BUY NOW CON DATO RECIENTE' : 'SIN PRECIO RECIENTE PARA COMPRAR';
  $('bestline').textContent = best ? best.city + ' · ' + fmt(best.buyNow.price) + ' silver/u' : 'Verifica el mercado antes de viajar';
  $('bestsub').textContent = best ? `${qty.toLocaleString('en-US')} unidades → ${fmt(best.total)} silver estimados. Dato de hace ${best.buyNow.age.text}. Disponibilidad del lote no confirmada.` : 'Las cotizaciones antiguas siguen visibles como referencia. No hay una recomendación de compra.';
  const count = rows.filter(x => x.buyNow.price !== null || x.sellNow.price !== null).length;
  $('status').textContent = `${id} · ${qty.toLocaleString('en-US')} unidades · ${count}/6 ciudades con datos. Consultado ${new Date(scanResult.fetchedAt).toLocaleTimeString()}.`;
}
async function scan() {
  let id, qty;
  try { id = Market.itemId($('resource').value, $('tier').value, $('ench').value); qty = Market.quantity($('qty').value); }
  catch (error) { clearResults(); $('status').textContent = error.message; return; }
  clearResults();
  const controls = ['scan','resource','tier','ench','qty'];
  controls.forEach(id => $(id).disabled = true);
  $('status').textContent = 'Consultando los seis mercados…';
  $('status').setAttribute('aria-busy','true');
  try {
    const data = await Market.fetchPrices(id);
    scanResult = { data, id, qty, fetchedAt: Date.now() };
    render();
  } catch (error) {
    const tr = document.createElement('tr');
    const td = addCell(tr, 'Sin resultados: no se pudo completar la consulta.');
    td.colSpan = 4;
    $('rows').replaceChildren(tr);
    $('status').textContent = error.message + ' Pulsa Escanear para reintentar.';
  } finally {
    controls.forEach(id => $(id).disabled = false);
    $('status').setAttribute('aria-busy','false');
  }
}
$('scan').addEventListener('click', scan);
for (const id of ['resource','tier','ench','qty']) $(id).addEventListener('change', () => { syncEnchant(); clearResults(); });
for (const id of ['sort','freshness']) $(id).addEventListener('change', render);
// Keep freshness honest even when the page stays open for hours.
setInterval(render, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
syncEnchant();
