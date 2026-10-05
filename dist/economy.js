(function(root){
'use strict';
const M=typeof module!=='undefined'&&module.exports?require('./market.js'):root.Market;
const R=typeof module!=='undefined'&&module.exports?require('./routes.js'):root.Routes;
const ITEMS={T4_HIDE:'Medium Hide · T4',T3_LEATHER:'Thick Leather · T3',T4_LEATHER:'Worked Leather · T4',T3_HIDE:'Thin Hide · T3',T2_LEATHER:'Stiff Leather · T2'};
const IDS=Object.keys(ITEMS);
const num=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
const sum=xs=>xs.some(x=>x===null)?null:xs.reduce((a,b)=>a+b,0);
const diff=(a,b)=>a===null||b===null?null:a-b;
const mul=(a,b)=>a===null||b===null?null:a*b;
function defaults(){
 const routes={};for(const city of M.CITIES)if(city!=='Martlock')for(const leg of ['in','out'])routes[leg+':'+city]={mode:'physical',cost:0,minutes:null,hops:null,risk:'unknown',confirmed:false,at:null};
 return {version:4,settings:{capital:42909,gold:2600,committed:0,reserve:5000,maxPct:10,maxLoss:2000,rrr:36.7,fee:13.5,tax:null,sellSetup:null,buySetup:null,premium:true,feesConfirmed:false,profileConfirmed:false,freshness:60,timeValue:0,craftMinutes:null,minutesPerHop:null,fame:null,allowRisk:false,currentCity:'Martlock'},inventory:Object.fromEntries(M.CITIES.map(c=>[c,Object.fromEntries(IDS.map(id=>[id,c==='Martlock'?({T4_LEATHER:327,T4_HIDE:6,T3_LEATHER:1,T3_HIDE:155,T2_LEATHER:77}[id]):0]))])),training:{adeptLevel:4,adeptFame:3670,adeptNext:6365,expertFame:28528,expertTarget:45000,focus:0},routes,overrides:[],journal:[],mode:'training',quantity:420};
}
function validateState(s){
 if(!s||s.version!==4||!s.settings||!s.inventory||!s.routes||!Array.isArray(s.overrides)||!Array.isArray(s.journal))throw new Error('El archivo no contiene datos V0.4 válidos.');
 const d=defaults(); const result={...d,...s,inventory:{},routes:{},settings:{...d.settings,...s.settings},training:{...d.training,...s.training}};
 for(const c of M.CITIES){result.inventory[c]={...d.inventory[c],...s.inventory[c]};for(const id of IDS){const n=num(result.inventory[c][id]);if(n===null||!Number.isSafeInteger(n)||n<0||n>1e9)throw new Error('Inventario no válido.');}}
 for(const key of Object.keys(d.routes)){
  const r={...d.routes[key],...s.routes[key]};
  if(!['physical','planner'].includes(r.mode)||!['unknown','lower','risky'].includes(r.risk)||typeof r.confirmed!=='boolean')throw new Error('Ruta no válida.');
  for(const k of ['cost','minutes','hops'])if(r[k]!==null&&(typeof r[k]!=='number'||!Number.isFinite(r[k])||r[k]<0))throw new Error('Costes y tiempos de ruta no válidos.');
  if(r.hops!==null&&!Number.isSafeInteger(r.hops))throw new Error('Saltos no válidos.');
  result.routes[key]=r;
 }
 if(s.overrides.length>1000||s.journal.length>2000)throw new Error('El archivo supera el límite de registros.');
 if(!['training','profit'].includes(result.mode)||!Number.isSafeInteger(result.quantity)||result.quantity<2||result.quantity>1000000)throw new Error('Lote u objetivo no válido.');
 for(const [k,v]of Object.entries(result.training))if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0||(k==='adeptLevel'&&v>100)||(k==='focus'&&v>30000))throw new Error('Progreso no válido.');
 for(const o of result.overrides){
  if(!o||!M.CITIES.includes(o.city)||!IDS.includes(o.item)||!['buy','sell','buyOrder','sellOrder'].includes(o.kind)||!Number.isFinite(Date.parse(o.at)))throw new Error('Precio manual no válido.');
  if(o.levels?.length)fill(o.levels,1);else if(typeof o.price!=='number'||!Number.isFinite(o.price)||o.price<=0)throw new Error('Precio manual no válido.');
  if(o.quantity!=null&&(!Number.isSafeInteger(o.quantity)||o.quantity<1))throw new Error('Cantidad manual no válida.');
 }
 for(const row of result.journal)if(!row||!['actual','prediction'].includes(row.type)||!Number.isFinite(Date.parse(row.at)))throw new Error('Registro de diario no válido.');
 validateSettings(result.settings);return result;
}
function validateSettings(s){
 for(const key of ['premium','feesConfirmed','profileConfirmed','allowRisk'])if(typeof s[key]!=='boolean')throw new Error('Confirmaciones no válidas.');
 if(!M.CITIES.includes(s.currentCity))throw new Error('Ciudad de partida no válida.');
 for(const key of ['capital','gold','committed','reserve','maxLoss','timeValue'])if(num(s[key])===null||num(s[key])<0)throw new Error('Revisa los valores no negativos de capital y límites.');
 for(const key of ['fee','tax','sellSetup','buySetup','craftMinutes','fame','minutesPerHop'])if(s[key]!=null&&(num(s[key])===null||num(s[key])<0))throw new Error('Tarifas, tiempos y Fame deben ser positivos o quedar vacíos.');
 if(num(s.rrr)===null||s.rrr<0||s.rrr>=90||num(s.maxPct)===null||s.maxPct<0||s.maxPct>100)throw new Error('RRR debe ser menor de 90%; límite de capital entre 0% y 100%.');
 for(const k of ['tax','sellSetup','buySetup'])if(s[k]!==null&&s[k]>=100)throw new Error('Las tasas deben ser menores de 100%.');
 if(![15,60,180].includes(Number(s.freshness)))throw new Error('Umbral de antigüedad no válido.');
}
function simulate(hide,leather,rrr,fee){
 if(!Number.isSafeInteger(hide)||!Number.isSafeInteger(leather)||hide<0||leather<0||hide>1e9||leather>1e9||!Number.isFinite(rrr)||rrr<0||rrr>=.9||fee!==null&&(!Number.isFinite(fee)||fee<0))throw new Error('Ingredientes o parámetros de refinado no válidos.');
 const initial={hide,leather};let output=0,passes=[];
 while(hide>=2&&leather>=1){
  const crafts=Math.min(Math.floor(hide/2),leather),usedHide=2*crafts,usedLeather=crafts;
  // Explicit planning approximation: floor each batch's expected returns. NOT the game's RNG law.
  const returnHide=Math.floor(usedHide*rrr),returnLeather=Math.floor(usedLeather*rrr);
  hide=hide-usedHide+returnHide;leather=leather-usedLeather+returnLeather;output+=crafts;
  passes.push({pass:passes.length+1,crafts,usedHide,usedLeather,returnHide,returnLeather,hide,leather,output,fee:fee===null?null:crafts*fee});
  if(passes.length>200)throw new Error('La simulación no converge.');
 }
 return {initial,output,passes,leftovers:{hide,leather},consumed:{hide:initial.hide-hide,leather:initial.leather-leather},fee:fee===null?null:output*fee,model:'Retornos medios redondeados hacia abajo por pase; proyección, no resultado garantizado.'};
}
function fill(levels,qty,direction='buy'){
 if(!Number.isSafeInteger(qty)||qty<0)throw new Error('Cantidad de lote no válida.');
 if(!Array.isArray(levels)||levels.some(x=>!Number.isFinite(x.price)||x.price<=0||!Number.isSafeInteger(x.quantity)||x.quantity<1))throw new Error('Profundidad no válida.');
 let remaining=qty,total=0;
 for(const level of [...levels].sort((a,b)=>direction==='sell'?b.price-a.price:a.price-b.price)){const count=Math.min(remaining,level.quantity);total+=count*level.price;remaining-=count;if(!remaining)break;}
 return {cost:remaining?null:total,filled:qty-remaining,missing:remaining,average:qty&&!remaining?total/qty:null};
}
function parseLevels(text){
 if(!text.trim())return null;
 return text.trim().split(/\n|;/).filter(x=>x.trim()).map(line=>{const pair=line.trim().split(/\s*[@x×]\s*/);if(pair.length!==2)throw new Error('Usa una línea por nivel: cantidad @ precio (ej. 10 @ 104).');const quantity=Number(pair[0]),price=Number(pair[1]);if(!Number.isSafeInteger(quantity)||quantity<1||!Number.isFinite(price)||price<=0)throw new Error('Profundidad no válida.');return {quantity,price};});
}
function quote(data,overrides,id,city,kind,qty,maxAge,now=Date.now()){
 if(qty===0)return {total:0,unit:null,fresh:true,depth:true,source:'No requiere compra',warnings:[],blockers:[]};
 const override=[...overrides].reverse().find(x=>x.item===id&&x.city===city&&x.kind===kind);
 if(override){
  const a=M.age(override.at,now),fresh=a.minutes<=maxAge;let total=null,depth=false,blockers=[];
  if(override.levels?.length){const f=fill(override.levels,qty,kind.startsWith('sell')?'sell':'buy');total=f.cost;depth=f.missing===0;if(f.missing)blockers.push('Profundidad manual insuficiente: '+city+' '+ITEMS[id]);}
  else if(num(override.price)>0){total=override.price*qty;if(num(override.quantity)!==null){depth=Number(override.quantity)>=qty;if(!depth){total=null;blockers.push('Cantidad manual insuficiente: '+city+' '+ITEMS[id]);}}}
  else blockers.push('Falta precio manual válido: '+ITEMS[id]);
  return {total,unit:total===null?null:total/qty,fresh,depth,source:'Manual · '+a.text,age:a,warnings:[...(!depth?['Profundidad no confirmada']:[]),...(!fresh?['Precio manual vencido']:[]),...(/Order/.test(kind)?['Orden propuesta: ejecución y espera no confirmadas']:[])],blockers};
 }
 if(/Order/.test(kind))return {total:null,unit:null,fresh:false,depth:false,source:'Orden sin precio objetivo',warnings:['Las órdenes necesitan un precio objetivo manual'],blockers:['Falta precio objetivo de orden: '+city+' '+ITEMS[id]]};
 const rows=M.normalize(data,id,qty,maxAge,now),q=rows.find(x=>x.city===city)[kind==='buy'?'buyNow':'sellNow'];
 return {total:q.price===null?null:q.price*qty,unit:q.price,fresh:q.fresh,depth:false,source:'AODP · '+q.age.text,age:q.age,warnings:['Profundidad no confirmada',...(!q.fresh?['Cotización antigua o sin fecha']:[])],blockers:q.price===null?['Falta precio: '+city+' '+ITEMS[id]]:[]};
}
function route(state,city,leg){
 if(city==='Martlock')return {city,mode:'local',cost:0,minutes:0,hops:0,risk:'local',warnings:[],blockers:[]};
 const r=state.routes[leg+':'+city]||{};const warnings=[],blockers=[];
 const cost=num(r.cost);
 const path=r.mode==='physical'?R.find('Martlock',city,state.settings.allowRisk):null;
 const hops=num(r.hops)??(path?path.hops*(leg==='in'?2:1):null);
 const minutes=num(r.minutes)??(r.mode==='physical'&&hops!==null&&num(state.settings.minutesPerHop)>0?hops*state.settings.minutesPerHop:null);
 const risk=r.risk==='unknown'&&path?path.risk:r.risk;
 if(cost===null)blockers.push('Falta coste de viaje '+(leg==='in'?'de ':'a ')+city);
 if(minutes===null)warnings.push('Tiempo de viaje sin confirmar: '+city);
 if(num(r.minutes)===null&&minutes!==null)warnings.push('Tiempo modelado por saltos; no cronometrado: '+city);
 if(!r.confirmed)warnings.push('Ruta sin confirmar: '+city);
 if(risk==='unknown')warnings.push('Riesgo de ruta desconocido: '+city);
 if((city==='Caerleon'||risk==='risky')&&!state.settings.allowRisk)blockers.push('Ruta de riesgo excluida: '+city);
 if(r.mode==='planner'&&(!r.at||M.age(r.at).minutes>state.settings.freshness))blockers.push('Cotización de viaje con carga sin confirmar o vencida: '+city);
 return {...r,city,cost,minutes,hops,risk,path,warnings,blockers};
}
function evaluate(state,data,origin,saleCity,execution='instant',now=Date.now()){
 validateSettings(state.settings);
 const s=state.settings,q=M.quantity(state.quantity), leather=Math.floor(q/2),sim=simulate(q,leather,s.rrr/100,num(s.fee));
 const buyKind=execution.startsWith('order')?'buyOrder':'buy',sellKind=execution.endsWith('order')?'sellOrder':'sell';
 const local=state.inventory.Martlock;
 const ownHideLocal=Math.min(q,local.T4_HIDE||0),ownHideRemote=origin==='Martlock'?0:Math.min(q-ownHideLocal,state.inventory[origin]?.T4_HIDE||0);
 const needHide=q-ownHideLocal-ownHideRemote,ownLeather=Math.min(leather,local.T3_LEATHER||0),needLeather=leather-ownLeather;
 const raw=quote(data,state.overrides,'T4_HIDE',origin,buyKind,needHide,s.freshness,now);
 const lower=quote(data,state.overrides,'T3_LEATHER','Martlock',buyKind,needLeather,s.freshness,now);
 // Valuation uses a marginal replacement quote, not a fictitious order for stock already owned.
 const valueHide=quote(data,state.overrides,'T4_HIDE','Martlock','buy',ownHideLocal+sim.leftovers.hide?1:0,s.freshness,now);
 const valueRemote=quote(data,state.overrides,'T4_HIDE',origin,'buy',ownHideRemote?1:0,s.freshness,now);
 const valueLeather=quote(data,state.overrides,'T3_LEATHER','Martlock','buy',ownLeather+sim.leftovers.leather?1:0,s.freshness,now);
 const stockValue=sum([ownHideLocal?mul(valueHide.unit,ownHideLocal):0,ownHideRemote?mul(valueRemote.unit,ownHideRemote):0,ownLeather?mul(valueLeather.unit,ownLeather):0]);
 const residual=sum([sim.leftovers.hide?mul(valueHide.unit,sim.leftovers.hide):0,sim.leftovers.leather?mul(valueLeather.unit,sim.leftovers.leather):0]);
 const sale=quote(data,state.overrides,'T4_LEATHER',saleCity,sellKind,sim.output,s.freshness,now);
 const incoming=needHide+ownHideRemote?route(state,origin,'in'):route(state,'Martlock','in');const outgoing=route(state,saleCity,'out');
 const quotes=[raw,lower,sale,...(ownHideLocal+sim.leftovers.hide?[valueHide]:[]),...(ownHideRemote?[valueRemote]:[]),...(ownLeather+sim.leftovers.leather?[valueLeather]:[])];
 let blockers=[...quotes.flatMap(x=>x.blockers),...incoming.blockers,...outgoing.blockers],warnings=[...quotes.flatMap(x=>x.warnings),...incoming.warnings,...outgoing.warnings,'Retornos estimados: el redondeo del juego sigue en calibración','Liquidez y volumen de ventas no confirmados'];
 const purchases=sum([raw.total,lower.total]);
 const buyFee=buyKind==='buyOrder'&&purchases!==0?mul(purchases,num(s.buySetup)===null?null:s.buySetup/100):0;
 const sellFee=sellKind==='sellOrder'?mul(sale.total,num(s.sellSetup)===null?null:s.sellSetup/100):0;
 const tax=mul(sale.total,num(s.tax)===null?null:s.tax/100);
 const travel=sum([incoming.cost,outgoing.cost]);
 const cashRequired=sum([purchases,buyFee,sim.fee,travel,sellFee]);
 const netProceeds=diff(sale.total,tax);
 const cashSurplus=diff(netProceeds,cashRequired);
 const economicProfit=sum([cashSurplus,stockValue===null?null:-stockValue,residual]);
 const minutes=sum([incoming.minutes,outgoing.minutes,num(s.craftMinutes)]);
 const timeCost=s.timeValue===0?0:mul(minutes,s.timeValue);
 const adjustedProfit=diff(economicProfit,timeCost);
 const costBasis=sum([purchases,buyFee,sim.fee,travel,sellFee,stockValue]);
 const fame=mul(sim.output,num(s.fame));
 const available=Math.max(0,s.capital-s.committed-s.reserve),cap=Math.min(available,Math.max(0,s.capital-s.committed)*s.maxPct/100);
 if(num(s.tax)===null)blockers.push('Falta impuesto de venta');
 if(buyKind==='buyOrder'&&num(s.buySetup)===null)blockers.push('Falta tarifa de orden de compra');
 if(sellKind==='sellOrder'&&num(s.sellSetup)===null)blockers.push('Falta tarifa de orden de venta');
 if(num(s.fee)===null)blockers.push('Falta tarifa por refinado');
 if(!s.feesConfirmed)blockers.push('Confirma RRR y tarifa de estación en Ajustes');
 if(!s.profileConfirmed)blockers.push('Confirma saldo e inventario en Ajustes');
 if(!quotes.every(x=>x.fresh))blockers.push('Hay precios ausentes o fuera del umbral de antigüedad');
 if(cashRequired!==null&&cashRequired>available)blockers.push('Efectivo insuficiente después de reservas y órdenes abiertas');
 if(cashRequired!==null&&cashRequired>cap)blockers.push('Supera el límite de capital por operación');
 if(s.timeValue>0&&minutes===null)blockers.push('Falta duración para valorar tu tiempo');
 if(s.currentCity!=='Martlock')blockers.push('Calculado desde Martlock: falta sumar tu desplazamiento inicial');
 if(state.mode==='training'&&!(fame>0))blockers.push('Falta Fame por craft para clasificar entrenamiento');
 if(state.mode==='training'&&economicProfit!==null&&economicProfit< -s.maxLoss)blockers.push('Supera la pérdida máxima de entrenamiento');
 if(state.mode==='profit'&&!(adjustedProfit>0))blockers.push('Beneficio positivo no demostrado');
 if(minutes===null)warnings.push('Silver/h pendiente del tiempo total');
 if(buyKind==='buyOrder'||sellKind==='sellOrder')warnings.push('Silver/h no incluye esperas de órdenes; no es rendimiento horario realizable');
 warnings=[...new Set(warnings)];blockers=[...new Set(blockers)];
 const allDepth=[raw,lower,sale].every(x=>x.depth);
 const confidence=blockers.length||!allDepth||incoming.minutes===null||outgoing.minutes===null||[incoming,outgoing].some(r=>r.mode!=='local'&&!r.confirmed)?'BAJA':'MEDIA';
 const profitPerHour=minutes>0&&buyKind==='buy'&&sellKind==='sell'?mul(adjustedProfit,60/minutes):null;
 const trainingCost=economicProfit===null?null:Math.max(0,-economicProfit);
 return {origin,saleCity,execution,buyKind,sellKind,quantity:q,needHide,needLeather,ownHideLocal,ownHideRemote,ownLeather,sim,raw,lower,sale,incoming,outgoing,purchases,buyFee,sellFee,tax,travel,stockValue,residual,netProceeds,cashRequired,cashSurplus,economicProfit,adjustedProfit,costBasis,roi:costBasis>0&&economicProfit!==null?economicProfit/costBasis*100:null,fame,trainingCost,silverPerFame:fame>0&&trainingCost!==null?trainingCost/fame:null,minutes,profitPerHour,confidence,warnings,blockers,eligible:blockers.length===0,cap,available,allDepth};
}
function compareRoutes(state,data,execution='instant',now=Date.now()){
 const base=evaluate(state,data,'Martlock','Martlock',execution,now);
 return M.CITIES.map(city=>{
  const x=evaluate(state,data,city,'Martlock',execution,now);
  const baseAcq=sum([base.purchases,base.buyFee]),acq=sum([x.purchases,x.buyFee]);
  const grossSavings=diff(baseAcq,acq),netSavings=diff(grossSavings,x.incoming.cost);
  const extraMinutes=x.incoming.minutes;
  return {...x,grossSavings,netSavings,transportPerMinute:extraMinutes>0&&netSavings!==null?netSavings/extraMinutes:null};
 });
}
function rank(state,data,execution='instant',now=Date.now()){
 const results=[];
 for(const origin of M.CITIES)for(const saleCity of M.CITIES){if(!state.settings.allowRisk&&(origin==='Caerleon'||saleCity==='Caerleon'))continue;results.push(evaluate(state,data,origin,saleCity,execution,now));}
 return results.sort((a,b)=>{
  if(a.eligible!==b.eligible)return a.eligible?-1:1;
  if(state.mode==='training')return (a.silverPerFame??Infinity)-(b.silverPerFame??Infinity)||(a.cashRequired??Infinity)-(b.cashRequired??Infinity);
  return (b.adjustedProfit??-Infinity)-(a.adjustedProfit??-Infinity);
 });
}
const calibration={date:'2026-10-04',initial:{hide:420,leather:210},rawPurchase:48300,rawUnit:115,plannerQuote:78376,plannerPaid:null,rrr:36.7,fee:13.5,passes:[{crafts:210,fee:2835,hide:155,leather:76,output:210},{crafts:76,fee:1026,hide:58,leather:28,output:286},{crafts:28,fee:378,hide:22,leather:10,output:314},{crafts:10,fee:135,feeStatus:'Seleccionado; pago pendiente de reconciliar'}],reportedOutput:327,reportedLeftovers:{hide:6,leather:1},fameGain:15450,expertBefore:13078,expertAfter:28528,discrepancy:3,notes:'Los pases registrados suman 324; inventario final 327. Faltan acciones por reconciliar. La cotización de viaje no demuestra pago. No consta venta final ni beneficio realizado.'};
const E={ITEMS,IDS,num,sum,defaults,validateState,validateSettings,simulate,fill,parseLevels,quote,route,evaluate,rank,compareRoutes,calibration};
if(typeof module!=='undefined'&&module.exports)module.exports=E;else root.Economy=E;
})(typeof globalThis!=='undefined'?globalThis:this);
