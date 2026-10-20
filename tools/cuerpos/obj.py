import numpy as np
def load_obj(path, group=None):
    V=[];VT=[];F=[];cur=None
    for l in open(path):
        if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
        elif l.startswith('vt '): VT.append([float(x) for x in l.split()[1:3]])
        elif l.startswith('g '): cur=l.split()[1].strip()
        elif l.startswith('usemtl'): pass
        elif l.startswith('f '):
            if group and cur!=group: continue
            F.append([tuple(int(t)-1 if t else -1 for t in (p.split('/')+[''])[:2]) for p in l.split()[1:]])
    return np.array(V),np.array(VT) if VT else None,F
