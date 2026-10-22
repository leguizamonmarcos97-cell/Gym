import bpy, sys, numpy as np
f,out,paso=sys.argv[-3],sys.argv[-2],int(sys.argv[-1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=f)
sc=bpy.context.scene; arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]
tips=[o for o in bpy.data.objects if o.type=='EMPTY' and o.name.endswith('Tip')]
acc=[a for a in bpy.data.actions if a.name.startswith('Root')][0]
f0,f1=[int(x) for x in acc.frame_range]
nombres=[b.name for b in arm.pose.bones]; tn=[o.name for o in tips]
H=[];T=[];Fr=[]
for fr in range(f0,f1+1,paso):
    sc.frame_set(fr)
    H.append([tuple(arm.matrix_world@pb.head) for pb in arm.pose.bones]); T.append([tuple(o.matrix_world.translation) for o in tips]); Fr.append(fr)
np.savez(out,H=np.array(H),T=np.array(T),nombres=np.array(nombres),tips=np.array(tn),frames=np.array(Fr))
print('RK listo',len(Fr),'cuadros', f0,f1, 'fps',sc.render.fps)
