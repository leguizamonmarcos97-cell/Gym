import json, sys
from build import build
FIG = {  # musculo, peso (0..1, 0,5 = promedio; >1 extrapola), extras
 'muyflaco':(.25,-.15,{}), 'flaco':(.4,.15,{}), 'normal':(.5,.5,{}), 'atletico':(.85,.35,{'stomach/stomach-tone-incr':.6}),
 'musculoso':(1.15,.7,{'stomach/stomach-tone-incr':.5}), 'panza':(.45,.8,{'stomach/stomach-pregnant-incr':.35}),
 'sobrepeso':(.45,1.05,{'stomach/stomach-pregnant-incr':.45}), 'obesidad':(.4,1.35,{'stomach/stomach-pregnant-incr':.7})}
for k in (sys.argv[2:] or FIG):
    for sx in sys.argv[1]:
        m,w,e=FIG[k]
        json.dump(build(sx,m,w,e,'short02' if sx=='h' else 'bob02'), open(f'r/data/{sx}_{k}.json','w'))
        print(sx,k)
