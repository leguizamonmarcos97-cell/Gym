# Figura de cuerpo (perfil): malla de MakeHuman renderizada en Blender con luz de estudio
import bpy, sys, json, math, numpy as np, mathutils
a=sys.argv[sys.argv.index('--')+1:]
datos, tex, salida, sexo = a[0], a[1], a[2], a[3]
OSL=a[6] if len(a)>6 else ''
ancho=int(a[4]) if len(a)>4 else 640; muestras=int(a[5]) if len(a)>5 else 64
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
d=json.load(open(datos))
def img(n):
    try: return bpy.data.images.load(f'{tex}/{n}')
    except Exception: return None
def malla(nombre,p):
    P=np.array(p['pos']).reshape(-1,3); I=np.array(p['idx']).reshape(-1,3); U=np.array(p['uv']).reshape(-1,2)
    V=[(x,-z,y) for x,y,z in P]
    me=bpy.data.meshes.new(nombre); me.from_pydata(V,[],I.tolist()); me.update()
    uvl=me.uv_layers.new(name='UV'); lu=np.array([U[li.vertex_index] for li in me.loops]).ravel(); uvl.data.foreach_set('uv',lu)
    for f in me.polygons: f.use_smooth=True
    ob=bpy.data.objects.new(nombre,me); sc.collection.objects.link(ob); return ob,me
def mat(nombre,imagen=None,alfa=False,color=(.8,.8,.8,1),rough=.5,sss=0):
    m=bpy.data.materials.new(nombre); m.use_nodes=True; nt=m.node_tree; b=nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value=rough; b.inputs['Base Color'].default_value=color
    if sss: b.inputs['Subsurface Weight'].default_value=sss; b.inputs['Subsurface Radius'].default_value=(1,.35,.2); b.inputs['Subsurface Scale'].default_value=.08
    if imagen:
        t=nt.nodes.new('ShaderNodeTexImage'); t.image=imagen
        nt.links.new(t.outputs['Color'],b.inputs['Base Color'])
        if alfa: nt.links.new(t.outputs['Alpha'],b.inputs['Alpha']); m.blend_method='HASHED' if hasattr(m,'blend_method') else None
    return m,nt,b
# cuerpo con piel; ropa y marcas de músculo calculadas por píxel (OSL) desde la posición en la malla base
ob,me=malla('cuerpo',d['body'])
B=np.array(d['body']['b']).reshape(-1,3)
at=me.attributes.new('b','FLOAT_VECTOR','POINT'); at.data.foreach_set('vector',B.astype(np.float32).ravel())
piel,nt,bp=mat('piel',img(f'skin_{sexo}.png'),rough=.48,sss=.25)
tx=[n for n in nt.nodes if n.type=='TEX_IMAGE'][0]
ab=nt.nodes.new('ShaderNodeAttribute'); ab.attribute_name='b'
# --- pequeñas funciones que arman nodos de matemática (mismo cálculo que el shader de la versión web) ---
def M(op,a_,b_=None,c_=None):
    n=nt.nodes.new('ShaderNodeMath'); n.operation=op
    for i,v in enumerate((a_,b_,c_)):
        if v is None: continue
        if isinstance(v,(int,float)): n.inputs[i].default_value=v
        else: nt.links.new(v,n.inputs[i])
    return n.outputs[0]
def SS(e0,e1,x):
    n=nt.nodes.new('ShaderNodeMapRange'); n.interpolation_type='SMOOTHSTEP'; n.clamp=True
    n.inputs['From Min'].default_value=e0; n.inputs['From Max'].default_value=e1; nt.links.new(x,n.inputs['Value']); return n.outputs['Result']
def GS(dd,w): return M('EXPONENT',M('MULTIPLY',M('POWER',M('DIVIDE',dd,w),2),-1))
uno_menos=lambda x: M('SUBTRACT',1,x)
sep=nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(ab.outputs['Vector'],sep.inputs[0])
AX=M('ABSOLUTE',sep.outputs['X']); Y=sep.outputs['Y']; FR=SS(.6,1.0,sep.outputs['Z'])
ABZ=M('MULTIPLY',M('MULTIPLY',FR,uno_menos(SS(.72,.95,AX))),M('MULTIPLY',SS(1.25,1.55,Y),uno_menos(SS(3.25,3.45,Y))))
O=M('MULTIPLY',GS(AX,.06),ABZ)
def linea(c,k,w): return GS(M('SUBTRACT',M('SUBTRACT',Y,c),M('MULTIPLY',AX,k)),w)
t3=M('ADD',M('ADD',linea(2.25,.06,.065),linea(2.78,.05,.065)),linea(3.22,.04,.06))
O=M('ADD',O,M('MULTIPLY',M('MULTIPLY',t3,ABZ),uno_menos(SS(.62,.8,AX))))
if sexo=='h':
    PC=M('MULTIPLY',M('MULTIPLY',FR,SS(.12,.3,AX)),uno_menos(SS(1.35,1.6,AX)))
    curva=M('ADD',3.36,M('MULTIPLY',.22,M('POWER',M('MAXIMUM',M('SUBTRACT',AX,.2),0),2)))
    O=M('ADD',O,M('MULTIPLY',GS(M('SUBTRACT',Y,curva),.07),PC))
# oblicuo: distancia al segmento (1.02,1.75)-(0.42,0.55)
cx=nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(AX,cx.inputs['X']); nt.links.new(Y,cx.inputs['Y'])
pa=nt.nodes.new('ShaderNodeVectorMath'); pa.operation='SUBTRACT'; nt.links.new(cx.outputs[0],pa.inputs[0]); pa.inputs[1].default_value=(1.02,1.75,0)
ba=mathutils.Vector((.42-1.02,.55-1.75,0)); hh_=M('MINIMUM',M('MAXIMUM',M('DIVIDE',M('ADD',M('MULTIPLY',nt.nodes.new('ShaderNodeSeparateXYZ').outputs[0] if False else M('ADD',0,0),0),0),1),0),1)
dotn=nt.nodes.new('ShaderNodeVectorMath'); dotn.operation='DOT_PRODUCT'; nt.links.new(pa.outputs[0],dotn.inputs[0]); dotn.inputs[1].default_value=ba
hn=M('MINIMUM',M('MAXIMUM',M('DIVIDE',dotn.outputs['Value'],ba.length_squared),0),1)
sc_=nt.nodes.new('ShaderNodeVectorMath'); sc_.operation='SCALE'; sc_.inputs[0].default_value=ba; nt.links.new(hn,sc_.inputs['Scale'])
df=nt.nodes.new('ShaderNodeVectorMath'); df.operation='SUBTRACT'; nt.links.new(pa.outputs[0],df.inputs[0]); nt.links.new(sc_.outputs[0],df.inputs[1])
ln=nt.nodes.new('ShaderNodeVectorMath'); ln.operation='LENGTH'; nt.links.new(df.outputs[0],ln.inputs[0])
O=M('ADD',O,M('MULTIPLY',M('MULTIPLY',GS(ln.outputs['Value'],.06),FR),SS(.6,.9,Y)))
SURCO=O; REL=M('SUBTRACT',M('MULTIPLY',ABZ,.6),O)
SHORT=M('MULTIPLY',M('MULTIPLY',SS(-3.05,-2.99,Y),uno_menos(SS(.97,1.03,Y))),uno_menos(SS(2.22,2.28,AX)))
TOP=M('MULTIPLY',M('MULTIPLY',SS(3.27,3.33,Y),uno_menos(SS(5.02,5.08,Y))),uno_menos(SS(1.87,1.93,AX))) if sexo=='m' else M('ADD',0,0)
class _O: pass
osl=_O(); osl.outputs={'Surco':SURCO,'Rel':REL,'Short':SHORT,'Top':TOP}
DEF=float(d.get('def',0))
tint=nt.nodes.new('ShaderNodeMix'); tint.data_type='RGBA'; tint.blend_type='MULTIPLY'; tint.inputs['Factor'].default_value=1; tint.inputs[7].default_value=(1,.93,.88,1)
nt.links.new(tx.outputs['Color'],tint.inputs[6])
# surcos un poco más oscuros
os_=nt.nodes.new('ShaderNodeMath'); os_.operation='MULTIPLY'; os_.inputs[1].default_value=DEF*.07; nt.links.new(osl.outputs['Surco'],os_.inputs[0])
cl=nt.nodes.new('ShaderNodeMath'); cl.operation='MINIMUM'; cl.inputs[1].default_value=.35; nt.links.new(os_.outputs[0],cl.inputs[0])
osc=nt.nodes.new('ShaderNodeMix'); osc.data_type='RGBA'; osc.inputs[7].default_value=(.35,.24,.2,1)
nt.links.new(cl.outputs[0],osc.inputs['Factor']); nt.links.new(tint.outputs[2],osc.inputs[6])
m1=nt.nodes.new('ShaderNodeMix'); m1.data_type='RGBA'; m1.inputs[7].default_value=(.025,.028,.033,1)
nt.links.new(osc.outputs[2],m1.inputs[6]); nt.links.new(osl.outputs['Short'],m1.inputs['Factor'])
m2=nt.nodes.new('ShaderNodeMix'); m2.data_type='RGBA'; m2.inputs[7].default_value=(.03,.06,.12,1)
nt.links.new(m1.outputs[2],m2.inputs[6]); nt.links.new(osl.outputs['Top'],m2.inputs['Factor'])
nt.links.new(m2.outputs[2],bp.inputs['Base Color'])
ropa=nt.nodes.new('ShaderNodeMath'); ropa.operation='MAXIMUM'; nt.links.new(osl.outputs['Short'],ropa.inputs[0]); nt.links.new(osl.outputs['Top'],ropa.inputs[1])
inv=nt.nodes.new('ShaderNodeMath'); inv.operation='SUBTRACT'; inv.inputs[0].default_value=1; nt.links.new(ropa.outputs[0],inv.inputs[1])
ss=nt.nodes.new('ShaderNodeMath'); ss.operation='MULTIPLY'; ss.inputs[1].default_value=.25; nt.links.new(inv.outputs[0],ss.inputs[0]); nt.links.new(ss.outputs[0],bp.inputs['Subsurface Weight'])
rg=nt.nodes.new('ShaderNodeMapRange'); rg.inputs['To Min'].default_value=.48; rg.inputs['To Max'].default_value=.92; nt.links.new(ropa.outputs[0],rg.inputs['Value']); nt.links.new(rg.outputs['Result'],bp.inputs['Roughness'])
# relieve (bump) de abdominales y pecho
rl=nt.nodes.new('ShaderNodeMath'); rl.operation='MULTIPLY'; rl.inputs[1].default_value=inv and 1; nt.links.new(osl.outputs['Rel'],rl.inputs[0]); nt.links.new(inv.outputs[0],rl.inputs[1])
bump=nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value=min(.6,DEF*.55); bump.inputs['Distance'].default_value=.06
nt.links.new(rl.outputs[0],bump.inputs['Height']); nt.links.new(bump.outputs['Normal'],bp.inputs['Normal'])
me.materials.append(piel)
sub=ob.modifiers.new('sub','SUBSURF'); sub.levels=0; sub.render_levels=1
for k,t,al,col,ro in (('hair',f'hair_{sexo}.png',True,(.25,.17,.11,1),.6),('brows','brows.png',True,(.2,.14,.1,1),.7),('lashes','lashes.png',True,(.05,.05,.05,1),.7),('eyes','eye.png',False,(1,1,1,1),.2)):
    if k in d and d[k]['idx']:
        o,m=malla(k,d[k]); mm,nn,bb=mat(k,img(t),al,col,ro)
        if k=='hair':
            # el pelo de MakeHuman es una textura gris: se tiñe castaño oscuro
            tt=[n for n in nn.nodes if n.type=='TEX_IMAGE'][0]
            mix=nn.nodes.new('ShaderNodeMix'); mix.data_type='RGBA'; mix.blend_type='MULTIPLY'; mix.inputs['Factor'].default_value=1; mix.inputs[7].default_value=(.32,.22,.15,1)
            nn.links.new(tt.outputs['Color'],mix.inputs[6]); nn.links.new(mix.outputs[2],bb.inputs['Base Color'])
        m.materials.append(mm)
# luces de estudio: clave alta al costado, relleno suave y dos contraluces
def luz(n,loc,rot,e,col=(1,1,1),tam=4):
    l=bpy.data.lights.new(n,'AREA'); l.energy=e; l.color=col; l.size=tam
    o=bpy.data.objects.new(n,l); sc.collection.objects.link(o); o.location=loc; o.rotation_euler=[math.radians(x) for x in rot]
luz('clave',(-9,-16,15),(50,0,-30),9000,(1,.96,.9),6)
luz('relleno',(12,-14,4),(75,0,40),2600,(.9,.94,1),8)
luz('borde1',(9,10,10),(-55,0,140),5000,(1,1,1),3)
luz('borde2',(-9,10,8),(-60,0,-140),4200,(1,1,1),3)
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(.02,.02,.025,1)
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=25.4; cam.location=(0,-40,.2); cam.rotation_euler=(math.radians(90),0,0)
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.shading_system=True; sc.cycles.samples=muestras; sc.cycles.use_denoising=True
sc.render.film_transparent=True
sc.render.resolution_x=ancho; sc.render.resolution_y=int(ancho*867/320)
cam.data.sensor_fit='VERTICAL'
sc.view_settings.view_transform='AgX'; sc.view_settings.look='AgX - Medium High Contrast'
sc.render.image_settings.color_mode='RGBA'
sc.render.filepath=salida; bpy.ops.render.render(write_still=True)
