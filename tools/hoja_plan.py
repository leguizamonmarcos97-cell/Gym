import json, sys
from PIL import Image, ImageDraw, ImageFont
F=lambda sz,b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf'%('-Bold' if b else ''),sz)
NAR=(255,106,61); GRIS=(176,184,196); BLANCO=(240,242,245); FONDO=(13,15,18); CARD=(23,26,31); VERDE=(52,211,153)
S_='/tmp/claude-0/-home-user-Gym/f812e2a6-1ad8-52cf-87d1-eaac6198b116/scratchpad'
d=json.load(open(S_+'/plan_nuevo.json'))
NOTAS={'Sentadilla a cajón':'Con un cajón o banco atrás: bajá hasta rozarlo y subí. Cuida la rodilla.',
 'Plancha':'Cuerpo recto, cola apretada.','Peso muerto rumano':'Espalda recta, la barra roza las piernas.',
 'Press de banca':'Barra al medio del pecho, codos a 45°.','Remo con barra':'Torso inclinado, tirá hacia el ombligo.',
 'Hip thrust':'Apretá la cola arriba 1 segundo.'}
def envolver(t,f,w,dr):
    pal=t.split(); l=''; out=[]
    for p in pal:
        if dr.textlength(l+' '+p,font=f)>w and l: out.append(l); l=p
        else: l=(l+' '+p).strip()
    if l: out.append(l)
    return out
def hoja(k,salida):
    dia=d['dias'][k]; W=1080; S=Image.new('RGB',(W,6000),FONDO); dr=ImageDraw.Draw(S); y=40
    dr.text((40,y),dia['titulo'],font=F(64,True),fill=BLANCO); y+=82
    dr.text((40,y),dia['sub'],font=F(28),fill=NAR); y+=52
    dr.text((40,y),'Calentamiento: 5–10 min de bici o cinta + 2 series livianas del primer ejercicio.',font=F(24),fill=GRIS); y+=56
    cw=(W-40*2-20)//2; ch=int(cw*1.15)
    for i,e in enumerate(dia['ej']):
        x=40+(i%2)*(cw+20); yy=y+(i//2)*(ch+190)
        f='_'.join(e['demo']); im=Image.open(f'{S_}/vid/foto_{f}.png').convert('RGB')
        im=im.resize((cw,int(cw*im.height/im.width))); top=max(0,int((im.height-ch)*.25)); im=im.crop((0,top,cw,top+ch))
        dr.rounded_rectangle((x,yy,x+cw,yy+ch+176),18,fill=CARD); S.paste(im,(x,yy))
        tt=f"{i+1}. {e['n']}"; fz=29
        while dr.textlength(tt,font=F(fz,True))>cw-32 and fz>20: fz-=1
        dr.text((x+16,yy+ch+12+(29-fz)//2),tt,font=F(fz,True),fill=BLANCO)
        dr.text((x+16,yy+ch+52),e['sr'],font=F(30,True),fill=NAR)
        nota=NOTAS.get(e['n']) or (f"En lugar de {e['orig'].lower()}, {e['motivo']}." if e['orig'] else '')
        for j,l in enumerate(envolver(nota,F(21),cw-32,dr)[:3]): dr.text((x+16,yy+ch+96+j*26),l,font=F(21),fill=GRIS)
    y+=((len(dia['ej'])+1)//2)*(ch+190)+10
    if dia.get('cardio'):
        dr.rounded_rectangle((40,y,W-40,y+90),16,fill=(18,40,33)); dr.text((60,y+14),'Al final',font=F(26,True),fill=VERDE)
        dr.text((60,y+50),'15–20 min de cardio suave: bici, cinta inclinada o escaladora.',font=F(23),fill=BLANCO); y+=110
    for j,l in enumerate(envolver('Descanso: 1:30–2 min en los dos primeros ejercicios y 1 min en los otros. En la app tenés el peso de cada serie.',F(22),W-80,dr)): dr.text((40,y+10+j*30),l,font=F(22),fill=GRIS)
    y+=80
    S.crop((0,0,W,y)).save(salida,quality=88); print(salida,y)
for k,n in (('TA','1_torso_a'),('PA','2_piernas_a'),('TB','3_torso_b'),('PB','4_piernas_b')): hoja(k,f'/home/user/Gym/videos/plan/{n}.jpg')
# portada: tu perfil y la semana
W=1080; S=Image.new('RGB',(W,1500),FONDO); dr=ImageDraw.Draw(S); y=40
dr.text((40,y),'Tu plan nuevo',font=F(66,True),fill=BLANCO); y+=90
dr.text((40,y),'Objetivo: bajar de peso · 86 → 70 kg',font=F(32,True),fill=NAR); y+=60
filas=[('Semana','Lun Torso A · Mar Piernas A · Jue Torso B · Vie Piernas B'),('Descanso','Miércoles activo (caminar 30–40 min) · sábado y domingo libres'),
 ('Cada sesión','5 ejercicios, 1 hora, + 15–20 min de cardio suave'),('Rodillas','Sentadilla a cajón en lugar de sentadilla con barra y búlgara'),
 ('Comida',f"~{d['nut']['kcal']} kcal por día · {d['nut']['prot']} g de proteína"),('Ritmo','~0,6 kg por semana: unos 6 meses hasta 70 kg'),
 ('Hábitos','Dormí 7–8 h (hoy menos de 6) · tomá ~3 litros de agua · 6.000–8.000 pasos')]
for a,b in filas:
    dr.rounded_rectangle((40,y,W-40,y+120),16,fill=CARD); dr.text((64,y+18),a,font=F(24,True),fill=GRIS)
    for j,l in enumerate(envolver(b,F(28),W-130,dr)[:2]): dr.text((64,y+52+j*34),l,font=F(28),fill=BLANCO)
    y+=136
dr.text((40,y+10),'Cada 5 semanas la app cambia algunos ejercicios y hace una semana más liviana.',font=F(22),fill=GRIS); y+=60
S.crop((0,0,W,y)).save('/home/user/Gym/videos/plan/0_resumen.jpg',quality=88); print('ok',y)
