(function (root) {
  'use strict';
  const CITIES = ['Bridgewatch', 'Martlock', 'Lymhurst', 'Fort Sterling', 'Thetford', 'Caerleon'];
  const RESOURCES = ['HIDE','LEATHER','ORE','METALBAR','WOOD','PLANKS','FIBER','CLOTH','ROCK','STONEBLOCK'];
  const API = 'https://west.albion-online-data.com/api/v2/stats/prices/';
  function maxEnchant(resource, tier) { return tier < 4 || resource === 'STONEBLOCK' ? 0 : resource === 'ROCK' ? 3 : 4; }
  function itemId(resource, tier, enchant) {
    tier = Number(tier); enchant = Number(enchant);
    if (!RESOURCES.includes(resource) || !Number.isInteger(tier) || tier < 2 || tier > 8 || !Number.isInteger(enchant) || enchant < 0 || enchant > maxEnchant(resource, tier)) throw new Error('Combinación de recurso, tier y encantamiento no válida.');
    return `T${tier}_${resource}${enchant ? `_LEVEL${enchant}@${enchant}` : ''}`;
  }
  function quantity(value) {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 1 || n > 1000000000) throw new Error('La cantidad debe ser un entero entre 1 y 1,000,000,000.');
    return n;
  }
  function parseDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(s) || s.startsWith('0001-')) return null;
    const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(s) ? s : s + 'Z');
    return Number.isFinite(date.getTime()) ? date : null;
  }
  function age(s, now = Date.now()) {
    const date = parseDate(s);
    if (!date) return { minutes: Infinity, text: 'Sin fecha válida', iso: null };
    if (date.getTime() > now + 60000) return { minutes: Infinity, text: 'Fecha futura: verificar', iso: date.toISOString() };
    const minutes = Math.max(0, (now - date.getTime()) / 60000);
    return { minutes, iso: date.toISOString(), text: minutes < 1 ? '<1 min' : minutes < 60 ? `${Math.floor(minutes)} min` : minutes < 1440 ? `${(minutes/60).toFixed(1)} h` : `${(minutes/1440).toFixed(1)} d` };
  }
  function price(value) { const n = Number(value); return Number.isFinite(n) && n > 0 ? n : null; }
  function quote(value, date, now, threshold) {
    const p = price(value), a = age(date, now);
    return { price: p, age: a, fresh: p !== null && a.minutes <= threshold, label: p === null ? 'SIN DATA' : a.minutes <= threshold ? 'FRESCO' : 'VERIFICAR' };
  }
  function normalize(data, id, qty, threshold = 60, now = Date.now()) {
    if (!Array.isArray(data)) throw new Error('AODP devolvió un formato inesperado.');
    quantity(qty);
    // Restrict to the requested item and normal quality; never let another row overwrite it.
    const relevant = data.filter(x => x && x.item_id === id && Number(x.quality) === 1 && CITIES.includes(x.city));
    return CITIES.map(city => {
      const cityRows = relevant.filter(x => x.city === city);
      function latest(value, date) {
        return cityRows.map(x => quote(x[value], x[date], now, threshold))
          .filter(x => x.price !== null).sort((a,b) => a.age.minutes - b.age.minutes)[0] || quote(null,null,now,threshold);
      }
      const buyNow = latest('sell_price_min','sell_price_min_date');
      const sellNow = latest('buy_price_max','buy_price_max_date');
      return { city, buyNow, sellNow, total: buyNow.price === null ? null : buyNow.price * qty };
    });
  }
  function sorted(rows, mode = 'buy') {
    const key = mode === 'sell' ? 'sellNow' : 'buyNow';
    return [...rows].sort((a,b) => {
      const x = a[key], y = b[key];
      if (x.price === null || y.price === null) return x.price === y.price ? 0 : x.price === null ? 1 : -1;
      if (mode === 'age') return x.age.minutes - y.age.minutes || x.price - y.price;
      return mode === 'sell' ? y.price - x.price : x.price - y.price;
    });
  }
  function bestBuy(rows) { return sorted(rows).find(x => x.buyNow.fresh) || null; }
  function buildUrl(id) { return API + encodeURIComponent(id) + '.json?locations=' + encodeURIComponent(CITIES.join(',')) + '&qualities=1'; }
  async function fetchPrices(id, fetcher = globalThis.fetch, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(buildUrl(id), { signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 429 ? 'AODP limita las consultas. Espera un minuto y reintenta.' : `AODP respondió HTTP ${response.status}.`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('AODP devolvió un formato inesperado.');
      return data;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('AODP tardó demasiado. Reintenta en unos segundos.');
      if (error instanceof TypeError) throw new Error('No se pudo conectar con AODP. Revisa tu conexión y reintenta.');
      if (error instanceof SyntaxError) throw new Error('AODP devolvió una respuesta que no se puede leer.');
      throw error;
    } finally { clearTimeout(timer); }
  }
  const model = { CITIES, RESOURCES, maxEnchant, itemId, quantity, parseDate, age, price, normalize, sorted, bestBuy, buildUrl, fetchPrices };
  if (typeof module !== 'undefined' && module.exports) module.exports = model;
  else root.Market = model;
})(typeof globalThis !== 'undefined' ? globalThis : this);
