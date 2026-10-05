'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require(process.env.ALBION_DOM_MODULE||'jsdom');
function boot(saved){
 const dom=new JSDOM(fs.readFileSync('dist/index.html','utf8'),{url:'https://merchant.test',runScripts:'outside-only'});
 const w=dom.window,errors=[];w.addEventListener('error',e=>errors.push(e.error));
 w.AbortController=AbortController;
 if(saved)w.localStorage.setItem('bilyrush-merchant-v04',JSON.stringify(saved));
 for(const f of ['market.js','app.js','routes-data.js','routes.js','economy.js','economy-ui.js'])w.eval(fs.readFileSync('dist/'+f,'utf8'));
 const $=id=>w.document.getElementById(id);
 const submit=id=>$(id).dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 const change=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('change',{bubbles:true}));};
 const stored=()=>JSON.parse(w.localStorage.getItem('bilyrush-merchant-v04'));
 return {dom,w,$,errors,submit,change,stored};
}
function prices(w){return w.Market.CITIES.flatMap(city=>['T4_HIDE','T3_LEATHER','T4_LEATHER'].map(item_id=>({city,item_id,quality:1,sell_price_min:item_id==='T4_HIDE'?110:200,buy_price_max:item_id==='T4_LEATHER'?350:100,sell_price_min_date:new Date().toISOString(),buy_price_max_date:new Date().toISOString()})));}
async function scan(c){c.$('opScan').click();await new Promise(r=>setTimeout(r,20));}
test('all five tabs initialize, inventory and settings persist and restore',()=>{
 const c=boot();try{
  assert.deepEqual(c.errors,[]);assert.equal(c.w.document.querySelectorAll('[data-tab]').length,5);
  for(const tab of c.w.document.querySelectorAll('[data-tab]')){tab.click();assert.equal(c.w.document.querySelectorAll('.panel:not([hidden])').length,1);assert.equal(c.$('panel-'+tab.dataset.tab).hidden,false);}
  c.$('inv-T4_HIDE').value='48';c.$('saveInventory').click();assert.equal(c.stored().inventory.Martlock.T4_HIDE,48);
  c.$('setting-tax').value='4';c.$('profileConfirmed').checked=true;c.submit('settingsForm');assert.equal(c.stored().settings.tax,4);
  const d=boot(c.stored());try{assert.equal(d.$('inv-T4_HIDE').value,'48');assert.equal(d.$('setting-tax').value,'4');assert.deepEqual(d.errors,[]);}finally{d.dom.window.close();}
 }finally{c.dom.window.close();}
});
test('operation fetch, manual depth, journal and failure cannot leave a stale recommendation',async()=>{
 const c=boot();try{
  c.w.fetch=async()=>({ok:true,json:async()=>prices(c.w)});await scan(c);
  assert.equal(c.$('opScan').disabled,false);assert.match(c.$('opSummary').textContent,/Falta impuesto/);assert.equal(c.$('rankedResults').querySelectorAll('tbody tr').length,10);
  assert.equal(c.$('journalPrediction').disabled,false);c.$('journalPrediction').click();assert.equal(c.stored().journal.length,1);
  c.$('overrideCity').value='Martlock';c.$('overrideItem').value='T4_HIDE';c.$('overrideDepth').value='10 @ 104';c.submit('overrideForm');assert.equal(c.stored().overrides[0].levels[0].quantity,10);
  assert.match(c.$('rankedResults').textContent,/insuficiente|impuesto/);
  c.change('opQty','1');assert.equal(c.$('journalPrediction').disabled,true);assert.match(c.$('opSummary').textContent,/Corrige/);
  c.change('opQty','420');c.w.fetch=async()=>{throw new Error('offline');};await scan(c);
  assert.match(c.$('opSummary').textContent,/Consulta no disponible/);assert.equal(c.$('journalPrediction').disabled,true);assert.equal(c.$('rankedResults').textContent,'');assert.deepEqual(c.errors,[]);
 }finally{c.dom.window.close();}
});
test('unknown actual journal inputs stay pending and routes keep a missing cargo quote',()=>{
 const c=boot();try{
  c.submit('journalForm');assert.equal(c.stored().journal[0].profit,null);assert.match(c.$('journalList').textContent,/Pendiente/);
  c.change('routeMode','planner');assert.equal(c.$('routeCost').value,'');c.submit('routeForm');assert.equal(c.stored().routes['in:Bridgewatch'].cost,null);
  assert.deepEqual(c.errors,[]);
 }finally{c.dom.window.close();}
});
