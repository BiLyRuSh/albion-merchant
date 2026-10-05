'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./dist/market.js');
const now = Date.parse('2026-10-04T23:30:00Z');
const row = (city, sell, sellDate, buy = 100, buyDate = sellDate) => ({ item_id:'T4_HIDE',quality:1,city,sell_price_min:sell,sell_price_min_date:sellDate,buy_price_max:buy,buy_price_max_date:buyDate });
test('resource IDs use LEVEL for enchantments; unsupported combinations fail', () => {
  assert.equal(M.itemId('HIDE',4,0),'T4_HIDE');
  assert.equal(M.itemId('HIDE',4,1),'T4_HIDE_LEVEL1@1');
  assert.equal(M.itemId('LEATHER',8,4),'T8_LEATHER_LEVEL4@4');
  for (const args of [['HIDE',3,1],['STONEBLOCK',4,1],['ROCK',8,4],['HIDE',9,0]]) assert.throws(() => M.itemId(...args));
});
test('quantity rejects missing, fractional, nonfinite and nonpositive input', () => {
  assert.equal(M.quantity('420'),420);
  for (const n of ['',0,-1,1.5,Infinity,'abc',1e12]) assert.throws(() => M.quantity(n));
});
test('UTC, explicit offsets, sentinel and future dates are handled', () => {
  assert.equal(M.age('2026-10-04T23:10:00',now).minutes,20);
  assert.equal(M.age('2026-10-04T19:10:00-04:00',now).minutes,20);
  assert.equal(M.age('0001-01-01T00:00:00',now).minutes,Infinity);
  assert.equal(M.age('bad',now).minutes,Infinity);
  assert.equal(M.age('2026-10-05T00:00:00',now).minutes,Infinity);
});
test('six markets, zero is absent, buy and sell have separate freshness', () => {
  const rows=M.normalize([row('Bridgewatch',114,'2026-10-04T23:10:00',109,'2026-10-04T06:00:00'),row('Caerleon',0,'0001-01-01T00:00:00',0)],'T4_HIDE',420,60,now);
  assert.equal(rows.length,6);
  assert.equal(rows[0].total,47880);
  assert.equal(rows[0].buyNow.fresh,true);
  assert.equal(rows[0].sellNow.fresh,false);
  assert.equal(rows.find(x=>x.city==='Caerleon').buyNow.price,null);
  assert.equal(rows.find(x=>x.city==='Martlock').total,null);
});
test('stale bargains cannot become a best-buy recommendation', () => {
  const rows=M.normalize([row('Martlock',1,'2026-10-03T00:00:00'),row('Bridgewatch',114,'2026-10-04T23:10:00')],'T4_HIDE',420,60,now);
  assert.equal(M.sorted(rows)[0].city,'Martlock');
  assert.equal(M.bestBuy(rows).city,'Bridgewatch');
  assert.equal(M.bestBuy(M.normalize([row('Martlock',1,'2026-10-03T00:00:00')],'T4_HIDE',420,60,now)),null);
});
test('sort modes and changing freshness thresholds select correct quotes', () => {
  const rows=M.normalize([row('Martlock',130,'2026-10-04T23:25:00',125),row('Bridgewatch',114,'2026-10-04T23:10:00',109)],'T4_HIDE',420,15,now);
  assert.equal(M.sorted(rows,'sell')[0].city,'Martlock');
  assert.equal(M.sorted(rows,'age')[0].city,'Martlock');
  assert.equal(M.bestBuy(rows).city,'Martlock');
});
test('incorrect item/quality and duplicate older rows cannot overwrite valid data', () => {
  const data=[row('Bridgewatch',114,'2026-10-04T23:10:00'),row('Bridgewatch',1,'2026-10-03T00:00:00'),{...row('Bridgewatch',2,'2026-10-04T23:15:00'),quality:2},{...row('Bridgewatch',3,'2026-10-04T23:15:00'),item_id:'T5_HIDE'}];
  assert.equal(M.normalize(data,'T4_HIDE',420,60,now)[0].buyNow.price,114);
});
test('fetch uses Americas, all six cities and normal quality', async () => {
  const result=await M.fetchPrices('T4_HIDE',async url=>{
    const parsed=new URL(url);
    assert.equal(parsed.host,'west.albion-online-data.com');
    assert.equal(parsed.searchParams.get('qualities'),'1');
    assert.equal(parsed.searchParams.get('locations').split(',').length,6);
    return {ok:true,json:async()=>[]};
  });
  assert.deepEqual(result,[]);
});
test('HTTP, malformed response and connection errors are explicit', async () => {
  await assert.rejects(M.fetchPrices('T4_HIDE',async()=>({ok:false,status:429})),/limita/);
  await assert.rejects(M.fetchPrices('T4_HIDE',async()=>({ok:false,status:503})),/503/);
  await assert.rejects(M.fetchPrices('T4_HIDE',async()=>({ok:true,json:async()=>({error:'bad'})})),/formato/);
  await assert.rejects(M.fetchPrices('T4_HIDE',async()=>{throw new TypeError('Failed to fetch');}),/conectar/);
  await assert.rejects(M.fetchPrices('T4_HIDE',async()=>({ok:true,json:async()=>{throw new SyntaxError('bad JSON');}})),/leer/);
});
test('slow fetch is aborted and reports a retryable timeout', async () => {
  await assert.rejects(M.fetchPrices('T4_HIDE',(_,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(new Error(),{name:'AbortError'})))),10),/tardó demasiado/);
});
