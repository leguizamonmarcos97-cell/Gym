import json, sys
from build import build
def LR(part, v): return {f'armslegs/l-{part}-muscle-incr':v, f'armslegs/r-{part}-muscle-incr':v}
def X(**k):
    e={'def':k.get('d',0)}
    if 'tone' in k: e['stomach/stomach-tone-incr']=k['tone']
    if 'v' in k: e['torso/torso-vshape-incr']=k['v']
    if 'pec' in k: e['torso/torso-muscle-pectoral-incr']=k['pec']
    if 'dor' in k: e['torso/torso-muscle-dorsi-incr']=k['dor']
    if 'arm' in k: e.update(LR('upperarm',k['arm'])); e.update(LR('lowerarm',k['arm']*.7))
    if 'hom' in k: e.update({'armslegs/l-upperarm-shoulder-muscle-incr':k['hom'],'armslegs/r-upperarm-shoulder-muscle-incr':k['hom']})
    if 'pie' in k: e.update(LR('upperleg',k['pie'])); e.update(LR('lowerleg',k['pie']*.8))
    if 'glu' in k: e['buttocks/buttocks-volume-incr']=k['glu']
    if 'panza' in k: e['stomach/stomach-pregnant-incr']=k['panza']
    return e
# Cómo está hoy (musculo, peso, extras) — mismos para hombre y mujer
HOY = {
 'muyflaco':(.25,-.15,{}), 'flaco':(.4,.15,{}), 'normal':(.5,.5,{}), 'atletico':(.85,.35,X(tone=.6,d=.6)),
 'musculoso':(1.15,.7,X(tone=.5,d=.55)), 'panza':(.45,.8,X(panza=.35)), 'sobrepeso':(.45,1.05,X(panza=.45)), 'obesidad':(.4,1.35,X(panza=.7))}
# Cómo querés quedar: cuerpos trabajados, distintos para hombre y mujer
META = {
 'h':{'enforma':(.68,.38,X(tone=.7,v=.3,pec=.2,d=.35)), 'marcado':(.85,.18,X(tone=1,v=.5,pec=.4,arm=.3,d=1)),
      'atleta':(.95,.38,X(d=.8,tone=.9,v=.8,pec=.6,dor=.4,arm=.5,hom=.6,pie=.4)), 'fuerte':(1.1,.6,X(d=.6,tone=.7,v=.8,pec=.8,dor=.7,arm=.8,hom=.8,pie=.7)),
      'grande':(1.3,.72,X(d=.75,tone=.8,v=1.1,pec=1.1,dor=1,arm=1.1,hom=1.1,pie=.9))},
 'm':{'enforma':(.6,.38,X(tone=.7,d=.25)), 'tonificada':(.75,.22,X(d=.6,tone=1,arm=.2,pie=.2)),
      'atleta':(.88,.36,X(d=.65,tone=.9,v=.3,arm=.4,hom=.4,pie=.5,glu=.3)), 'gluteos':(.78,.45,X(d=.35,tone=.8,pie=.7,glu=1)),
      'fuerte':(1.05,.55,X(d=.6,tone=.8,v=.4,arm=.7,hom=.6,pie=.8,glu=.6))}}
jobs=[]
for sx in sys.argv[1]:
    for k,v in HOY.items(): jobs.append((f'{sx}_{k}',sx,v))
    for k,v in META[sx].items(): jobs.append((f'{sx}_meta_{k}',sx,v))
sel=sys.argv[2:]
for n,sx,(m,w,e) in jobs:
    if sel and n not in sel: continue
    e=dict(e); df=e.pop('def',0); r=build(sx,m,w,e,'short02' if sx=='h' else 'ponytail01'); r['def']=df
    json.dump(r, open(f'r/data/{n}.json','w')); print(n)
