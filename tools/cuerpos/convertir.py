# Pasa el esqueleto, los pesos, las zonas y las fibras del cuerpo de la app (MakeHuman) al cuerpo esculpido nuevo.
# 1) pone el cuerpo de la app en pose T (como el nuevo), 2) alinea y escala el nuevo, 3) copia lo de cada vértice del más cercano.
import json, numpy as np, sys
M=json.load(open(sys.argv[1])); buf=open(sys.argv[2],'rb').read(); N=np.load(sys.argv[3]); out=sys.argv[4]
n=M['n']; nt=M['tris']; o=0
pos=np.frombuffer(buf,np.int16,n*3,o).reshape(-1,3)/3000; o+=n*6
idx=np.frombuffer(buf,np.uint16,nt*3,o).reshape(-1,3); o+=nt*6
si=np.frombuffer(buf,np.uint8,n*4,o).reshape(-1,4); o+=n*4
sw=np.frombuffer(buf,np.uint8,n*4,o).reshape(-1,4)/255; o+=n*4
zona=np.frombuffer(buf,np.uint8,n,o); o+=n
bpos=np.frombuffer(buf,np.int16,n*3,o).reshape(-1,3)/3000; o+=n*6
nb=np.frombuffer(buf,np.int8,n*3,o).reshape(-1,3)/127; o+=n*3
fd=np.frombuffer(buf,np.int8,n*3,o).reshape(-1,3)/127; o+=n*3
B=M['bones']; nombres=[b['n'] for b in B]; bi={x:i for i,x in enumerate(nombres)}
H=np.array([b['h'] for b in B]); T=np.array([b['t'] for b in B])
def desc(i):
    out=[i]; pila=[i]
    while pila:
        k=pila.pop()
        for j,b in enumerate(B):
            if b['p']==k: out.append(j); pila.append(j)
    return set(out)
def rot(a,b):
    a=a/np.linalg.norm(a); b=b/np.linalg.norm(b); v=np.cross(a,b); c=a@b
    if np.linalg.norm(v)<1e-9: return np.eye(3)
    vx=np.array([[0,-v[2],v[1]],[v[2],0,-v[0]],[-v[1],v[0],0]]); return np.eye(3)+vx+vx@vx/(1+c)
# transformación por hueso: x -> R(x - piv) + piv2
Rb=[np.eye(3)]*len(B); Pb=[np.zeros(3)]*len(B); Qb=[np.zeros(3)]*len(B)
for l,sx in (('L',1),('R',-1)):
    up=bi['upperarm01.'+l]; lo=bi['lowerarm01.'+l]; wr=bi['wrist.'+l]
    Sh=H[up]; El=H[lo]; Wr=H[wr]; t=np.array([sx,0,0.])
    R1=rot(El-Sh,t); El2=Sh+R1@(El-Sh); R2=rot(R1@(Wr-El),t)@R1
    for k in desc(up):
        if k in desc(lo): Rb[k]=R2; Pb[k]=El; Qb[k]=El2
        else: Rb[k]=R1; Pb[k]=Sh; Qb[k]=Sh
def tr(k,x): return (Rb[k]@(x-Pb[k]).T).T+Qb[k]
PT=np.zeros_like(pos)
for c in range(4):
    for k in np.unique(si[:,c]):
        m=si[:,c]==k; PT[m]+=sw[m,c:c+1]*tr(k,pos[m])
HT=np.array([tr(k,H[k][None])[0] for k in range(len(B))]); TT=np.array([tr(k,T[k][None])[0] for k in range(len(B))])
# alinear el nuevo: escala por la altura, pies en el piso, centrado
Pn=N['P'].copy(); alto_n=Pn[:,1].max()-Pn[:,1].min(); alto=PT[:,1].max()-PT[:,1].min()
s=alto/alto_n; Pn=(Pn-[0,Pn[:,1].min(),0])*s+[0,PT[:,1].min(),0]
Pn[:,0]-= (Pn[:,0].max()+Pn[:,0].min())/2
banda=lambda P: P[(P[:,1]>2)&(P[:,1]<5)&(np.abs(P[:,0])<1.2)]
Pn[:,2]+= banda(PT)[:,2].mean()-banda(Pn)[:,2].mean()
print('escala',round(s,2),'alto',round(alto,2),'envergadura app',PT[:,0].min().round(2),PT[:,0].max().round(2),'nuevo',Pn[:,0].min().round(2),Pn[:,0].max().round(2))
# vecinos más cercanos (en bloques)
def vecinos(Q,P,k):
    I=np.zeros((len(Q),k),int); D=np.zeros((len(Q),k))
    for a in range(0,len(Q),1500):
        d=((Q[a:a+1500,None,:]-P[None,:,:])**2).sum(-1); ii=np.argpartition(d,k,axis=1)[:,:k]
        dd=np.take_along_axis(d,ii,1); o_=np.argsort(dd,1); I[a:a+1500]=np.take_along_axis(ii,o_,1); D[a:a+1500]=np.sqrt(np.take_along_axis(dd,o_,1))
    return I,D
I,D=vecinos(Pn,PT,4)
print('distancia media al más cercano',D[:,0].mean().round(3),'máx',D[:,0].max().round(3))
w=1/(D+1e-4); w/=w.sum(1,keepdims=True)
# pesos de hueso: se suman los de los 4 vecinos y se quedan los 4 mayores
nn=len(Pn); W=np.zeros((nn,len(B)))
for c in range(4):
    for kk in range(4): np.add.at(W,(np.arange(nn),si[I[:,kk],c]),w[:,kk]*sw[I[:,kk],c])
top=np.argsort(-W,1)[:,:4]; tw=np.take_along_axis(W,top,1); tw/=tw.sum(1,keepdims=True)+1e-9
zn=zona[I[:,0]]; fdn=fd[I[:,0]]
# coordenadas base: las del propio cuerpo nuevo (bordes del short y de las zonas sin serrucho); en los brazos (pose T) las fibras van a lo largo del brazo
bp=None; nbn=None
# zonas suavizadas por vecinos de la malla nueva (2 pasadas de voto)
F=N['I']; vec=[set() for _ in range(nn)]
for a,b,c in F: vec[a].update((b,c)); vec[b].update((a,c)); vec[c].update((a,b))
for _ in range(2):
    z2=zn.copy()
    for v in range(nn):
        vs=[zn[x] for x in vec[v]]+[zn[v]]; z2[v]=max(set(vs),key=vs.count)
    zn=z2
# cavidad propia del cuerpo nuevo (surcos entre músculos)
Nn=np.zeros_like(Pn); tp=Pn[F]; fn=np.cross(tp[:,1]-tp[:,0],tp[:,2]-tp[:,0])
for k in range(3): np.add.at(Nn,F[:,k],fn)
Nn/=np.linalg.norm(Nn,axis=1,keepdims=True)+1e-9
vv=[np.array(sorted(x)) for x in vec]
def suav(X,it):
    for _ in range(it): X=np.array([X[v].mean(0) for v in vv])
    return X
P3=suav(Pn.copy(),3); CAV=np.einsum('ij,ij->i',P3-Pn,Nn); CAV=suav(CAV[:,None],1)[:,0]; CAV=np.clip(CAV/(np.percentile(np.abs(CAV),97)+1e-9),-1,1)
bp=Pn; nbn=Nn
ZN=M['zonas']; brazo=np.isin(zn,[ZN.index(z) for z in ('hombros','biceps','triceps','antebrazos')])
fdn=fdn.astype(np.float64); fdn[brazo]=np.c_[np.sign(Pn[brazo,0]),np.zeros(brazo.sum()),np.zeros(brazo.sum())]
q8=lambda a: np.round(np.clip(a,-1,1)*127).astype(np.int8).tobytes()
# Manos: las del cuerpo de la app (sus dedos coinciden con los huesos y pueden agarrar). Se quitan las del cuerpo nuevo
# desde la muñeca y se agregan las de la app desde un poco antes (en el antebrazo, donde la textura es lisa), para que se superpongan y no quede hueco.
UV=N['UV']
mano_b=[i for i,x in enumerate(nombres) if x.split('.')[0] in ('wrist',) or x.startswith('metacarpal') or x.startswith('finger')]
wm=np.zeros(len(pos))
for c in range(4): wm+=np.isin(si[:,c],mano_b)*sw[:,c]
cortes={}
for l,sx in (('L',1),('R',-1)): cortes[sx]=abs(HT[bi['wrist.'+l]][0])
print('cortes',cortes)
xs=np.abs(Pn[:,0]); lado=np.sign(Pn[:,0])
quitar=np.array([xs[v]>cortes[lado[v] if lado[v]!=0 else 1]-.2 for v in range(nn)])
agreg=np.where(np.abs(PT[:,0])>np.array([cortes[1 if x>=0 else -1] for x in PT[:,0]])-.45)[0]
print('vértices de mano: se quitan',quitar.sum(),'se agregan',len(agreg))
mapa=-np.ones(len(pos),int); mapa[agreg]=np.arange(len(agreg))+nn
Fk=F[~quitar[F].any(1)]
ta=idx[np.isin(idx,agreg).all(1)].astype(int); Fm=mapa[ta]
# UV de las manos agregadas: la del punto de la muñeca del cuerpo nuevo más cercano (zona lisa)
# el antebrazo nuevo queda un poco más abajo que la muñeca de la app: se lo corre de a poco (desde el codo) para que llegue justo a la mano
for sx in (1,-1):
    c0=cortes[sx]; codo=abs(HT[bi['lowerarm01.'+('L' if sx>0 else 'R')]][0])
    sl=lambda P: P[(np.sign(P[:,0])==sx)&(np.abs(P[:,0])>c0-.6)&(np.abs(P[:,0])<c0-.05)]
    d=sl(PT)[:,1:].mean(0)-sl(Pn)[:,1:].mean(0); print('corrimiento muñeca',sx,d.round(3))
    m=(np.sign(Pn[:,0])==sx)&(np.abs(Pn[:,0])>codo)
    a=np.clip((np.abs(Pn[m,0])-codo)/(c0-.5-codo),0,1); a=a*a*(3-2*a)
    Pn[np.where(m)[0],1:]+=a[:,None]*d
# muñeca del cuerpo nuevo: sin pesos de dedos (si no, se estira en jirones al cerrar la mano)
dedo=np.array([x.startswith('metacarpal') or x.startswith('finger') for x in nombres])
corteV=np.array([cortes[l if l!=0 else 1] for l in lado])
for v in np.where((xs>corteV-.6)&~quitar)[0]:
    w=tw[v]*~dedo[top[v]]
    if w.sum()<1e-6: top[v]=[bi['wrist.'+('L' if lado[v]>0 else 'R')],0,0,0]; w=np.array([1.,0,0,0])
    tw[v]=w/w.sum()
# la punta del antebrazo nuevo pasa de a poco a la superficie y a los pesos de la muñeca de la app:
# así acompaña a la mano cuando la muñeca se dobla (sin hueco, sin escalón, sin borde serruchado)
rampa=np.where(~quitar&(xs>corteV-.75))[0]
t=np.clip((xs[rampa]-(corteV[rampa]-.75))/.55,0,1); t=t*t*(3-2*t)
CAV[rampa]*=1-t  # la sombra de surco de la muñeca vieja ya no corresponde
for sx in (1,-1):
    m=lado[rampa]==sx; r=rampa[m]; tt=t[m]
    cand=np.where((np.sign(PT[:,0])==sx)&(np.abs(PT[:,0])>cortes[sx]-.9)&(np.abs(PT[:,0])<cortes[sx]-.1))[0]
    ej=HT[bi['wrist.'+('L' if sx>0 else 'R')]]
    # vecino en la misma sección del brazo (misma x) y en la misma dirección alrededor del eje
    ang=lambda P: np.c_[np.abs(P[:,0])*4, (P[:,1:]-ej[1:])/(np.linalg.norm(P[:,1:]-ej[1:],axis=1,keepdims=True)+1e-6)]
    Ir,_=vecinos(ang(Pn[r]),ang(PT[cand]),1); j=cand[Ir[:,0]]
    eje=np.tile(ej,(len(r),1)); eje[:,0]=Pn[r,0]
    rn=np.linalg.norm((Pn[r]-eje)[:,1:],axis=1)+1e-6; rm=np.linalg.norm((PT[j]-eje)[:,1:],axis=1)*1.07  # un poco más ancho: tapa el borde de la mano
    Pn[r]=eje+(Pn[r]-eje)*(1+tt*(rm/rn-1))[:,None]
    for v,jj,a in zip(r,j,tt):
        Wv={}
        for c in range(4):
            Wv[top[v][c]]=Wv.get(top[v][c],0)+(1-a)*tw[v][c]; Wv[int(si[jj][c])]=Wv.get(int(si[jj][c]),0)+a*sw[jj][c]
        k=sorted(Wv,key=lambda b:-Wv[b])[:4]; k+= [0]*(4-len(k)); w=np.array([Wv.get(b,0) for b in k])
        top[v]=k; tw[v]=w/w.sum()
# manos agregadas: UV en una zona lisa de las texturas (sin poros ni sombras), con un poco de variación para no degenerar la tangente
uvm=np.array([.5977,.539])+PT[agreg][:,[0,1]]*.0015
Pn=np.r_[Pn,PT[agreg]]; F=np.r_[Fk,Fm]; UV=np.r_[UV,uvm]
top=np.r_[top,si[agreg].astype(int)]; tw=np.r_[tw,sw[agreg]]; zn=np.r_[zn,zona[agreg]]
bp=np.r_[bp,PT[agreg]]; nbn=np.r_[nbn,np.tile([0,0,1.],(len(agreg),1))]; fdn=np.r_[fdn,fd[agreg]]; CAV=np.r_[CAV,np.zeros(len(agreg))]
nn=len(Pn); uv16=np.round(np.clip(UV,0,1)*65535).astype(np.uint16)
binout=b''.join([np.round(Pn*3000).astype(np.int16).tobytes(), F.astype(np.uint16).tobytes(), top.astype(np.uint8).tobytes(), (tw*255).round().astype(np.uint8).tobytes(),
  zn.astype(np.uint8).tobytes(), np.round(bp*3000).astype(np.int16).tobytes(), q8(nbn), q8(fdn), q8(CAV), uv16.tobytes()])
bones=[{'n':b['n'],'p':b['p'],'h':HT[i].round(4).tolist(),'t':TT[i].round(4).tolist()} for i,b in enumerate(B)]
meta={'n':nn,'tris':len(F),'bones':bones,'zonas':M['zonas'],'uv':True,'texturas':True,'sinRelieve':True,
      'autor':'Harshit Prajapati','licencia':'CC BY 4.0','fuente':'https://sketchfab.com/3d-models/male-base-muscular-anatomy-0954aa04666d45aab9633009318f7b66'}
json.dump(meta,open(out+'.json','w')); open(out+'.bin','wb').write(binout)
print('listo',nn,len(F),len(binout)//1024,'KB')
