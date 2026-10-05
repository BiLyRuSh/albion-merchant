(function(root){
'use strict';
const graph=typeof module!=='undefined'&&module.exports?require('./routes-data.js'):root.RoutesData;
function find(from,to,allowRisk=false){
 const nodes=graph.nodes,start=Object.keys(nodes).find(k=>nodes[k].name===from),end=Object.keys(nodes).find(k=>nodes[k].name===to);
 if(!start||!end)return null;
 const seen=new Map([[start,null]]),queue=[start];
 for(let i=0;i<queue.length;i++){
  const id=queue[i];if(id===end)break;
  for(const next of nodes[id].links)if(!seen.has(next)&&(allowRisk||nodes[next].zone!=='red')){seen.set(next,id);queue.push(next);}
 }
 if(!seen.has(end))return null;
 const path=[];for(let id=end;id!==null;id=seen.get(id))path.unshift({id,...nodes[id]});
 return {path,hops:path.length-1,risk:path.some(n=>n.zone==='red')?'risky':'lower',source:graph.source,retrieved:graph.retrieved};
}
const R={find,graph};if(typeof module!=='undefined'&&module.exports)module.exports=R;else root.Routes=R;
})(globalThis);
