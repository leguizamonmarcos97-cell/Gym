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
# brazos: el del cuerpo nuevo queda un poco más abajo y adelante que los huesos; se lo lleva al eje de los huesos
# (de a poco desde el hombro), así el codo y la muñeca giran en su centro
for sx in (1,-1):
    xg=np.arange(2.6,7.5,.2); dl=[]
    for x in xg:
        a_=Pn[(sx*Pn[:,0]>=x)&(sx*Pn[:,0]<x+.3)&(Pn[:,1]>3.5)]; b_=PT[(sx*PT[:,0]>=x)&(sx*PT[:,0]<x+.3)&(PT[:,1]>3.5)]
        dl.append([(b_[:,1].min()+b_[:,1].max()-a_[:,1].min()-a_[:,1].max())/2,(b_[:,2].min()+b_[:,2].max()-a_[:,2].min()-a_[:,2].max())/2])
    dl=np.array(dl); dl=np.array([dl[max(0,i-2):i+3].mean(0) for i in range(len(dl))])
    m=sx*Pn[:,0]>1.8; xa=sx*Pn[m,0]
    dd=np.c_[np.interp(xa,xg+.15,dl[:,0]),np.interp(xa,xg+.15,dl[:,1])]
    r=np.clip((xa-1.8)/1.2,0,1); r=r*r*(3-2*r)
    Pn[np.where(m)[0],1:]+=r[:,None]*dd
    print('brazo',sx,'corrimiento y/z en el codo',dl[len(dl)//2].round(2),'en la muñeca',dl[-1].round(2))
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
# Manos: las propias del cuerpo nuevo. Sus dedos son más largos y están abiertos, así que se mueven los huesos
# de la mano (nudillos, falanges, pulgar) al centro de cada dedo y se pesa cada dedo sólo con sus huesos.
UV=N['UV']
ss=lambda t: (lambda c: c*c*(3-2*c))(np.clip(t,0,1))
def segdist(P,a,b):
    ab=b-a; t=np.clip(((P-a)@ab)/(ab@ab+1e-9),0,1); return np.linalg.norm(P-(a+t[:,None]*ab),axis=1)
for l,sx in (('L',1),('R',-1)):
    Q=Pn.copy(); Q[:,0]*=sx
    wr=bi['wrist.'+l]; W0=HT[wr]*[sx,1,1]; wx=W0[0]
    lado=(Pn[:,0]*sx)>wx-.6
    # 1) dedos largos: cuatro bandas separadas en z (de meñique a índice) en la zona de las falanges
    s=Q[lado&(Q[:,0]>9.0)&(Q[:,0]<9.3)]; z=np.sort(s[:,2]); g=np.diff(z)
    cz=sorted((z[i]+z[i+1])/2 for i in np.argsort(-g)[:3]); lim=[-9]+cz+[9]
    zmax_dedos=z.max()
    # donde se separan los dedos
    xsep=9.0
    def huecos(x):
        t_=Q[lado&(Q[:,0]>=x)&(Q[:,0]<x+.06)&(Q[:,2]<zmax_dedos+.05)]
        return sum(((t_[:,2]>c-.05)&(t_[:,2]<c+.05)).sum()==0 for c in cz)
    for x in np.arange(8.3,9.2,.025):
        if all(huecos(x+d)>=3 for d in (0,.06,.12)): xsep=x; break
    print(l,'dedos se separan en x',round(xsep,2),'límites z',np.round(cz,2))
    def centro(sel,x,ancho=.06):
        t_=Q[sel&(np.abs(Q[:,0]-x)<ancho)]
        return np.array([x,(t_[:,1].min()+t_[:,1].max())/2,(t_[:,2].min()+t_[:,2].max())/2]) if len(t_)>2 else None
    banda={}
    for k,f in enumerate((5,4,3,2)):
        sel=lado&(Q[:,2]>lim[k])&(Q[:,2]<=lim[k+1])&(Q[:,0]>xsep-.02)
        punta=Q[sel,0].max()-.04; mcp=xsep-.25
        c0=centro(sel,xsep+.04)
        L_=punta-mcp; js=[mcp,mcp+.38*L_,mcp+.68*L_,punta]
        pts=[]
        for x in js:
            c=centro(sel,min(max(x,xsep+.04),punta-.03))
            pts.append(np.array([x,c[1],c[2]]))
        banda[f]=(lim[k],lim[k+1],mcp)
        for sgm in range(3):
            n=f'finger{f}-{sgm+1}.{l}'; HT[bi[n]]=pts[sgm]*[sx,1,1]; TT[bi[n]]=pts[sgm+1]*[sx,1,1]
        mc=bi[f'metacarpal{f-1}.{l}']; TT[mc]=pts[0]*[sx,1,1]
    # 2) pulgar: lo que queda por delante del índice
    selp=lado&(Q[:,2]>lim[4-1]+.0)&(Q[:,2]>zmax_dedos+.12)&(Q[:,0]>wx+.3)
    tp=Q[selp]; punta=tp[np.argmax(tp[:,0])].copy(); punta[0]-=.04
    cp=centro(selp,punta[0]-.08,.05); punta[1:]=cp[1:]
    escala=(Q[lado,0].max()-wx)/(9.42-7.4)
    base=W0+(HT[bi['finger1-1.'+l]]*[sx,1,1]-W0)*escala
    j1=base+(punta-base)*.4; j2=base+(punta-base)*.72
    for j in (j1,j2):
        c=centro(selp,j[0],.05)
        if c is not None: j[1:]=c[1:]
    for sgm,(p0,p1) in enumerate(((base,j1),(j1,j2),(j2,punta))):
        n=f'finger1-{sgm+1}.{l}'; HT[bi[n]]=p0*[sx,1,1]; TT[bi[n]]=p1*[sx,1,1]
    # 3) metacarpianos: salen de la muñeca (en la misma proporción que antes) hasta el nudillo de su dedo
    for m in range(1,5):
        mc=bi[f'metacarpal{m}.{l}']; HT[mc]=(W0+(HT[mc]*[sx,1,1]-W0)*escala)*[sx,1,1]
    TT[wr]=(W0+(TT[wr]*[sx,1,1]-W0)*escala)*[sx,1,1]
    # 4) pesos de la mano por distancia a cada hueso, sin mezclar dedos vecinos
    v=np.where(lado&(Q[:,0]>wx-.3))[0]; P=Q[v]
    cand=['lowerarm02','wrist']+[f'metacarpal{m}' for m in range(1,5)]+[f'finger{f}-{s_}' for f in range(1,6) for s_ in (1,2,3)]
    ids=[bi[c+'.'+l] for c in cand]
    D=np.stack([segdist(P,HT[i]*[sx,1,1],TT[i]*[sx,1,1]) for i in ids],1)
    perm=np.ones_like(D,bool)
    dedo_de=np.zeros(len(v),int)
    for f,(z0,z1,mcp) in banda.items():
        m_=(P[:,2]>z0)&(P[:,2]<=z1)&(P[:,0]>mcp+.08)&(P[:,2]<=zmax_dedos+.05); dedo_de[m_]=f
    pul=(P[:,2]>zmax_dedos+.12)&(P[:,0]>wx+.3); dedo_de[pul]=1
    for k,c in enumerate(cand):
        if c.startswith('finger'):
            f=int(c[6]); perm[:,k]&=(dedo_de==f)|((dedo_de==0)&(c.endswith('-1')))
        elif c.startswith('metacarpal'):
            f=int(c[10])+1; perm[:,k]&=(dedo_de==0)|(dedo_de==f)
        elif c=='lowerarm02': perm[:,k]&=dedo_de==0
    Wd=np.where(perm,1/(D+.03)**4,0)
    top4=np.argsort(-Wd,1)[:,:4]; w4=np.take_along_axis(Wd,top4,1); w4/=w4.sum(1,keepdims=True)
    a_=ss((P[:,0]-(wx-.3))/.4)[:,None]   # en el antebrazo se mezcla con los pesos que ya tenía
    for i_,vv in enumerate(v):
        Wv={}
        for c in range(4):
            Wv[int(top[vv][c])]=Wv.get(int(top[vv][c]),0)+(1-a_[i_,0])*tw[vv][c]
            Wv[ids[top4[i_,c]]]=Wv.get(ids[top4[i_,c]],0)+a_[i_,0]*w4[i_,c]
        k=sorted(Wv,key=lambda b_:-Wv[b_])[:4]; k+=[0]*(4-len(k)); w=np.array([Wv.get(b_,0) for b_ in k])
        top[vv]=k; tw[vv]=w/w.sum()
    print(l,'mano: vértices',len(v),'pulgar',pul.sum(),'por dedo',[(dedo_de==f).sum() for f in range(1,6)])
nn=len(Pn); uv16=np.round(np.clip(UV,0,1)*65535).astype(np.uint16)
binout=b''.join([np.round(Pn*3000).astype(np.int16).tobytes(), F.astype(np.uint16).tobytes(), top.astype(np.uint8).tobytes(), (tw*255).round().astype(np.uint8).tobytes(),
  zn.astype(np.uint8).tobytes(), np.round(bp*3000).astype(np.int16).tobytes(), q8(nbn), q8(fdn), q8(CAV), uv16.tobytes()])
bones=[{'n':b['n'],'p':b['p'],'h':HT[i].round(4).tolist(),'t':TT[i].round(4).tolist()} for i,b in enumerate(B)]
meta={'n':nn,'tris':len(F),'bones':bones,'zonas':M['zonas'],'uv':True,'texturas':True,'sinRelieve':True,
      'autor':'Harshit Prajapati','licencia':'CC BY 4.0','fuente':'https://sketchfab.com/3d-models/male-base-muscular-anatomy-0954aa04666d45aab9633009318f7b66'}
json.dump(meta,open(out+'.json','w')); open(out+'.bin','wb').write(binout)
print('listo',nn,len(F),len(binout)//1024,'KB')
