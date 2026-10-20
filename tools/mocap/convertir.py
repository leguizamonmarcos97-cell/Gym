"""Convierte las muestras de un FBX de Mixamo (posiciones de articulaciones por cuadro, ver tools/mocap/LEEME.md)
en direcciones para el esqueleto de la app (3d/anim/<nombre>.json).

Uso: python3 tools/mocap/convertir.py muestras.json 3d/anim/sentadilla_libre.json
Se guardan solo direcciones de los huesos y la rotación de la cadera: no se copia el archivo original.
"""
import json, sys, math

def sub(a, b): return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
def norm(v):
    l = math.sqrt(sum(x * x for x in v)) or 1
    return [x / l for x in v]
def cross(a, b): return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
def dot(a, b): return sum(x * y for x, y in zip(a, b))

# Rotación (cuaternión x,y,z,w) que lleva el vector unitario a al b
def q_de(a, b):
    d = dot(a, b)
    if d < -0.999999:
        ax = cross([1, 0, 0], a)
        if sum(x * x for x in ax) < 1e-6: ax = cross([0, 1, 0], a)
        ax = norm(ax); return [ax[0], ax[1], ax[2], 0]
    c = cross(a, b); q = [c[0], c[1], c[2], 1 + d]
    l = math.sqrt(sum(x * x for x in q)); return [x / l for x in q]
def q_mul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return [aw * bx + ax * bw + ay * bz - az * by, aw * by - ax * bz + ay * bw + az * bx, aw * bz + ax * by - ay * bx + az * bw, aw * bw - ax * bx - ay * by - az * bz]
def q_rot(q, v):
    p = q_mul(q_mul(q, [v[0], v[1], v[2], 0]), [-q[0], -q[1], -q[2], q[3]]); return p[:3]
# Rotación entre dos marcos (derecha, arriba)
def q_marco(r0, u0, r1, u1):
    q1 = q_de(norm(r0), norm(r1)); u0r = q_rot(q1, norm(u0))
    # segundo giro alrededor de r1 para alinear "arriba"
    r1n = norm(r1); a = norm(sub(u0r, [x * dot(u0r, r1n) for x in r1n])); b = norm(sub(norm(u1), [x * dot(norm(u1), r1n) for x in r1n]))
    ang = math.atan2(dot(cross(a, b), r1n), dot(a, b)); s = math.sin(ang / 2)
    q2 = [r1n[0] * s, r1n[1] * s, r1n[2] * s, math.cos(ang / 2)]
    return q_mul(q2, q1)

muestras, salida = sys.argv[1], sys.argv[2]
M = json.load(open(muestras))
idx = {}
for i, n in enumerate(M['huesos']): idx.setdefault(n.replace('mixamorig', '').replace(':', ''), i)
C = M['cuadros']
P = lambda f, n: C[f][idx[n]]
seg = lambda f, a, b: norm(sub(P(f, b), P(f, a)))

# Direcciones absolutas (brazos, piernas, manos): el hueso apunta igual que en la grabación
ABS = {}
for l, L in (('L', 'Left'), ('R', 'Right')):
    ABS['upperarm01.' + l] = (L + 'Arm', L + 'ForeArm')
    ABS['lowerarm01.' + l] = (L + 'ForeArm', L + 'Hand')
    ABS['wrist.' + l] = (L + 'Hand', L + 'HandMiddle1')
    ABS['upperleg01.' + l] = (L + 'UpLeg', L + 'Leg')
    ABS['lowerleg01.' + l] = (L + 'Leg', L + 'Foot')
# Relativas al primer cuadro (columna, cuello, cabeza, pies, clavículas): se aplica el mismo giro a la postura propia del muñeco
REL = {'spine05': ('Hips', 'Spine1'), 'spine04': ('Hips', 'Spine1'), 'spine03': ('Spine1', 'Neck'), 'spine02': ('Spine1', 'Neck'),
       'spine01': ('Spine2', 'Neck'), 'neck01': ('Neck', 'Head'), 'head': ('Head', 'HeadTop_End')}
for l, L in (('L', 'Left'), ('R', 'Right')):
    REL['foot.' + l] = (L + 'Foot', L + 'ToeBase')
    REL['clavicle.' + l] = (L + 'Shoulder', L + 'Arm')

def marco(f):
    der = sub(P(f, 'LeftUpLeg'), P(f, 'RightUpLeg')); arr = sub(P(f, 'Spine'), P(f, 'Hips'))
    return der, arr
r0, u0 = marco(0)
cadera = [P(f, 'Hips')[1] for f in range(len(C))]
alto, bajo = max(cadera), min(cadera)
cuadros = []
for f in range(len(C)):
    r1, u1 = marco(f)
    d = {k: [round(x, 4) for x in seg(f, a, b)] for k, (a, b) in ABS.items()}
    # para las relativas se guarda el giro desde el primer cuadro
    g = {k: [round(x, 4) for x in q_de(seg(0, a, b), seg(f, a, b))] for k, (a, b) in REL.items()}
    cuadros.append({'raiz': [round(x, 4) for x in q_marco(r0, u0, r1, u1)], 'dir': d, 'giro': g,
                    'contraccion': round((alto - cadera[f]) / max(1e-6, alto - bajo), 3)})
json.dump({'fps': round(len(C) / M['dur'], 3) if M['dur'] else 30, 'dur': M['dur'], 'cuadros': cuadros}, open(salida, 'w'), separators=(',', ':'))
print('cuadros', len(cuadros), 'dur', M['dur'])
