# Pone el esqueleto de Mixamo en la pose que tiene el cuerpo de la app (MakeHuman) y arma los aparatos del ejercicio
import bpy, mathutils, math, numpy as np, json
V3=mathutils.Vector
def ajustar_pose(arm, pz, escala, zpiso, zapas):
    mw=arm.matrix_world; mwi=mw.inverted(); R3=mwi.to_3x3()
    H=pz['hs']; T=pz['puntas']; minY=pz['minY']
    def mp(p): return V3((p[0]*escala, -p[2]*escala, (p[1]-minY)*escala+zpiso+cfg_suela[0]))
    def P(n): return mp(H[n])
    def tip(n): return mp(T[n])
    pbs=arm.pose.bones
    for pb in pbs: pb.matrix_basis=mathutils.Matrix.Identity(4)
    bpy.context.view_layer.update()
    def W(pb): return mw@pb.head
    def apuntar(nombre,d,hint=None,hcur=None):
        pb=pbs['mixamorig:'+nombre]; d=(R3@d).normalized()
        M=pb.matrix.copy(); y=M.col[1].xyz.normalized(); q=y.rotation_difference(d); R=q.to_matrix()
        if hint is not None:
            hc=(R@(R3@hcur())).normalized(); hd=(R3@hint).normalized()
            hc=(hc-d*hc.dot(d)); hd=(hd-d*hd.dot(d))
            if hc.length>1e-6 and hd.length>1e-6:
                hc.normalize(); hd.normalize(); ang=math.atan2(d.dot(hc.cross(hd)),hc.dot(hd))
                R=mathutils.Matrix.Rotation(ang,3,d)@R
        N=(R@M.to_3x3()).to_4x4(); N.translation=M.translation; pb.matrix=N; bpy.context.view_layer.update()
    mid=lambda a,b:(a+b)/2
    # cadera: orientación (arriba = columna, izquierda = cadera izq - der) y posición (centro de las caderas)
    cad=mid(P('upperleg01.L'),P('upperleg01.R'))
    apuntar('Hips',P('spine03')-cad,P('upperleg01.L')-P('upperleg01.R'),lambda: W(pbs['mixamorig:LeftUpLeg'])-W(pbs['mixamorig:RightUpLeg']))
    hp=pbs['mixamorig:Hips']; actual=mid(W(pbs['mixamorig:LeftUpLeg']),W(pbs['mixamorig:RightUpLeg']))
    M=hp.matrix.copy(); M.translation=M.translation+mwi.to_3x3()@(cad-actual); hp.matrix=M; bpy.context.view_layer.update()
    hombros=lambda: W(pbs['mixamorig:LeftArm'])-W(pbs['mixamorig:RightArm'])
    apuntar('Spine',P('spine02')-P('spine04'))
    apuntar('Spine1',P('spine01')-P('spine02'))
    apuntar('Spine2',P('neck01')-P('spine01'),P('upperarm01.L')-P('upperarm01.R'),hombros)
    apuntar('Neck',P('head')-P('neck01'))
    apuntar('Head',tip('head')-P('head'),P('upperarm01.L')-P('upperarm01.R'),hombros)
    dedos={'Thumb':1,'Index':2,'Middle':3,'Ring':4,'Pinky':5}
    for l,L in (('L','Left'),('R','Right')):
        apuntar(L+'Shoulder',P('upperarm01.'+l)-P('clavicle.'+l))
        apuntar(L+'Arm',P('lowerarm01.'+l)-P('upperarm01.'+l))
        apuntar(L+'ForeArm',P('wrist.'+l)-P('lowerarm01.'+l))
        apuntar(L+'Hand',P('finger3-1.'+l)-P('wrist.'+l),P('finger2-1.'+l)-P('finger5-1.'+l),
                lambda L=L: W(pbs[f'mixamorig:{L}HandIndex1'])-W(pbs[f'mixamorig:{L}HandPinky1']))
        for dn,f in dedos.items():
            a,b,c=(f'finger{f}-1.{l}',f'finger{f}-2.{l}',f'finger{f}-3.{l}')
            if dn=='Thumb': segs=[(a,b),(b,c),(c,None)]
            else: segs=[(a,b),(b,c),(c,None)]
            for k,(x,y) in enumerate(segs):
                if dn=='Thumb' and k==0: d=P(b)-P(a)
                else: d=(P(y) if y else tip(x))-P(x)
                if dn=='Thumb': d=[P(b)-P(a),P(c)-P(b),tip(c)-P(c)][k]
                apuntar(f'{L}Hand{dn}{k+1}',d)
        apuntar(L+'UpLeg',P('lowerleg01.'+l)-P('upperleg01.'+l))
        apuntar(L+'Leg',P('foot.'+l)-P('lowerleg01.'+l))
        apuntar(L+'Foot',P('toe1-1.'+l)-P('foot.'+l))
    # piso: si en la app los pies están apoyados, se apoyan acá también (la suela toca el piso)
    dg=bpy.context.evaluated_depsgraph_get()
    pie_y=min(H['foot.L'][1],H['foot.R'][1])-minY
    cad_y=(H['upperleg01.L'][1]+H['upperleg01.R'][1])/2-minY
    if pie_y<1.4 and zapas and 3<cad_y<7:
        pass
    if False:
        for l,L in (('L','Left'),('R','Right')):
            pie=W(pbs[f'mixamorig:{L}Foot']); rod=W(pbs[f'mixamorig:{L}Leg'])
            ik(l,L,2,f'{L}Leg',V3((pie.x,pie.y,zpiso+.085)),rod+V3((0,-.0,.3))+(rod-W(pbs[f'mixamorig:{L}UpLeg'])).normalized()*.3)
    elif pie_y<1.4 and zapas:
        zmin=min((o.matrix_world@v.co).z for o in zapas for v in o.evaluated_get(dg).data.vertices)
        M=hp.matrix.copy(); M.translation=M.translation+mwi.to_3x3()@V3((0,0,zpiso-zmin)); hp.matrix=M; bpy.context.view_layer.update()
    # --- ajustes por ejercicio: brazos con IK a puntos del aparato, pies al piso con IK ---
    spec=cfg_ik[0] or {}
    def ik(l_,L_,cadena,hueso,obj_pos,polo_pos):
        nom=f'ik_{hueso}'
        t=bpy.data.objects.get('t_'+nom) or bpy.data.objects.new('t_'+nom,None)
        p=bpy.data.objects.get('p_'+nom) or bpy.data.objects.new('p_'+nom,None)
        for o in (t,p):
            if o.name not in bpy.context.scene.collection.objects: bpy.context.scene.collection.objects.link(o)
        t.location=obj_pos; p.location=polo_pos
        pb=pbs['mixamorig:'+hueso]
        c=pb.constraints.get('IKX') or pb.constraints.new('IK'); c.name='IKX'
        c.target=t; c.pole_target=p; c.chain_count=cadena; c.use_tail=True; c.pole_angle=math.radians(-90)
        bpy.context.view_layer.update()
    arriba=V3((0,0,1))
    if spec.get('tipo')=='press_banca':
        hL=W(pbs['mixamorig:LeftArm']); hR=W(pbs['mixamorig:RightArm']); lat=(hL-hR).normalized()
        cadera=mid(W(pbs['mixamorig:LeftUpLeg']),W(pbs['mixamorig:RightUpLeg'])); ejeC=(mid(hL,hR)-cadera); ejeC.z=0; ejeC.normalize()  # hacia la cabeza
        pecho=W(pbs['mixamorig:Spine2']); zpecho=pecho.z+spec.get('pecho',.13)
        t_=pz.get('t',0)
        for l,L,sg in (('L','Left',1),('R','Right',-1)):
            hom=W(pbs[f'mixamorig:{L}Arm'])
            largo=(W(pbs[f'mixamorig:{L}ForeArm'])-hom).length+(W(pbs[f'mixamorig:{L}Hand'])-W(pbs[f'mixamorig:{L}ForeArm'])).length
            base=mid(hL,hR)+lat*sg*spec.get('ancho',.40)
            if t_==0: barra=V3((base.x,base.y,zpecho))-ejeC*spec.get('abajo',.10)
            else: barra=V3((base.x,base.y,hom.z+largo*.93))-ejeC*.02
            muneca=barra-arriba*.035
            polo=hom+lat*sg*.35-arriba*.25-ejeC*.15
            ik(l,L,2,f'{L}ForeArm',muneca,polo)
            pz.setdefault('ik_barra',{})[l]=barra
    # manos que agarran: muñeca derecha (sigue al antebrazo), el antebrazo gira para que la palma mire al mango, y puño cerrado
    from mathutils.bvhtree import BVHTree
    tri=[]; 
    for m in pz['mallas']:
        if m['obj']:
            p=np.array(m['p']).reshape(-1,3); tri+= [mp(x) for x in p]
    bvh=BVHTree.FromPolygons(tri,[(k,k+1,k+2) for k in range(0,len(tri),3)]) if tri else None
    def centro(q):
        if not bvh: return None
        hit=bvh.find_nearest(q)
        if hit[0] is None: return None
        p,nr=hit[0],hit[1]
        h2=bvh.ray_cast(p-nr*1e-4,-nr,.2)
        return (p+h2[0])/2 if h2[0] is not None else p-nr*.015
    R0=arm.data.bones; global GRIP; GRIP={}
    for l,L in (('L','Left'),('R','Right')):
        if l not in pz['agarradas']: continue
        hb=pbs[f'mixamorig:{L}Hand']; fa=pbs[f'mixamorig:{L}ForeArm']
        c0=centro(P(f'finger3-1.{l}'))
        if c0 is None: continue
        GRIP[l]=c0; c=pz.get('ik_barra',{}).get(l,c0)
        nloc=(R0[f'mixamorig:{L}Hand'].matrix_local.to_3x3().inverted()@(R3@V3((0,0,-1)))).normalized()
        ua=pbs[f'mixamorig:{L}Arm']
        def recto():
            N=fa.matrix.to_3x3().to_4x4(); N.translation=hb.matrix.translation; hb.matrix=N; bpy.context.view_layer.update()
        def giro_falta():
            eje=(fa.matrix.to_3x3()@V3((0,1,0))).normalized(); palma=(hb.matrix.to_3x3()@nloc).normalized()
            cen_a=mwi@c; mano_a=(hb.head+pbs[f'mixamorig:{L}HandMiddle1'].head)/2
            q_=cen_a-mano_a; q_=q_-eje*q_.dot(eje); p_=palma-eje*palma.dot(eje)
            if q_.length<1e-6 or p_.length<1e-6: return 0
            q_.normalize(); p_.normalize(); return math.atan2(eje.dot(p_.cross(q_)),p_.dot(q_))
        def girar(pb,ang):
            M_=pb.matrix.copy(); t_=M_.translation.copy(); e_=(M_.to_3x3()@V3((0,1,0))).normalized()
            M_=(mathutils.Matrix.Rotation(ang,3,e_)@M_.to_3x3()).to_4x4(); M_.translation=t_; pb.matrix=M_; bpy.context.view_layer.update()
        recto(); ang=giro_falta()
        # el giro grande lo hace el hombro (brazo entero); el antebrazo sólo corrige lo que falta (hasta 80°)
        girar(ua,ang)
        if not pz.get('ik_barra'): apuntar(L+'ForeArm',P('wrist.'+l)-P('lowerarm01.'+l))
        recto()
        ang2=max(-1.4,min(1.4,giro_falta())); girar(fa,ang2); recto()
        for dn in ('Index','Middle','Ring','Pinky','Thumb'):
            for k in (1,2,3):
                pb=pbs[f'mixamorig:{L}Hand{dn}{k}']; pb.rotation_mode='XYZ'
                ang=cfg_dedos.get(dn,cfg_dedos['dedo'])[k-1]
                sgn=cfg_signo.get(L,1)
                pb.rotation_euler=(math.radians(ang*sgn),0,0) if dn!='Thumb' else (0,0,math.radians(ang*cfg_pulgar.get(L,1)))
        bpy.context.view_layer.update()
    return mp
cfg_suela=[.018]
cfg_ik=[None]
cfg_dbg={}
cfg_signo={'Left':-1,'Right':-1}
cfg_pulgar={'Left':-1,'Right':1}
cfg_mano=[.85]
cfg_palma=[.012]
cfg_dedos={'dedo':[60,75,55],'Thumb':[30,45,40]}
def aparatos(pz,mp,arm,col):
    # mallas de la app (barras, mancuernas, bancos, poleas): lo que se agarra se corre a las manos del cuerpo nuevo
    for o in list(col.objects): bpy.data.objects.remove(o,do_unlink=True)
    pbs=arm.pose.bones; mw=arm.matrix_world; H=pz['hs']
    corrs={}; gapp={}
    for l,L in (('L','Left'),('R','Right')):
        if l in pz['agarradas']:
            hb=pbs[f'mixamorig:{L}Hand']; nloc=(arm.data.bones[f'mixamorig:{L}Hand'].matrix_local.to_3x3().inverted()@(mw.inverted().to_3x3()@V3((0,0,-1)))).normalized()
            palma=(mw.to_3x3()@(hb.matrix.to_3x3()@nloc)).normalized()
            mano=(mw@hb.head+mw@pbs[f'mixamorig:{L}HandMiddle1'].head)/2+palma*cfg_palma[0]
            if l not in GRIP: continue
            app=GRIP[l]; corrs[l]=mano-app; gapp[l]=app
    tod=sum(corrs.values(),V3())/len(corrs) if corrs else V3()
    # piezas que se tocan forman un mismo aparato (barra + discos, mancuerna + cabezas): se mueven juntas
    piezas=[np.array([tuple(mp(x)) for x in np.array(m['p']).reshape(-1,3)]) for m in pz['mallas']]
    caja=[(q.min(0),q.max(0)) for q in piezas]; grupo=list(range(len(piezas)))
    def raiz(i):
        while grupo[i]!=i: i=grupo[i]
        return i
    for i in range(len(piezas)):
        for j in range(i+1,len(piezas)):
            if pz['mallas'][i]['obj'] and pz['mallas'][j]['obj'] and np.all(caja[i][0]<=caja[j][1]+.01) and np.all(caja[j][0]<=caja[i][1]+.01): grupo[raiz(i)]=raiz(j)
    corr_g={}
    for i,m in enumerate(pz['mallas']):
        if not m['obj'] or not corrs: continue
        g=raiz(i); ps=np.vstack([piezas[k] for k in range(len(piezas)) if raiz(k)==g])
        pegadas=[l for l in corrs if np.min(np.linalg.norm(ps-np.array(gapp[l][:]),axis=1))<.12]
        corr_g[g]=sum((corrs[l] for l in pegadas),V3())/len(pegadas) if pegadas else tod
    for i,m in enumerate(pz['mallas']):
        corr=corr_g.get(raiz(i),V3()) if m['obj'] else V3()
        vs=[tuple(V3(x)+corr) for x in piezas[i]]
        caras=[(k,k+1,k+2) for k in range(0,len(vs),3)]
        me=bpy.data.meshes.new(f'ap{i}'); me.from_pydata(vs,[],caras); me.update()
        bm=__import__('bmesh').new(); bm.from_mesh(me); __import__('bmesh').ops.remove_doubles(bm,verts=bm.verts,dist=1e-4); bm.to_mesh(me); bm.free()
        for p_ in me.polygons: p_.use_smooth=len(me.polygons)>40
        ob=bpy.data.objects.new(f'ap{i}',me); col.objects.link(ob)
        if cfg_dbg.get('sin_discos') and m['obj'] and np.ptp(piezas[i][:,2])>.25: ob.hide_render=True
        mt=bpy.data.materials.new(f'ap{i}'); mt.use_nodes=True; b=mt.node_tree.nodes['Principled BSDF']
        c=m['c']; rgb=[int(c[j:j+2],16)/255 for j in (0,2,4)]; rgb=[x**2.2 for x in rgb]
        b.inputs['Base Color'].default_value=(*rgb,1); b.inputs['Roughness'].default_value=m['r']; b.inputs['Metallic'].default_value=m['m']
        me.materials.append(mt)
        if len(me.polygons)>40:
            ws=ob.modifiers.new('ws','WEIGHTED_NORMAL')
    for L in ('Left','Right'):
        pb=pbs[f'mixamorig:{L}HandIndex2']; tipd=(mw@pbs[f'mixamorig:{L}HandIndex3'].tail-mw@pbs[f'mixamorig:{L}Hand'].head).length
        print('DIAG dedos',L,pb.rotation_mode,tuple(round(x,2) for x in pb.rotation_euler),'punta-muñeca',round(tipd,3),'basis',pb.matrix_basis.to_euler())
    for l,L in (('L','Left'),('R','Right')):
        w_=mw@pbs[f'mixamorig:{L}Hand'].head; t_=bpy.data.objects.get(f't_ik_{L}ForeArm')
        print('DIAG',pz.get('t'),l,'muñeca',tuple(round(x,3) for x in w_),'objetivo',tuple(round(x,3) for x in t_.location) if t_ else None,'corr',tuple(round(x,3) for x in corrs.get(l,V3())))
    print('DIAG pecho',tuple(round(x,3) for x in mw@pbs['mixamorig:Spine2'].head),'hombros',tuple(round(x,3) for x in mw@pbs['mixamorig:LeftArm'].head),tuple(round(x,3) for x in mw@pbs['mixamorig:RightArm'].head))
    return tod
