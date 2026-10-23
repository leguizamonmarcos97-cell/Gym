# Escena de estudio para los videos de ejercicios: cuerpo con esqueleto de Mixamo + animación + músculos marcados
import bpy, sys, json, math, numpy as np, mathutils
a=sys.argv[sys.argv.index('--')+1:]
cfg=json.loads(open(a[0]).read())
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
# 1) cuerpo con esqueleto
bpy.ops.import_scene.fbx(filepath=cfg['cuerpo'])
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]; arm.name='Atlas_rig'
body=[o for o in bpy.data.objects if o.type=='MESH'][0]
# 2) animación (mismo esqueleto de Mixamo: los huesos se llaman igual)
antes=set(bpy.data.objects); acc_antes=set(bpy.data.actions)
if cfg.get('anim'): bpy.ops.import_scene.fbx(filepath=cfg['anim'])
accion=([x for x in bpy.data.actions if x not in acc_antes] or [None])[0]
for o in set(bpy.data.objects)-antes: bpy.data.objects.remove(o,do_unlink=True)
arm.animation_data_create()
if accion: arm.animation_data.action=accion
else: arm.animation_data.action=None
f0,f1=[int(x) for x in accion.frame_range] if accion else (1,1); sc.frame_start=f0; sc.frame_end=f1; sc.render.fps=30
# maniquí: sin ojos y la cabeza alisada (sin cara)
import bmesh
ojos={i for i,m in enumerate(body.material_slots) if m.name!='Body_Low_SP_blinn1SG1'}
bm=bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.link_faces and all(f.material_index in ojos for f in v.link_faces)],context='VERTS')
bm.to_mesh(body.data); bm.free()
if cfg.get('brazos_frente') and accion:
    pbs=arm.pose.bones
    for f in range(f0,f1+1):
        sc.frame_set(f)
        for lado,sg in (('Left',-1),('Right',1)):
            for b in ('Arm','ForeArm','Hand'):
                pb=pbs[f'mixamorig:{lado}{b}']
                R=mathutils.Matrix.Rotation(math.radians(84*sg),4,'Y')
                M=R@pb.bone.matrix_local
                M.translation=pb.head.copy() if b=='Arm' else pbs[f'mixamorig:{lado}'+('Arm' if b=='ForeArm' else 'ForeArm')].tail.copy()
                pb.matrix=M; bpy.context.view_layer.update()
                pb.keyframe_insert('rotation_quaternion' if pb.rotation_mode=='QUATERNION' else 'rotation_euler',frame=f)
    sc.frame_set(f0)
# pies anclados: quedan fijos en el piso donde arrancan (la animación los arrastra un poco); las piernas se acomodan con IK
def medir_pies(tag):
    for f in (f0,(f0+f1)//2,f1):
        sc.frame_set(f)
        print('PIES',tag,f,[tuple(round(x,3) for x in (arm.matrix_world@arm.pose.bones[f'mixamorig:{l}Foot'].head)) for l in ('Left','Right')])
if accion: medir_pies('antes')
if cfg.get('pies_fijos',True) and accion:
    sc.frame_set(f0); bpy.context.view_layer.update()
    for l in ('Left','Right'):
        pf=arm.pose.bones[f'mixamorig:{l}Foot']
        e=bpy.data.objects.new(f'ancla_{l}',None); sc.collection.objects.link(e)
        e.matrix_world=arm.matrix_world@pf.matrix
        ik=arm.pose.bones[f'mixamorig:{l}Leg'].constraints.new('IK'); ik.target=e; ik.chain_count=2; ik.use_tail=True
        cr=pf.constraints.new('COPY_ROTATION'); cr.target=e
    bpy.context.view_layer.update()
    medir_pies('despues')
# 3) zonas musculares: del cuerpo de la app (mismo modelo, mismo orden de vértices en el original) por vecino más cercano
Z=np.load(cfg['zonas_npz']); Pz=Z['P']; zona=Z['zona']; short=Z['short']
mw=body.matrix_world; V=np.array([mw@v.co for v in body.data.vertices])
def norm(P):
    P=P-[ (P[:,0].max()+P[:,0].min())/2, (P[:,1].max()+P[:,1].min())/2, P[:,2].min()]; return P/(P[:,2].max())
Vn=norm(V); Pn=norm(np.c_[Pz[:,0],-Pz[:,2],Pz[:,1]])
I=np.zeros(len(Vn),int); D=np.zeros(len(Vn))
for i in range(0,len(Vn),2000):
    d=((Vn[i:i+2000,None,:]-Pn[None,:,:])**2).sum(-1); I[i:i+2000]=d.argmin(1); D[i:i+2000]=np.sqrt(d.min(1))
print('ZONAS dist media',D.mean(),'max',D.max(),'lejos',(D>.01).sum())
nombres=list(Z['nombres'])
inten=np.zeros(len(Vn))
for zn,v in cfg['musculos'].items(): inten=np.maximum(inten,(zona[I]==nombres.index(zn))*v)
inten[D>.01]=0
# suavizar el borde de la zona (promedio con vecinos de la malla)
vec=[[] for _ in range(len(Vn))]
for e in body.data.edges: a_,b_=e.vertices; vec[a_].append(b_); vec[b_].append(a_)
for _ in range(3): inten=np.array([(inten[i]*2+sum(inten[j] for j in vec[i]))/(2+len(vec[i])) for i in range(len(Vn))])
brazos=np.isin(zona[I],[nombres.index(z) for z in ('biceps','triceps','antebrazos','hombros')])
sh=((Vn[:,2]>cfg.get('short_bajo',.43))&(Vn[:,2]<cfg.get('short_alto',.585))&~brazos&(D<.01)).astype(float)
# las manos (zona vacía) cuelgan a la altura del short: afuera
sh[(zona[I]==0)&(np.abs(Vn[:,0])>.13)]=0
media=np.clip((cfg.get('media_alto',.075)-Vn[:,2])/.006,0,1)  # medias deportivas sobre el tobillo
sh=np.maximum(sh,media)
for _ in range(4): sh=np.array([(sh[i]*2+sum(sh[j] for j in vec[i]))/(2+len(vec[i])) for i in range(len(Vn))])
inten=inten*(1-np.clip((sh-.35)/.3,0,1))  # lo que tapa el short no brilla
brz=np.isin(zona[I],[nombres.index(z) for z in ('biceps','triceps','antebrazos','hombros')])|((zona[I]==0)&(np.abs(Vn[:,0])>.13))
fz=np.isin(zona[I],[nombres.index(z) for z in ('pecho','dorsales')]).astype(float)
for _ in range(3): fz=np.array([(fz[i]*2+sum(fz[j] for j in vec[i]))/(2+len(vec[i])) for i in range(len(Vn))])
esp=np.isin(zona[I],[nombres.index(z) for z in ('dorsales','lumbar','gluteos','trapecio')]).astype(float)
for nm,val in (('brz',brz.astype(float)),('fz',fz),('esp',esp)):
    at=body.data.attributes.new(nm,'FLOAT','POINT'); at.data.foreach_set('value',val.astype(np.float32))
for nm,val in (('musc',inten),('short',sh)):
    at=body.data.attributes.new(nm,'FLOAT','POINT'); at.data.foreach_set('value',val.astype(np.float32))
if cfg.get('maniqui'):
    # cabeza de maniquí: se saca la cabeza (cara, orejas) y se pone un huevo liso que sigue al hueso de la cabeza
    V2=np.array([body.matrix_world@v.co for v in body.data.vertices]); zmin=V2[:,2].min(); zr=(V2[:,2]-zmin)/(V2[:,2].max()-zmin)
    corte=cfg.get('corte_cabeza',.885)
    cabeza=V2[zr>corte]; c0=(cabeza.max(0)+cabeza.min(0))/2; dim=cabeza.max(0)-cabeza.min(0)
    bm=bmesh.new(); bm.from_mesh(body.data); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm,geom=[f for f in bm.faces if all(zr[v.index]>corte for v in f.verts)],context='FACES')
    bm.to_mesh(body.data); bm.free()
    alto_cab=(V2[:,2].max()-zmin)*(1-corte)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=64,ring_count=32,radius=1)
    huevo=bpy.context.object; huevo.name='cabeza_maniqui'
    for v in huevo.data.vertices:
        z=v.co.z; k=1-.12*z   # más angosto arriba, como un huevo
        v.co.x*=k; v.co.y*=k
    huevo.scale=(dim[0]*.5*.98,dim[1]*.5*.95,alto_cab*.7); huevo.location=(c0[0],c0[1]-dim[1]*.07,zmin+(V2[:,2].max()-zmin)*corte+alto_cab*.42)
    bpy.ops.object.shade_smooth()
    arm.data.pose_position='REST'; bpy.context.view_layer.update()
    hb=arm.pose.bones['mixamorig:Head']
    huevo.parent=arm; huevo.parent_type='BONE'; huevo.parent_bone='mixamorig:Head'
    huevo.matrix_world=mathutils.Matrix.Translation(huevo.matrix_world.translation)@mathutils.Matrix.Diagonal((*huevo.scale,1))
    arm.data.pose_position='POSE'; bpy.context.view_layer.update()
    print('CABEZA',c0,dim,alto_cab)
# zapatillas deportivas: modelo de zapatilla de running (Shopify, CC BY 4.0), una por pie, pegada al hueso del pie
Vr=np.array([body.matrix_world@v.co for v in body.data.vertices]); zmn=Vr[:,2].min(); hh=Vr[:,2].max()-zmn
tope=cfg.get('alto_zapa',.055)
pie=(Vr[:,2]-zmn)/hh<tope
antes_z=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=cfg['zapa'])
zap0=[o for o in set(bpy.data.objects)-antes_z if o.type=='MESH'][0]
for o in set(bpy.data.objects)-antes_z:
    if o!=zap0: bpy.data.objects.remove(o,do_unlink=True)
zap0.parent=None
Dz=np.array([v.co[:] for v in zap0.data.vertices]); zlen=np.ptp(Dz[:,0]); zc=(Dz.max(0)+Dz.min(0))/2
for v in zap0.data.vertices: v.co=mathutils.Vector(((v.co.x-zc[0])/zlen*.298,(v.co.y-zc[1])/zlen*.298,(v.co.z-Dz[:,2].min())/zlen*.298))
print('ZAPA datos',np.ptp(Dz,0).round(3))
# la lengüeta del modelo sube mucho y se para delante de la canilla: se la baja (y un poco la tirita del talón)
for v in zap0.data.vertices:
    x,z=v.co.x,v.co.z
    if -.075<x<.005 and z>.095: v.co.z=.095+(z-.095)*cfg.get('lengua_k',.2); v.co.x=x-(z-.095)*.25
    elif x<-.105 and z>.095: v.co.z=.095+(z-.095)*.55
var=bpy.data.materials.get(cfg.get('variante_zapa','phong1SG.001'))
if var: zap0.data.materials[0]=var
if cfg.get('zapa_negra',True):
    # como la foto: capellada y cordones negros, suela blanca (se separan por el brillo de la textura original)
    mt=zap0.data.materials[0].copy(); zap0.data.materials[0]=mt; nt=mt.node_tree
    bsdf=[n for n in nt.nodes if n.type=='BSDF_PRINCIPLED'][0]; ln=bsdf.inputs['Base Color'].links[0]; src=ln.from_socket
    nt.links.remove(ln)
    bw=nt.nodes.new('ShaderNodeRGBToBW'); cr=nt.nodes.new('ShaderNodeValToRGB')
    cr.color_ramp.elements[0].position=cfg.get('umbral_suela',.55); cr.color_ramp.elements[0].color=(.012,.012,.014,1)
    cr.color_ramp.elements[1].position=cfg.get('umbral_suela',.55)+.08; cr.color_ramp.elements[1].color=(.9,.9,.9,1)
    nt.links.new(src,bw.inputs[0]); nt.links.new(bw.outputs[0],cr.inputs[0]); nt.links.new(cr.outputs[0],bsdf.inputs['Base Color'])
arm.data.pose_position='REST'; bpy.context.view_layer.update()
zapas=[]
for sx in (1,-1):
    P=Vr[pie&(np.sign(Vr[:,0])==sx)]
    y0,y1=P[:,1].min(),P[:,1].max(); L_=y1-y0; cx=(P[:,0].min()+P[:,0].max())/2
    ob=zap0 if sx==1 else zap0.copy()
    if sx!=1: ob.data=zap0.data.copy(); sc.collection.objects.link(ob)
    s_=L_*cfg.get('largo_zapa',1.1)/.298
    anchoP=np.ptp(P[(P[:,2]-zmn)<.04][:,0]); sw_=anchoP*cfg.get('ancho_zapa',1.12)/(.298*.777/2.0)
    print('ZAPA ancho pie',round(anchoP,3),'escalas',round(s_,2),round(sw_,2))
    # el modelo mira a +X con la suela en z=0: se gira para que la punta mire adelante (-Y)
    ob.matrix_world=mathutils.Matrix.Translation((cx,(y0+y1)/2+L_*cfg.get('atras_zapa',.06),zmn-cfg.get('bajo_suela',.024)))@mathutils.Matrix.Rotation(math.radians(-90),4,'Z')@mathutils.Matrix.Diagonal((s_,sw_*(-1 if sx==1 else 1),s_*cfg.get('alto_zapa_k',1.1),1))
    hueso=min([b.name for b in arm.pose.bones if b.name.endswith('Foot')],key=lambda n:(arm.matrix_world@arm.pose.bones[n].head-mathutils.Vector((cx,(y0+y1)/2,zmn))).length)
    mwz=ob.matrix_world.copy(); ob.parent=arm; ob.parent_type='BONE'; ob.parent_bone=hueso; ob.matrix_world=mwz
    print('ZAPA',sx,hueso,round(L_,3))
    zapas.append(ob)
arm.data.pose_position='POSE'; bpy.context.view_layer.update()
# el pie desnudo queda adentro: se borra para que no asomen los dedos
bm=bmesh.new(); bm.from_mesh(body.data)
bmesh.ops.delete(bm,geom=[f for f in bm.faces if all((Vr[v.index,2]-zmn)/hh<cfg.get('borrar_pie',.03) for v in f.verts)],context='FACES')
bm.to_mesh(body.data); bm.free()
# 4) materiales
def mat_cuerpo():
    m=bpy.data.materials.new('Cuerpo'); m.use_nodes=True; nt=m.node_tree; N=nt.nodes; L=nt.links; N.clear()
    out=N.new('ShaderNodeOutputMaterial'); bs=N.new('ShaderNodeBsdfPrincipled')
    am=N.new('ShaderNodeAttribute'); am.attribute_name='musc'; ash=N.new('ShaderNodeAttribute'); ash.attribute_name='short'
    # fibras: líneas finas a lo largo del músculo
    tc=N.new('ShaderNodeTexCoord'); wv=N.new('ShaderNodeTexWave'); wv.wave_type='BANDS'; wv.bands_direction='X'; wv.inputs['Scale'].default_value=cfg.get('fibras',9); wv.inputs['Distortion'].default_value=3; wv.inputs['Detail'].default_value=1
    L.new(tc.outputs['Object'],wv.inputs['Vector'])
    wv2=N.new('ShaderNodeTexWave'); wv2.wave_type='BANDS'; wv2.bands_direction='Z'; wv2.inputs['Scale'].default_value=cfg.get('fibras',9); wv2.inputs['Distortion'].default_value=3; wv2.inputs['Detail'].default_value=1
    L.new(tc.outputs['Object'],wv2.inputs['Vector'])
    afz=N.new('ShaderNodeAttribute'); afz.attribute_name='fz'
    mf=N.new('ShaderNodeMix'); mf.data_type='FLOAT'; L.new(afz.outputs['Fac'],mf.inputs['Factor']); L.new(wv.outputs['Fac'],mf.inputs[2]); L.new(wv2.outputs['Fac'],mf.inputs[3])
    rojo=N.new('ShaderNodeMix'); rojo.data_type='RGBA'; rojo.inputs[6].default_value=(.55,.02,.015,1); rojo.inputs[7].default_value=(1,.32,.22,1)
    rmp=N.new('ShaderNodeMapRange'); rmp.inputs['From Min'].default_value=.55; rmp.inputs['From Max'].default_value=.9
    L.new(mf.outputs[0],rmp.inputs['Value']); L.new(rmp.outputs['Result'],rojo.inputs['Factor'])
    base=N.new('ShaderNodeMix'); base.data_type='RGBA'; base.inputs[6].default_value=(.82,.82,.84,1)
    L.new(am.outputs['Fac'],base.inputs['Factor']); L.new(rojo.outputs[2],base.inputs[7])
    negro=N.new('ShaderNodeMix'); negro.data_type='RGBA'; negro.inputs[7].default_value=(.012,.012,.014,1)
    sep=N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Generated'],sep.inputs[0])
    def rango(a,b,inv=False):
        m_=N.new('ShaderNodeMapRange'); m_.inputs['From Min'].default_value=a; m_.inputs['From Max'].default_value=b
        if inv: m_.inputs['To Min'].default_value=1; m_.inputs['To Max'].default_value=0
        L.new(sep.outputs['Z'],m_.inputs['Value']); return m_.outputs['Result']
    abajo=rango(cfg.get('short_bajo',.43)-.002,cfg.get('short_bajo',.43)+.002); arriba=rango(cfg.get('short_alto',.585)-.002,cfg.get('short_alto',.585)+.002,True)
    ab=N.new('ShaderNodeAttribute'); ab.attribute_name='brz'
    m1=N.new('ShaderNodeMath'); m1.operation='MULTIPLY'; L.new(abajo,m1.inputs[0]); L.new(arriba,m1.inputs[1])
    nb=N.new('ShaderNodeMath'); nb.operation='SUBTRACT'; nb.inputs[0].default_value=1; L.new(ab.outputs['Fac'],nb.inputs[1])
    m2=N.new('ShaderNodeMath'); m2.operation='MULTIPLY'; L.new(m1.outputs[0],m2.inputs[0]); L.new(nb.outputs[0],m2.inputs[1])
    medias=rango(cfg.get('media_alto',.075)-.002,cfg.get('media_alto',.075)+.002,True)
    mx2=N.new('ShaderNodeMath'); mx2.operation='MAXIMUM'; L.new(m2.outputs[0],mx2.inputs[0]); L.new(medias,mx2.inputs[1])
    L.new(mx2.outputs[0],negro.inputs['Factor']); L.new(base.outputs[2],negro.inputs[6])
    L.new(negro.outputs[2],bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value=.45; bs.inputs['Subsurface Weight'].default_value=.15; bs.inputs['Subsurface Scale'].default_value=.02
    # brillo: rojo suave en el músculo + borde azul (como el video de referencia)
    lw=N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value=.35
    pw=N.new('ShaderNodeMath'); pw.operation='POWER'; pw.inputs[1].default_value=2.2; L.new(lw.outputs['Facing'],pw.inputs[0])
    mb=N.new('ShaderNodeMath'); mb.operation='MULTIPLY'; L.new(pw.outputs[0],mb.inputs[0]); L.new(am.outputs['Fac'],mb.inputs[1])
    em=N.new('ShaderNodeMix'); em.data_type='RGBA'; em.inputs[6].default_value=(.9,.05,.02,1); em.inputs[7].default_value=(.15,.45,1,1)
    L.new(mb.outputs[0],em.inputs['Factor'])
    fuerza=N.new('ShaderNodeMath'); fuerza.operation='MULTIPLY_ADD'
    L.new(am.outputs['Fac'],fuerza.inputs[0]); fuerza.inputs[1].default_value=.22; L.new(mb.outputs[0],fuerza.inputs[2])
    f2=N.new('ShaderNodeMath'); f2.operation='MULTIPLY'; f2.inputs[1].default_value=cfg.get('brillo',6); L.new(fuerza.outputs[0],f2.inputs[0])
    L.new(em.outputs[2],bs.inputs['Emission Color']); L.new(f2.outputs[0],bs.inputs['Emission Strength'])
    L.new(bs.outputs[0],out.inputs[0]); return m
mc=mat_cuerpo()
body.data.materials.clear(); body.data.materials.append(mc)
if cfg.get('maniqui'): huevo.data.materials.append(mc)
for p in body.data.polygons: p.material_index=0
for p in body.data.polygons: p.use_smooth=True
# 5) estudio: piso oscuro brillante, fondo negro azulado, tiras de luz
w=bpy.data.worlds.new('w'); sc.world=w; w.use_nodes=True; w.node_tree.nodes['Background'].inputs[0].default_value=(.004,.005,.009,1)
sc.frame_set(f0); bpy.context.view_layer.update()
dg=bpy.context.evaluated_depsgraph_get(); zpiso=min((o.matrix_world@v.co).z for o in zapas for v in o.evaluated_get(dg).data.vertices)
print('PISO',zpiso)
bpy.ops.mesh.primitive_plane_add(size=40,location=(0,0,zpiso)); piso=bpy.context.object
pm=bpy.data.materials.new('Piso'); pm.use_nodes=True; pb=pm.node_tree.nodes['Principled BSDF']; pb.inputs['Base Color'].default_value=(.02,.022,.03,1); pb.inputs['Roughness'].default_value=.28; piso.data.materials.append(pm)
for i,x in enumerate((-2.6,-1.3,1.3,2.6)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(x,4.5,1.6)); t=bpy.context.object; t.scale=(.025,.025,3.2)
    tm=bpy.data.materials.new('tira'); tm.use_nodes=True; tn=tm.node_tree.nodes; tn.remove(tn['Principled BSDF']); e=tn.new('ShaderNodeEmission'); e.inputs[0].default_value=(.3,.55,1,1); e.inputs[1].default_value=6
    tm.node_tree.links.new(e.outputs[0],tn['Material Output'].inputs[0]); t.data.materials.append(tm); t.visible_shadow=False
def luz(nom,tipo,loc,rot,energia,color,tam=1):
    l=bpy.data.lights.new(nom,tipo); l.energy=energia; l.color=color
    if tipo=='AREA': l.size=tam
    o=bpy.data.objects.new(nom,l); sc.collection.objects.link(o); o.location=loc; o.rotation_euler=[math.radians(x) for x in rot]; return o
luz('clave','AREA',(-2.2,-3.0,3.6),(55,0,-35),900,(1,.97,.92),2.2)
luz('relleno','AREA',(3,-2.5,1.8),(70,0,50),180,(.85,.9,1),3)
luz('borde_izq','AREA',(-2.5,2.6,2.6),(-60,0,-140),700,(.35,.55,1),1.2)
luz('borde_der','AREA',(2.5,2.6,2.6),(-60,0,140),700,(.35,.55,1),1.2)
# 6) cámara vertical 9:16, tres cuartos de frente
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.data.lens=cfg.get('lente',50)
az=math.radians(cfg.get('az',30)); dist=cfg.get('dist',6.2); h=cfg.get('alto_cam',1.05)
cam.location=(dist*math.sin(az),-dist*math.cos(az),h)
mira=mathutils.Vector((0,0,cfg.get('mira',.92)))
cam.rotation_euler=(mira-cam.location).to_track_quat('-Z','Y').to_euler()
# 7) render
sc.render.engine='CYCLES'; sc.cycles.device='CPU'; sc.cycles.samples=cfg.get('muestras',32); sc.cycles.use_denoising=True
sc.render.resolution_x=cfg.get('ancho',720); sc.render.resolution_y=cfg.get('altoimg',1280)
sc.view_settings.view_transform='AgX'; sc.view_settings.look='AgX - Punchy'
# resplandor (bloom) en el compositor
sc.use_nodes=True; ct=sc.node_tree; rl=ct.nodes['Render Layers']; co=ct.nodes['Composite']
g=ct.nodes.new('CompositorNodeGlare'); g.glare_type='FOG_GLOW'; g.threshold=cfg.get('umbral',1.6); g.size=8; g.mix=-.6
ct.links.new(rl.outputs['Image'],g.inputs['Image']); ct.links.new(g.outputs['Image'],co.inputs['Image'])
bpy.ops.wm.save_as_mainfile(filepath=cfg['blend'])
for f in cfg.get('cuadros',[]):
    sc.frame_set(f); sc.render.filepath=f"{cfg['salida']}{f:04d}.png"; bpy.ops.render.render(write_still=True)
# ---- fotos de ejercicios: pose de la app (inicio y final) ----
if cfg.get('pose_json'):
    exec(open(cfg['pose_mh']).read())
    PJ=json.load(open(cfg['pose_json']))
    col=bpy.data.collections.new('aparatos'); sc.collection.children.link(col)
    escala=hh/17.42
    cfg_ik[0]=cfg.get('ik'); cfg_dbg.update(cfg.get('dbg',{}))
    for i,pz in enumerate(PJ['poses']):
        pz['t']=i
        for pb in arm.pose.bones:
            for c_ in list(pb.constraints):
                if c_.name=='IKX': pb.constraints.remove(c_)
        mp=ajustar_pose(arm,pz,escala,zpiso,zapas); aparatos(pz,mp,arm,col)
        c=PJ['cam']; m3=c['mira']; d=c['dist']*cfg.get('zoom',1.0); el=cfg.get('el',c['el']); az=cfg.get('az',c['az']+cfg.get('giro',0))
        p3=[m3[0]+math.sin(az)*d, m3[1]+d*math.sin(el), m3[2]+math.cos(az)*d]
        cam.location=mp(p3); mira_b=mp(m3)
        if cfg.get('mira_hueso'):
            mira_b=arm.matrix_world@arm.pose.bones[cfg['mira_hueso']].head; cam.location=mira_b+(cam.location-mp(m3)).normalized()*cfg.get('dist_hueso',.6)
        cam.rotation_euler=(mira_b-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.sensor_fit='VERTICAL'; cam.data.angle_y=math.radians(32)
        sc.render.filepath=f"{cfg['salida']}{i}.png"; bpy.ops.render.render(write_still=True)

# ---- fotos con captura de movimiento real (Rokoko) ----
V3=mathutils.Vector
if cfg.get('rk_npz'):
    exec(open(cfg['pose_rk']).read())
    col=bpy.data.collections.new('aparatos'); sc.collection.children.link(col)
    for i,fr in enumerate(cfg['rk_cuadros']):
        BAJAR.clear(); CODO_VERTICAL[0]=i in cfg.get('codo_vertical',[]); P=pose_rk(arm,fr,cfg.get('rk_escala',1.06),zpiso)
        gL=agarre(arm,'Left'); gR=agarre(arm,'Right'); cen=(gL+gR)/2; eje=(gL-gR).normalized()
        if cfg.get('ancho_agarre'):
            for it in range(3):
                d_=(cfg['ancho_agarre']-(gL-gR).length)/2
                if abs(d_)<.005: break
                BAJAR['Left']=BAJAR.get('Left',V3())+eje*d_; BAJAR['Right']=BAJAR.get('Right',V3())-eje*d_
                P=pose_rk(arm,fr,cfg.get('rk_escala',1.06),zpiso); gL=agarre(arm,'Left'); gR=agarre(arm,'Right'); cen=(gL+gR)/2; eje=(gL-gR).normalized()
            print('RKPOSE agarre',round((gL-gR).length,3))
        if i in cfg.get('toca_pecho',[]) and cfg.get('hacia_pies',0):
            mw_=arm.matrix_world; pb_=arm.pose.bones; ej_=(mw_@pb_['mixamorig:Head'].head-mw_@pb_['mixamorig:Hips'].head); ej_.z=0; ej_.normalize()
            for L in ('Left','Right'): BAJAR[L]=BAJAR.get(L,V3())-ej_*cfg['hacia_pies']
            P=pose_rk(arm,fr,cfg.get('rk_escala',1.06),zpiso); gL=agarre(arm,'Left'); gR=agarre(arm,'Right'); cen=(gL+gR)/2; eje=(gL-gR).normalized()
        if i in cfg.get('toca_pecho',[]):
            for it in range(3):
                zp=pecho_bajo_barra(body,cen,eje)
                if zp is None: break
                gap=cen.z-(zp+.0145+cfg.get('holgura',.004))
                print('RKPOSE hueco barra-pecho',round(gap,3))
                if abs(gap)<.004: break
                for L in ('Left','Right'): BAJAR[L]=BAJAR.get(L,V3())+V3((0,0,-gap))
                P=pose_rk(arm,fr,cfg.get('rk_escala',1.06),zpiso)
                gL=agarre(arm,'Left'); gR=agarre(arm,'Right'); cen=(gL+gR)/2; eje=(gL-gR).normalized()
        cen,eje=barra(col,gL,gR)
        banco(col,arm,body,zpiso)
        mw=arm.matrix_world; pb=arm.pose.bones
        cab=mw@pb['mixamorig:Head'].head; cad=mw@pb['mixamorig:Hips'].head; ejeb=(cab-cad); ejeb.z=0; ejeb.normalize()
        lat=V3((0,0,1)).cross(ejeb).normalized()*cfg.get('lado',1)
        foco=(mw@pb['mixamorig:Spine2'].head).lerp(mw@pb['mixamorig:LeftLeg'].head,cfg.get('foco_pies',0)); foco.z+=cfg.get('foco_z',.15)
        a=math.radians(cfg.get('cam_ang',35)); d=cfg.get('cam_dist',3.0)
        cam.location=foco+(lat*math.cos(a)-ejeb*math.sin(a))*d+V3((0,0,cfg.get('cam_alto',1.3)))
        cam.rotation_euler=(foco-cam.location).to_track_quat('-Z','Y').to_euler()
        cam.data.sensor_fit='VERTICAL'; cam.data.angle_y=math.radians(cfg.get('fov',32))
        print('RKPOSE',i,fr,'barra',tuple(round(x,3) for x in cen),'manos sep',round((gL-gR).length,3))
        sc.render.filepath=f"{cfg['salida']}{i}.png"; bpy.ops.render.render(write_still=True)
