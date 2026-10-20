# Exporta el cuerpo (forma atlética) con esqueleto, pesos y zonas musculares, en binario para three.js
import json, numpy as np, struct, sys
from build import morph, V0, F
R='mhrepo/makehuman/data/rigs/'
sk=json.load(open(R+'default.mhskel')); wf=json.load(open(R+'default_weights.mhw'))['weights']
sexo=sys.argv[1] if len(sys.argv)>1 else 'h'
# Físico marcado (como en las animaciones de anatomía): mucho músculo y poca grasa
LR=lambda p,v: {f'armslegs/l-{p}-muscle-incr':v, f'armslegs/r-{p}-muscle-incr':v}
MUS=float(sys.argv[2]) if len(sys.argv)>2 else 1.0
V=morph(1 if sexo=='h' else 0, 1.12, .36, dict({'stomach/stomach-tone-incr':1.0*MUS, 'torso/torso-vshape-incr':1.0*MUS, 'torso/torso-muscle-pectoral-incr':1.0*MUS, 'torso/torso-muscle-dorsi-incr':.9*MUS,
  'armslegs/l-upperarm-shoulder-muscle-incr':1.0*MUS, 'armslegs/r-upperarm-shoulder-muscle-incr':1.0*MUS}, **LR('upperarm', 1.0*MUS), **LR('lowerarm', .8*MUS), **LR('upperleg', .9*MUS), **LR('lowerleg', .8*MUS)))
used=sorted(set(a for f in F for a,b in f)); ix={v:i for i,v in enumerate(used)}
P=V[used]; B0=V0[used]
tris=[]
for f in F:
    ids=[ix[a] for a,b in f]
    for k in range(1,len(ids)-1): tris.append([ids[0],ids[k],ids[k+1]])
tris=np.array(tris,dtype=np.uint16)
# normales en reposo
N=np.zeros_like(P); t=P[tris.astype(int)]; fn=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0])
for k in range(3): np.add.at(N,tris[:,k].astype(int),fn)
N/=np.linalg.norm(N,axis=1,keepdims=True)+1e-9
# huesos
names=list(sk['bones']); bi={n:i for i,n in enumerate(names)}
J=lambda j: V[sk['joints'][j]].mean(0)
bones=[{'n':n,'p':bi.get(b['parent'],-1) if b['parent'] else -1,'h':J(b['head']).round(4).tolist(),'t':J(b['tail']).round(4).tolist()} for n,b in ((n,sk['bones'][n]) for n in names)]
# pesos: 4 mayores por vértice
W=np.zeros((len(used),len(names)),dtype=np.float32)
for bn,lst in wf.items():
    if bn not in bi: continue
    for v,w in lst:
        if v in ix: W[ix[v],bi[bn]]=w
top=np.argsort(-W,axis=1)[:,:4]; tw=np.take_along_axis(W,top,1); tw/=tw.sum(1,keepdims=True)+1e-9
dom=[names[i] for i in top[:,0]]
# zonas musculares (en la pose base)
x,y,z=B0[:,0],B0[:,1],B0[:,2]; ax=np.abs(x); nz=N[:,2]
ZON=['','pecho','abdomen','oblicuos','dorsales','trapecio','lumbar','hombros','biceps','triceps','antebrazos','gluteos','cuadriceps','isquios','aductores','pantorrillas']
M=np.zeros(len(used),dtype=np.uint8)
def put(mask,name): M[mask & (M==0)]=ZON.index(name)
D=np.array(dom)
isb=lambda *k: np.isin(D,[a+s for a in k for s in ('.L','.R')])
arm_up=isb('upperarm01','upperarm02'); arm_lo=isb('lowerarm01','lowerarm02','wrist')
# brazo: eje del brazo para saber frente/atrás
put(isb('shoulder01') | (isb('upperarm01') & (ax<2.25)), 'hombros')
put(arm_up & (nz>0.05), 'biceps'); put(arm_up & (nz<=0.05), 'triceps'); put(arm_lo & (y>1.8), 'antebrazos')
tor=~(arm_up|arm_lo|isb('shoulder01'))
put(tor & (nz>0.25) & (y>3.25) & (y<4.75) & (ax>0.18) & (ax<1.65), 'pecho')
put(tor & (nz>0.3) & (y>1.15) & (y<3.25) & (ax<0.85), 'abdomen')
put(tor & (nz>-0.1) & (y>0.9) & (y<3.3) & (ax>=0.85) & (ax<1.55), 'oblicuos')
put(tor & (nz<-0.2) & (((y>4.7) & (y<6.0) & (ax<1.5)) | ((y>3.7) & (y<=4.7) & (ax<0.5))), 'trapecio')
put(tor & (nz<-0.12) & (y>2.1) & (y<4.7) & (ax>0.4) & (ax<1.8), 'dorsales')
put(tor & (nz<-0.2) & (y>0.6) & (y<2.4) & (ax<0.85), 'lumbar')
leg_up=isb('upperleg01','upperleg02'); leg_lo=isb('lowerleg01','lowerleg02')
put((isb('pelvis') | leg_up) & (nz<-0.15) & (y>-1.7) & (y<0.9), 'gluteos')
nx_in=-np.sign(x)*N[:,0]
put(leg_up & (nx_in>0.45) & (y>-4.5), 'aductores')
put(leg_up & (nz>=0) & (y>-5.2), 'cuadriceps'); put(leg_up & (nz<0) & (y>-5.2), 'isquios')
put(leg_lo & (nz<0.1) & (y>-7.3), 'pantorrillas')
# Suaviza los bordes de las zonas (vecinos de la malla) para que no queden serruchados
A=[[] for _ in range(len(used))]
for a,b,c in tris.astype(int): A[a]+= [b,c]; A[b]+=[a,c]; A[c]+=[a,b]
E=np.array([(i,j) for i,l in enumerate(A) for j in l]); deg=np.bincount(E[:,0],minlength=len(used))+1e-9
H=np.zeros((len(used),len(ZON))); H[np.arange(len(used)),M]=1
for _ in range(10):
    S=np.zeros_like(H); np.add.at(S,E[:,0],H[E[:,1]]); H=(H+S/deg[:,None])/2
M=H.argmax(1).astype(np.uint8)
out={'n':len(used),'bones':bones,'zonas':ZON}
# Normales de la malla base y dirección de las fibras de cada zona (para dibujar las fibras del músculo que trabaja)
NB=np.zeros_like(B0); tb=B0[tris.astype(int)]; fb=np.cross(tb[:,1]-tb[:,0],tb[:,2]-tb[:,0])
for k in range(3): np.add.at(NB,tris[:,k].astype(int),fb)
NB/=np.linalg.norm(NB,axis=1,keepdims=True)+1e-9
sx=np.sign(B0[:,0]+1e-9)
def eje(a,b):
    hb={x['n']:np.array(x['h']) for x in bones}
    out=np.zeros((len(used),3))
    for i,l in enumerate(('.L','.R')):
        d=V0[sk['joints'][sk['bones'][b+l]['head']]].mean(0)-V0[sk['joints'][sk['bones'][a+l]['head']]].mean(0); d/=np.linalg.norm(d)
        out[(sx>0) if l=='.L' else (sx<0)]=d
    return out
FD=np.zeros((len(used),3)); FD[:,1]=1
z=lambda n: M==ZON.index(n)
brazo=eje('upperarm01','lowerarm01'); ante=eje('lowerarm01','wrist'); muslo=eje('upperleg01','lowerleg01'); pierna=eje('lowerleg01','foot')
FD[z('pecho')]=np.c_[sx*.92, np.full(len(used),.38), np.zeros(len(used))][z('pecho')]
FD[z('oblicuos')]=np.c_[sx*.5, np.full(len(used),.86), np.zeros(len(used))][z('oblicuos')]
FD[z('dorsales')]=np.c_[sx*.6, np.full(len(used),.8), np.zeros(len(used))][z('dorsales')]
FD[z('trapecio')]=np.c_[sx*.85, np.full(len(used),.5), np.zeros(len(used))][z('trapecio')]
FD[z('gluteos')]=np.c_[sx*.75, np.full(len(used),-.66), np.zeros(len(used))][z('gluteos')]
for n,e in (('hombros',brazo),('biceps',brazo),('triceps',brazo),('antebrazos',ante),('cuadriceps',muslo),('isquios',muslo),('aductores',muslo),('pantorrillas',pierna)): FD[z(n)]=e[z(n)]
# Cavidad: cuánto se hunde cada punto respecto de sus vecinos (surcos entre músculos), a escala de músculo
vec=[set() for _ in range(len(used))]
for a,b,c in tris.astype(int): vec[a].update((b,c)); vec[b].update((a,c)); vec[c].update((a,b))
vec=[np.array(sorted(x)) for x in vec]
Np=np.zeros_like(P); tp=P[tris.astype(int)]; fp=np.cross(tp[:,1]-tp[:,0],tp[:,2]-tp[:,0])
for k in range(3): np.add.at(Np,tris[:,k].astype(int),fp)
Np/=np.linalg.norm(Np,axis=1,keepdims=True)+1e-9
def suav(X, it):
    for _ in range(it): X=np.array([X[v].mean(0) for v in vec])
    return X
# forma suavizada a dos escalas: la diferencia con la real marca los relieves de los músculos
P3=suav(P.copy(), 3); P10=suav(P3.copy(), 7)
CAV=np.einsum('ij,ij->i', P3-P, Np) + .6*np.einsum('ij,ij->i', P10-P, Np)
CAV=suav(CAV[:,None], 1)[:,0]
CAV=np.clip(CAV/ (np.percentile(np.abs(CAV),97)+1e-9), -1, 1)
q8=lambda a: np.round(np.clip(a,-1,1)*127).astype(np.int8).tobytes()
bin=b''.join([np.round(P*3000).astype(np.int16).tobytes(), tris.tobytes(), top.astype(np.uint8).tobytes(), (tw*255).round().astype(np.uint8).tobytes(), M.tobytes(),
  np.round(B0*3000).astype(np.int16).tobytes(), q8(NB), q8(FD), q8(CAV)])
out['tris']=len(tris)
json.dump(out,open(f'r/cuerpo3d_{sexo}.json','w')); open(f'r/cuerpo3d_{sexo}.bin','wb').write(bin)
print(len(used), len(tris), len(names), len(bin)//1024,'KB', {z:int((M==i).sum()) for i,z in enumerate(ZON)})
