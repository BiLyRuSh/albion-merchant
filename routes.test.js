const test=require('node:test'),assert=require('node:assert/strict'),R=require('./dist/routes.js'),E=require('./dist/economy.js');
test('all royal cities have connected terrestrial routes; safe routing excludes red zones',()=>{
 for(const city of ['Bridgewatch','Lymhurst','Thetford','Fort Sterling']){
  const r=R.find('Martlock',city);assert.ok(r);assert.ok(r.hops>0);assert.equal(r.risk,'lower');
  for(let i=1;i<r.path.length;i++){assert.ok(r.path[i-1].links.includes(r.path[i].id));assert.notEqual(r.path[i].zone,'red');}
 }
 assert.equal(R.find('Martlock','Caerleon'),null);assert.equal(R.find('Martlock','Caerleon',true).risk,'risky');
});
test('round trip hops and user calibrated minutes apply only to physical transport',()=>{
 const s=E.defaults();s.settings.minutesPerHop=2;
 const r=E.route(s,'Bridgewatch','in');assert.equal(r.hops,R.find('Martlock','Bridgewatch').hops*2);assert.equal(r.minutes,r.hops*2);
 s.routes['in:Bridgewatch'].minutes=99;assert.equal(E.route(s,'Bridgewatch','in').minutes,99);
 Object.assign(s.routes['in:Bridgewatch'],{mode:'planner',minutes:null,cost:null});assert.equal(E.route(s,'Bridgewatch','in').minutes,null);assert.equal(E.route(s,'Bridgewatch','in').cost,null);
});
test('import rejects negative routes and invalid price depth; new field migrates safely',()=>{
 const s=E.defaults();assert.equal(E.validateState(s).settings.minutesPerHop,null);
 s.routes['in:Bridgewatch'].cost=-1;assert.throws(()=>E.validateState(s));s.routes['in:Bridgewatch'].cost=0;
 s.overrides.push({city:'Martlock',item:'T4_HIDE',kind:'buy',at:new Date().toISOString(),levels:[{price:-1,quantity:100}]});assert.throws(()=>E.validateState(s));
});
