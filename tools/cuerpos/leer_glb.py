# Lee el cuerpo del GLB (con las transformaciones de los nodos) y guarda posiciones, normales, UV, índices y texturas
import struct, json, sys, numpy as np
f=open(sys.argv[1],'rb').read(); cl=struct.unpack('<I',f[12:16])[0]; j=json.loads(f[20:20+cl])
bin_off=20+cl+8; BIN=f[bin_off:]
def acc(i):
    a=j['accessors'][i]; bv=j['bufferViews'][a['bufferView']]
    tipos={5126:np.float32,5123:np.uint16,5125:np.uint32,5121:np.uint8}; n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    off=bv.get('byteOffset',0)+a.get('byteOffset',0); dt=tipos[a['componentType']]
    arr=np.frombuffer(BIN, dtype=dt, count=a['count']*n, offset=off)
    return arr.reshape(a['count'],n) if n>1 else arr
def mat(n):
    if 'matrix' in n: return np.array(n['matrix']).reshape(4,4).T
    M=np.eye(4)
    if 'scale' in n: M=np.diag(list(n['scale'])+[1])@M
    if 'rotation' in n:
        x,y,z,w=n['rotation']; R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]])
        T=np.eye(4); T[:3,:3]=R; M=T@M
    if 'translation' in n: T=np.eye(4); T[:3,3]=n['translation']; M=T@M
    return M
mundo={}
def rec(i,P):
    M=P@mat(j['nodes'][i]); mundo[i]=M
    for c in j['nodes'][i].get('children',[]): rec(c,M)
for r in j['scenes'][0]['nodes']: rec(r,np.eye(4))
out={}
for ni,n in enumerate(j['nodes']):
    if 'mesh' not in n: continue
    m=j['meshes'][n['mesh']]
    if 'body' not in m['name']: continue
    p=m['primitives'][0]; M=mundo[ni]
    P=acc(p['attributes']['POSITION']).astype(np.float64); P=(np.c_[P,np.ones(len(P))]@M.T)[:,:3]
    N=acc(p['attributes']['NORMAL']).astype(np.float64); N=N@np.linalg.inv(M[:3,:3]).T; N/=np.linalg.norm(N,axis=1,keepdims=True)
    UV=acc(p['attributes']['TEXCOORD_0']).astype(np.float64); I=acc(p['indices']).astype(np.int64).reshape(-1,3)
    out=dict(P=P,N=N,UV=UV,I=I)
    mt=j['materials'][p['material']]
    texs={'normal':mt['normalTexture']['index'],'ao':mt['occlusionTexture']['index'],'color':mt['pbrMetallicRoughness']['baseColorTexture']['index']}
    for k,ti in texs.items():
        im=j['images'][j['textures'][ti]['source']]; bv=j['bufferViews'][im['bufferView']]
        open(sys.argv[2]+f'/tex_{k}.'+('png' if 'png' in im['mimeType'] else 'jpg'),'wb').write(BIN[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']])
np.savez(sys.argv[2]+'/cuerpo_nuevo.npz',**out)
P=out['P']; print('verts',len(P),'tris',len(out['I']),'min',P.min(0).round(3),'max',P.max(0).round(3))
