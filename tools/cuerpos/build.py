import numpy as np, json, sys, os
from obj import load_obj
T='mhrepo/makehuman/data/targets/'
V0,VT,F=load_obj('mhrepo/makehuman/data/3dobjs/base.obj','body')
_cache={}
def target(name):
    if name not in _cache:
        idx=[];d=[]
        for l in open(T+name+'.target'):
            if l[0]=='#' or not l.strip(): continue
            p=l.split(); idx.append(int(p[0])); d.append([float(x) for x in p[1:4]])
        _cache[name]=(np.array(idx,dtype=int),np.array(d).reshape(-1,3))
    return _cache[name]
def tri(v):  # pesos min/average/max para un valor 0..1 (0,5 = promedio); permite extrapolar >1
    if v<.5: return {'min':(.5-v)*2,'average':v*2}
    return {'average':max(0,1-(v-.5)*2),'max':(v-.5)*2}
def morph(g, mus, wei, extra):
    V=V0.copy()
    gw={'female':1-g,'male':g}
    for gn,gv in gw.items():
        if gv<=0: continue
        for mn,mv in tri(mus).items():
            for wn,wv in tri(wei).items():
                w=gv*mv*wv
                if w<=0: continue
                i,d=target(f'macrodetails/universal-{gn}-young-{mn}muscle-{wn}weight'); V[i]+=w*d
        for race,rv in (('caucasian',.7),('asian',.15),('african',.15)):
            i,d=target(f'macrodetails/{race}-{gn}-young'); V[i]+=gv*rv*d
    for name,w in extra.items():
        i,d=target(name); V[i]+=w*d
    return V
SH=np.array([1.68,5.25,.15]); HAND=np.array([4.31,2.45,1.76])
def smooth(a,b,x): t=np.clip((x-a)/(b-a),0,1); return t*t*(3-2*t)
JG={}
_cur=None
for _l in open('mhrepo/makehuman/data/3dobjs/base.obj'):
    if _l.startswith('g '): _cur=_l.split()[1]
    elif _l.startswith('f ') and _cur in ('joint-l-shoulder','joint-r-shoulder','joint-l-hand','joint-r-hand'):
        JG.setdefault(_cur,set()).update(int(p.split('/')[0])-1 for p in _l.split()[1:])
JG={k:sorted(v) for k,v in JG.items()}
def pesos_brazo(sg):
    s=V0[JG['joint-%s-shoulder'%('l' if sg>0 else 'r')]].mean(0); h=V0[JG['joint-%s-hand'%('l' if sg>0 else 'r')]].mean(0)
    d=(h-s)[:2]; d/=np.linalg.norm(d)
    rel=V0[:,:2]-s[:2]; t=rel@d; perp=np.abs(rel[:,0]*d[1]-rel[:,1]*d[0])
    lim=np.where(t>1.2,1.0,.62)
    return smooth(-.35,.5,t)*(1-smooth(lim,lim+.35,perp))*(V0[:,0]*sg>0.9)
WB={sg:pesos_brazo(sg) for sg in (1,-1)}
def bajar_brazos(V, margen):
    # Rota cada brazo alrededor del hombro para que cuelgue al costado del cuerpo, con transición suave en el hombro
    V=V.copy()
    tronco=(WB[1]<.01)&(WB[-1]<.01)
    for sg in (1,-1):
        w=WB[sg]; lado='l' if sg>0 else 'r'
        s=V[JG['joint-%s-shoulder'%lado]].mean(0); h=V[JG['joint-%s-hand'%lado]].mean(0)
        zona=tronco&(V[:,1]>h[1]-.4)&(V[:,1]<h[1]+.6)&(V[:,0]*sg>0)
        cad=np.abs(V[zona,0]).max()
        cur=np.arctan2(abs(h[0]-s[0]),s[1]-h[1]); want=np.arctan2(max(.05,cad+margen-abs(s[0])),s[1]-h[1])
        ang=(cur-want)*sg*w
        P=V[:,:2]-s[:2]; c,sn=np.cos(ang),np.sin(ang)
        x=P[:,0]*c+P[:,1]*sn; y=-P[:,0]*sn+P[:,1]*c
        V[:,0]=np.where(w>0,x+s[0],V[:,0]); V[:,1]=np.where(w>0,y+s[1],V[:,1])
    return V
def mhclo(path, V):
    sc={};refs=[];inv=False
    for l in open(path):
        p=l.split()
        if not p or p[0]=='#': continue
        if p[0] in('x_scale','y_scale','z_scale'): sc[p[0][0]]=(int(p[1]),int(p[2]),float(p[3]))
        elif p[0]=='verts': inv=True; continue
        elif inv and len(p) in (1,9) and all(x.replace('.','',1).replace('-','',1).replace('e','',1).isdigit() for x in p): refs.append(p)
        elif inv and refs and p[0] in ('weights','delete_verts','material'): inv=p[0]=='material'
    s=np.array([abs(V[sc[a][0]][k]-V[sc[a][1]][k])/sc[a][2] if a in sc else 1 for k,a in enumerate('xyz')])
    out=[]
    for p in refs:
        if len(p)==1: out.append(V[int(p[0])])
        else:
            i=[int(x) for x in p[:3]]; w=[float(x) for x in p[3:6]]; o=np.array([float(x) for x in p[6:9]])
            out.append(w[0]*V[i[0]]+w[1]*V[i[1]]+w[2]*V[i[2]]+o*s)
    return np.array(out)
BODYMAP=[]
def flatten(P, UV, faces, keep=None):
    pos=[];uv=[];idx=[];m={}
    if P is not None and len(P)==len(V0): BODYMAP.clear()
    def vid(a,b):
        k=(a,b)
        if k not in m:
            m[k]=len(pos)//3
            if len(P)==len(V0): BODYMAP.append(k)
            pos.extend(P[a].round(4).tolist()); uv.extend((UV[b] if b>=0 else [0,0]).round(4).tolist() if UV is not None else [0,0])
        return m[k]
    for fi,f in enumerate(faces):
        if keep is not None and not keep(fi): continue
        ids=[vid(a,b) for a,b in f]
        for k in range(1,len(ids)-1): idx.extend([ids[0],ids[k],ids[k+1]])
    return {'pos':pos,'uv':uv,'idx':idx}
PROX={}
def proxy(name, objp, clop):
    if name not in PROX: PROX[name]=load_obj(objp)
    PV,PT,PF=PROX[name]; return PV,PT,PF,clop
# Short / top: caras según su centro en la malla base
cent=np.array([V0[[a for a,b in f]].mean(0) for f in F])
def build(sexo, mus, wei, extra, hair):
    g=1 if sexo=='h' else 0
    V=bajar_brazos(morph(g,mus,wei,extra), .5 if sexo=='h' else .75)
    y=cent[:,1]; x=np.abs(cent[:,0])
    lower=(y<1.2)&(y>-3.3)&(x<2.25)   # short (cadera a mitad de muslo), sin brazos/manos
    res={'body':flatten(V,VT,F)}
    res['body']['b']=[round(x,3) for a,b in BODYMAP for x in V0[a]]
    A='a/'
    for key,o,c in [('hair',f'{A}hair/{hair}/{hair}.obj',f'{A}hair/{hair}/{hair}.mhclo'),('brows',f'{A}eyebrows/eyebrow001/eyebrow001.obj',f'{A}eyebrows/eyebrow001/eyebrow001.mhclo'),('lashes',f'{A}eyelashes/eyelashes01/eyelashes01.obj',f'{A}eyelashes/eyelashes01/eyelashes01.mhclo'),('eyes',f'{A}eyes/high-poly/high-poly.obj',f'{A}eyes/high-poly/high-poly.mhclo')]:
        PV,PT,PF=load_obj(o); PP=mhclo(c,V)
        keep=None
        if key=='eyes': keep=lambda i,PT=PT,PF=PF: not (PT[[b for a,b in PF[i]]].mean(0)[0]>.8 and PT[[b for a,b in PF[i]]].mean(0)[1]<.2)
        res[key]=flatten(PP,PT,PF,keep)
    if sexo=='m':
        A='a/clothes/female_sportsuit01/female_sportsuit01'
        PV,PT,PF=load_obj(A+'.obj'); PP=mhclo(A+'.mhclo',V); PB=mhclo(A+'.mhclo',V0)
        res['top']=flatten(PP,PT,PF,lambda i: PB[[a for a,b in PF[i]]][:,1].min()>1.7)
    return res
if __name__=='__main__':
    print(cent[:,1].min(), cent[:,1].max())
