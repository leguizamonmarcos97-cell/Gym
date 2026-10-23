# Pone el cuerpo de Mixamo en un cuadro de una captura de movimiento de Rokoko (huesos por dirección + giro) y arma barra y banco
import bpy, mathutils, math, numpy as np
V3=mathutils.Vector
BAJAR={}
CODO_VERTICAL=[False]
RK=np.load(cfg['rk_npz']); RKn=list(RK['nombres']); RKt=list(RK['tips']); RKf=list(RK['frames'])
def pose_rk(arm, fr, escala, zpiso):
    i=RKf.index(min(RKf,key=lambda x:abs(x-fr)))
    Hh=RK['H'][i]; Tt=RK['T'][i]
    mw=arm.matrix_world; mwi=mw.inverted(); R3=mwi.to_3x3(); pbs=arm.pose.bones
    piso_rk=min(Hh[RKn.index('LeftFoot'),2],Hh[RKn.index('RightFoot'),2])
    def P(n):
        p=Tt[RKt.index(n)] if n in RKt else Hh[RKn.index(n)]
        return V3((p[0]*escala,p[1]*escala,(p[2]-piso_rk)*escala+zpiso+cfg.get('pie_alto',.075)))
    for pb in pbs: pb.matrix_basis=mathutils.Matrix.Identity(4)
    bpy.context.view_layer.update()
    W=lambda n: mw@pbs['mixamorig:'+n].head
    Wt=lambda n: mw@pbs['mixamorig:'+n].tail
    def apuntar(nombre,d,hint=None,hcur=None):
        pb=pbs['mixamorig:'+nombre]; d=(R3@d).normalized()
        M=pb.matrix.copy(); y=M.col[1].xyz.normalized(); R=y.rotation_difference(d).to_matrix()
        if hint is not None:
            hc=(R@(R3@hcur())).normalized(); hd=(R3@hint).normalized()
            hc=hc-d*hc.dot(d); hd=hd-d*hd.dot(d)
            if hc.length>1e-6 and hd.length>1e-6:
                hc.normalize(); hd.normalize(); R=mathutils.Matrix.Rotation(math.atan2(d.dot(hc.cross(hd)),hc.dot(hd)),3,d)@R
        N=(R@M.to_3x3()).to_4x4(); N.translation=M.translation; pb.matrix=N; bpy.context.view_layer.update()
    mid=lambda a,b:(a+b)/2
    apuntar('Hips',P('Spine2')-P('Hips'),P('LeftThigh')-P('RightThigh'),lambda: W('LeftUpLeg')-W('RightUpLeg'))
    hp=pbs['mixamorig:Hips']; d_=mid(P('LeftThigh'),P('RightThigh'))-mid(W('LeftUpLeg'),W('RightUpLeg'))
    M=hp.matrix.copy(); M.translation=M.translation+R3@d_; hp.matrix=M; bpy.context.view_layer.update()
    hom=lambda: W('LeftArm')-W('RightArm')
    apuntar('Spine',P('Spine3')-P('Spine2'))
    apuntar('Spine1',P('Spine4')-P('Spine3'))
    apuntar('Spine2',P('Neck')-P('Spine4'),P('LeftArm')-P('RightArm'),hom)
    apuntar('Neck',P('Head')-P('Neck'))
    apuntar('Head',P('HeadTip')-P('Head'),P('LeftArm')-P('RightArm'),hom)
    dedos={'Thumb':1,'Index':2,'Middle':3,'Ring':4,'Pinky':5}
    for L in ('Left','Right'):
        apuntar(L+'Shoulder',P(L+'Arm')-P(L+'Shoulder'))
        # brazo con el largo del cuerpo nuevo: la mano va donde la puso el atleta, escalada al largo del brazo
        Sm=W(L+'Arm'); a_=(W(L+'ForeArm')-Sm).length; b_=(W(L+'Hand')-W(L+'ForeArm')).length
        Sr,Er,Hr=P(L+'Arm'),P(L+'ForeArm'),P(L+'Hand'); k_=(a_+b_)/((Er-Sr).length+(Hr-Er).length)
        T_=Sm+(Hr-Sr)*k_+BAJAR.get(L,V3())
        dT=(T_-Sm); dl=min(dT.length,(a_+b_)*.999); u=dT.normalized()
        plano=(Er-Sr)-u*(Er-Sr).dot(u)
        if CODO_VERTICAL[0]:
            # antebrazo vertical: el codo va lo más cerca posible de quedar justo debajo de la mano
            D_=(Sm+u*min(dT.length,(a_+b_)*.999))-V3((0,0,b_))-Sm
            plano=D_-u*D_.dot(u)
        if plano.length<1e-6: plano=V3((0,0,-1))
        plano.normalize()
        x=(a_*a_-b_*b_+dl*dl)/(2*dl); h=math.sqrt(max(a_*a_-x*x,0)); E_=Sm+u*x+plano*h; T_=Sm+u*dl
        apuntar(L+'Arm',E_-Sm,T_-E_,lambda L=L: Wt(L+'ForeArm')-W(L+'ForeArm'))
        palma=lambda L=L: W(L+'HandIndex1')-W(L+'HandPinky1')
        apuntar(L+'ForeArm',T_-E_,P(L+'Finger2Proximal')-P(L+'Finger5Proximal'),palma)
        if CODO_VERTICAL[0]:
            dfa=(T_-E_).normalized(); apuntar(L+'Hand',dfa,P(L+'Finger2Proximal')-P(L+'Finger5Proximal'),palma)
        else:
            apuntar(L+'Hand',P(L+'Finger3Proximal')-P(L+'Hand'),P(L+'Finger2Proximal')-P(L+'Finger5Proximal'),palma)
        # dedos: la forma de la mano del atleta (relativa a su mano), puesta en la mano del cuerpo nuevo
        def marco(y,x):
            y=y.normalized(); x=(x-y*x.dot(y)).normalized(); return mathutils.Matrix((x,y,x.cross(y))).transposed()
        Mr=marco(P(L+'Finger3Proximal')-P(L+'Hand'),P(L+'Finger2Proximal')-P(L+'Finger5Proximal'))
        Mm=marco(W(L+'HandMiddle1')-W(L+'Hand'),W(L+'HandIndex1')-W(L+'HandPinky1'))
        rel=lambda v: Mm@(Mr.transposed()@v)
        for dn,f in dedos.items():
            if dn=='Thumb': cad=[f'{L}Finger1Metacarpal',f'{L}Finger1Proximal',f'{L}Finger1Distal',f'{L}Finger1Tip']
            else: cad=[f'{L}Finger{f}Proximal',f'{L}Finger{f}Medial',f'{L}Finger{f}Distal',f'{L}Finger{f}Tip']
            for k in range(3): apuntar(f'{L}Hand{dn}{k+1}',rel(P(cad[k+1])-P(cad[k])))
        apuntar(L+'UpLeg',P(L+'Shin')-P(L+'Thigh'))
        apuntar(L+'Leg',P(L+'Foot')-P(L+'Shin'))
        apuntar(L+'Foot',P(L+'Toe')-P(L+'Foot'))
        apuntar(L+'ToeBase',P(L+'ToeTip')-P(L+'Toe'))
    return P
def agarre(arm,L):
    mw=arm.matrix_world; pbs=arm.pose.bones
    # centro del puño: entre la base de los dedos (nudillos) y la punta del dedo medio doblado
    a=mw@pbs[f'mixamorig:{L}HandMiddle1'].head; b=mw@pbs[f'mixamorig:{L}HandMiddle2'].tail; c=mw@pbs[f'mixamorig:{L}HandIndex1'].head; d=mw@pbs[f'mixamorig:{L}HandPinky1'].head
    return (a+b)/2*.7+(c+d)/2*.3
def barra(col,pL,pR,largo=2.2,r=.0145):
    for o in list(col.objects): bpy.data.objects.remove(o,do_unlink=True)
    cen=(pL+pR)/2; eje=(pL-pR).normalized(); q=V3((0,0,1)).rotation_difference(eje)
    def cil(nom,rad,lon,off,mat):
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=rad,depth=lon,location=cen+eje*off)
        o=bpy.context.object; o.name=nom; o.rotation_mode='QUATERNION'; o.rotation_quaternion=q
        for c_ in o.users_collection: c_.objects.unlink(o)
        col.objects.link(o); o.data.materials.append(mat); bpy.ops.object.shade_smooth() if False else None
        for p in o.data.polygons: p.use_smooth=True
        return o
    metal=bpy.data.materials.get('Metal') or bpy.data.materials.new('Metal'); metal.use_nodes=True
    bm=metal.node_tree.nodes['Principled BSDF']; bm.inputs['Base Color'].default_value=(.75,.76,.78,1); bm.inputs['Metallic'].default_value=1; bm.inputs['Roughness'].default_value=.25
    goma=bpy.data.materials.get('Disco') or bpy.data.materials.new('Disco'); goma.use_nodes=True
    bg=goma.node_tree.nodes['Principled BSDF']; bg.inputs['Base Color'].default_value=(.015,.015,.017,1); bg.inputs['Roughness'].default_value=.55
    cil('barra',r,largo,0,metal)
    for s in (1,-1):
        cil('manga',.025,.42,s*.88,metal)
        cil('disco',.225,.05,s*.74,goma); cil('disco2',.225,.05,s*.795,goma)
        cil('tope',.04,.03,s*.70,metal)
    return cen,eje
def banco(col,arm,body,zpiso):
    # banco plano bajo la espalda: la altura la da el punto más bajo de la espalda y la cola
    dg=bpy.context.evaluated_depsgraph_get(); ev=body.evaluated_get(dg); me=ev.to_mesh()
    at=body.data.attributes.get('esp')
    V=np.array([body.matrix_world@v.co for v in me.vertices]); ev.to_mesh_clear()
    vals=np.zeros(len(V)); at.data.foreach_get('value',vals)
    pts=V[vals>.5]; ztop=np.percentile(pts[:,2],3)
    mw=arm.matrix_world; pb=arm.pose.bones
    cab=mw@pb['mixamorig:Head'].head; cad=mw@pb['mixamorig:Hips'].head
    eje=(cab-cad); eje.z=0; eje.normalize()
    c0=cad-eje*.25; c1=cab+eje*.12; cen=(c0+c1)/2; lon=(c1-c0).length
    mat=bpy.data.materials.get('Banco') or bpy.data.materials.new('Banco'); mat.use_nodes=True
    b=mat.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value=(.02,.02,.025,1); b.inputs['Roughness'].default_value=.6
    ang=math.atan2(eje.y,eje.x)
    def caja(cx,cy,cz,sx,sy,sz,m):
        bpy.ops.mesh.primitive_cube_add(size=1,location=(cx,cy,cz)); o=bpy.context.object; o.scale=(sx,sy,sz); o.rotation_euler=(0,0,ang)
        for c_ in o.users_collection: c_.objects.unlink(o)
        col.objects.link(o); o.data.materials.append(m)
        bv=o.modifiers.new('bv','BEVEL'); bv.width=.015; bv.segments=3; return o
    caja(cen.x,cen.y,ztop-.04,lon,.30,.08,mat)
    metal=bpy.data.materials.get('Metal')
    for t in (-.38,.38):
        p=cen+eje*(lon*t); caja(p.x,p.y,(zpiso+ztop-.08)/2,.06,.06,ztop-.08-zpiso,metal or mat)
        caja(p.x,p.y,zpiso+.02,.06,.42,.04,metal or mat)
    return ztop

def pecho_bajo_barra(body,cen,eje):
    # alto de la superficie del pecho justo debajo de la barra
    dg=bpy.context.evaluated_depsgraph_get(); ev=body.evaluated_get(dg); me=ev.to_mesh()
    V=np.array([body.matrix_world@v.co for v in me.vertices]); ev.to_mesh_clear()
    c=np.array(cen[:]); e=np.array(eje[:]); d=V[:,:2]-c[:2]; t=d@e[:2]
    perp=np.linalg.norm(d-np.outer(t,e[:2]),axis=1)
    sel=(perp<.03)&(np.abs(t)<.12)
    return V[sel,2].max() if sel.any() else None
