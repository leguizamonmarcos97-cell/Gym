// Animaciones 3D: poses de inicio (A) y final (B) como direcciones de los huesos en el espacio (x: izquierda del cuerpo, y: arriba, z: adelante).
// giros: rotación de un hueso sobre su propio eje (radianes); agarre: cuánto se cierran los dedos.
// musc: zonas que trabajan (1 = principal); en los errores, malMusc marca en rojo lo que se sobrecarga.
const sim = d => Object.fromEntries(Object.entries(d).flatMap(([n, v]) => [[n + '.L', v], [n + '.R', [-v[0], v[1], v[2]]]]));
const espalda = (inc, z = 0) => ({spine05:[0, 1, z + inc * .5], spine04:[0, 1, z + inc * .8], spine03:[0, 1, z + inc], spine02:[0, 1, z + inc], spine01:[0, 1, z + inc * .9]});
export const POSE_BASE = {dirs:Object.assign(sim({'upperarm01':[.13, -1, .02], 'lowerarm01':[.09, -1, .08]}), {})};

export const EJ3D = {
  'curl:mancuernas':{
    obj:'mancuernas', cam:{az:.55, y:2.6, dist:27, el:.04}, tempo:[1, .35, 1.9, .45], flecha:'finger3-1.L', flechaDesp:22,
    musc:{biceps:1, antebrazos:.45},
    txt:'Codos quietos, pegados al cuerpo. Subí en 1 segundo y bajá en 2, sin balancearte.',
    A:{dirs:sim({'upperarm01':[.1, -1, .04], 'lowerarm01':[.08, -1, .14]}), giros:{'lowerarm01.L':-1.2, 'lowerarm01.R':1.2}, agarre:.9},
    B:{dirs:sim({'upperarm01':[.1, -1, .12], 'lowerarm01':[.05, .5, .86]}), giros:{'lowerarm01.L':-1.2, 'lowerarm01.R':1.2}, agarre:.9},
    errores:[{n:'Balancearte', musc:{biceps:.35}, malMusc:{lumbar:1, hombros:.8},
      txt:'Si te balanceás o adelantás los codos, el peso lo suben la espalda y el hombro. Bajá el peso y dejá los codos quietos.',
      A:{dirs:Object.assign(sim({'upperarm01':[.1, -1, .04], 'lowerarm01':[.08, -1, .14]}), espalda(.18)), giros:{'lowerarm01.L':-1.2, 'lowerarm01.R':1.2}, agarre:.9},
      B:{dirs:Object.assign(sim({'upperarm01':[.1, -.82, .55], 'lowerarm01':[.05, .7, .7]}), espalda(-.3)), giros:{'lowerarm01.L':-1.2, 'lowerarm01.R':1.2}, agarre:.9}}]
  },
  'sentadilla:barra':{
    obj:'barra', barra:{hueso:'spine01', off:[0, 1.05, -.55], ancho:2.7, polo:[0, -1, -.6]}, cam:{az:.95, y:-.5, dist:36, el:.08}, tempo:[1.3, .3, 2, .5], flecha:'root', flechaDesp:-60,
    musc:{cuadriceps:1, gluteos:1, aductores:.6, isquios:.35, lumbar:.3},
    txt:'Pecho arriba, espalda firme y rodillas en la línea de los pies. Bajá hasta que el muslo quede paralelo al piso.',
    A:{dirs:sim({'upperleg01':[.12, -1, .02], 'lowerleg01':[.06, -1, -.02]}), agarre:.9},
    B:{dirs:Object.assign(sim({'upperleg01':[.28, -.22, .93], 'lowerleg01':[.1, -.9, -.42]}), espalda(.62, -.05)), agarre:.9},
    errores:[
      {n:'Rodillas adentro', flecha:'lowerleg01.L', flechaDesp:0, musc:{cuadriceps:.7, gluteos:.4},
       txt:'Las rodillas se van hacia adentro: carga la rodilla de costado. Empujalas hacia afuera, en la línea de las puntas de los pies.',
       B:{dirs:Object.assign(sim({'upperleg01':[-.05, -.22, .97], 'lowerleg01':[.22, -.88, -.42]}), espalda(.62, -.05)), agarre:.9}},
      {n:'Espalda redondeada', musc:{cuadriceps:.6, gluteos:.5}, malMusc:{lumbar:1},
       txt:'Si la espalda se redondea, la columna lumbar carga el peso. Mantené el pecho arriba y bajá solo hasta donde puedas con la espalda firme.',
       B:{dirs:Object.assign(sim({'upperleg01':[.28, -.22, .93], 'lowerleg01':[.1, -.9, -.42]}), {spine05:[0, .8, .6], spine04:[0, .6, .8], spine03:[0, .45, .89], spine02:[0, .38, .92], spine01:[0, .32, .95], neck01:[0, .5, .87]}), agarre:.9}}
    ]
  }
};
