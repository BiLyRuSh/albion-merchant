"""Extract only factual Royal overland links from ao-data cluster/world.json.
Usage: python scripts/build-routes.py downloaded-world.json
No map coordinates, abstract travel weights, portals or third-party routing code.
"""
import json,sys,hashlib
from pathlib import Path
raw=Path(sys.argv[1]).read_bytes()
clusters=json.loads(raw)['world']['clusters']['cluster']
cities=['Martlock','Lymhurst','Bridgewatch','Thetford','Fort Sterling','Caerleon']
types={'SAFEAREA':'blue','OPENPVP_YELLOW':'yellow','OPENPVP_RED':'red'}
nodes={}
for c in clusters:
    cid=c['@id']; city=c.get('@displayname') in cities
    if c.get('@enabled')!='true' or not (city or (cid.isdigit() and len(cid)==4 and int(cid)<5000 and c['@type'] in types)):continue
    nodes[cid]={'name':c['@displayname'],'zone':'blue' if city else types[c['@type']], 'links':[]}
for c in clusters:
    if c['@id'] not in nodes:continue
    exits=(c.get('exits') or {}).get('exit',[])
    if isinstance(exits,dict):exits=[exits]
    for e in exits:
        target=e.get('@targetid','').split('@')[-1]
        if e.get('@targettype')=='Cluster' and e.get('@restricted')=='false' and target in nodes:
            nodes[c['@id']]['links'].append(target)
    nodes[c['@id']]['links']=sorted(set(nodes[c['@id']]['links']))
# Only retain the connected Royal component reachable from Martlock.
start=next(k for k,v in nodes.items() if v['name']=='Martlock')
seen={start};queue=[start]
for cid in queue:
    for target in nodes[cid]['links']:
        if target not in seen:seen.add(target);queue.append(target)
nodes={k:v for k,v in nodes.items() if k in seen}
result={'source':'https://github.com/ao-data/ao-bin-dumps/blob/master/cluster/world.json','retrieved':'2026-10-05','sha256':hashlib.sha256(raw).hexdigest(),'scope':'Royal overland only; excludes tunnels, portals, roads, markets and bank interiors','nodes':nodes}
text=json.dumps(result,ensure_ascii=False,separators=(',',':'))
Path('dist/routes-data.js').write_text('(function(r){const d='+text+';if(typeof module!=="undefined"&&module.exports)module.exports=d;else r.RoutesData=d;})(globalThis);\n')
print(f'Extracted {len(nodes)} zones, {sum(len(n["links"]) for n in nodes.values())} directed links')
