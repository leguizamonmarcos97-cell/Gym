// Animaciones 3D de los ejercicios.
// Cada pose (A = inicio, B = final) puede tener:
//   dirs: dirección de los huesos en el espacio (x: izquierda del cuerpo, y: arriba, z: adelante)
//   rot / pos: giro (grados) y posición de la cadera para acostarse, sentarse o inclinarse; sin pos, los pies quedan apoyados donde estaban
//   manos / pies: puntos a los que llegan manos y tobillos (cinemática inversa); polo / poloPies: hacia dónde apuntan codos y rodillas
//   giros: rotación de un hueso sobre su eje (radianes); agarre: cuánto se cierran los dedos
// musc: zonas que trabajan (1 = principal). En los errores, malMusc marca en rojo lo que se sobrecarga.
// Medidas de referencia (de pie): piso y = -8,17; cadera (raíz) (0; 1; -0,58); hombros (±1,98; 5,72; 0,2); tobillos (±1,97; -7,46; 0,17).
const sim = d => Object.fromEntries(Object.entries(d).flatMap(([n, v]) => [[n + '.L', v], [n + '.R', [-v[0], v[1], v[2]]]]));
const dos = (c, a) => ({L:[c[0] + a, c[1], c[2]], R:[c[0] - a, c[1], c[2]]});
const espalda = (inc, z = 0) => ({spine05:[0, 1, z + inc * .5], spine04:[0, 1, z + inc * .8], spine03:[0, 1, z + inc], spine02:[0, 1, z + inc], spine01:[0, 1, z + inc * .9]});
const inclinado = (y, z) => ({spine05:[0, y, z], spine04:[0, y, z], spine03:[0, y, z], spine02:[0, y, z], spine01:[0, y, z], neck01:[0, y + .3, z]});
const conj = (...xs) => Object.assign({}, ...xs);
const PISO = -8.17, TOBILLO = -7.46, SUPINO = [-90, 0, 0];
// Escenario
const banco = (x, y, z, lx, lz, alto = 1) => [{t:'caja', s:[lx, alto, lz], p:[x, y, z]}, {t:'caja', s:[lx * .4, y - alto / 2 - PISO, lz * .5], p:[x, (y - alto / 2 + PISO) / 2, z], m:'metal'}];
const columna = (x, z, alto = 21) => ({t:'caja', s:[1.1, alto, 1.1], p:[x, PISO + alto / 2, z], m:'metal'});
const rodillo = (sigue, off, l = 3.6) => ({t:'cil', r:.42, l, rot:[0, 0, 90], m:'pad', sigue, off});
const PIES_SENTADO = (z = 4.3, a = 1.5) => ({L:[a, TOBILLO, z], R:[-a, TOBILLO, z]});
const ASIENTO = (z = 0, y = -3.7) => [{t:'caja', s:[3.4, .7, 3.4], p:[0, y, z], m:'pad'}, {t:'caja', s:[1, y - PISO - .35, 1], p:[0, (y + PISO) / 2, z], m:'metal'}];
export const POSE_BASE = {dirs:sim({'upperarm01':[.13, -1, .02], 'lowerarm01':[.09, -1, .08]})};
const SUPINAR = {'lowerarm01.L':-1.2, 'lowerarm01.R':1.2};
// Barra sobre la espalda: palmas hacia adelante y dedos por encima de la barra
const GIRO_BARRA = {'lowerarm01.L':1.6, 'lowerarm01.R':-1.6}; const MANOS_BARRA = sim({wrist:[0, .95, -.3]});

// Acostado boca arriba en banco plano (cadera en z = 1,5; cabeza hacia -z)
const ACOSTADO = {rot:SUPINO, pos:[0, -2.9, 1.5], pies:{L:[2.2, TOBILLO, 5.6], R:[-2.2, TOBILLO, 5.6]}, poloPies:[0, 1, .3], dirs:sim({foot:[0, -.3, 1]})};
const BANCO_PLANO = banco(0, -4.4, -.8, 3.2, 11);

export const EJ3D = {
  'curl:mancuernas':{
    obj:'mancuernas', cam:{az:.55, y:2.6, dist:27, el:.04}, tempo:[1, .35, 1.9, .45], flecha:'finger3-1.L', flechaDesp:22,
    musc:{biceps:1, antebrazos:.45},
    txt:'Codos quietos, pegados al cuerpo. Subí en 1 segundo y bajá en 2, sin balancearte.',
    A:{dirs:sim({'upperarm01':[.1, -1, .04], 'lowerarm01':[.08, -1, .14]}), giros:SUPINAR, agarre:.9},
    B:{dirs:sim({'upperarm01':[.1, -1, .12], 'lowerarm01':[.05, .5, .86]}), giros:SUPINAR, agarre:.9},
    errores:[{n:'Balancearte', musc:{biceps:.35}, malMusc:{lumbar:1, hombros:.8},
      txt:'Si te balanceás o adelantás los codos, el peso lo suben la espalda y el hombro. Bajá el peso y dejá los codos quietos.',
      A:{dirs:conj(sim({'upperarm01':[.1, -1, .04], 'lowerarm01':[.08, -1, .14]}), espalda(.18)), giros:SUPINAR, agarre:.9},
      B:{dirs:conj(sim({'upperarm01':[.1, -.82, .55], 'lowerarm01':[.05, .7, .7]}), espalda(-.3)), giros:SUPINAR, agarre:.9}}]
  },
  'curl:barra':{
    obj:'barraCorta', cam:{az:.55, y:2.6, dist:27, el:.04}, tempo:[1, .35, 1.9, .45], flecha:'finger3-1.L', flechaDesp:22,
    musc:{biceps:1, antebrazos:.45},
    txt:'Codos quietos al costado del cuerpo, sin balancearte. Subí en 1 segundo y bajá en 2.',
    A:{dirs:sim({'upperarm01':[.12, -1, .04], 'lowerarm01':[.06, -1, .16]}), giros:SUPINAR, agarre:.9},
    B:{dirs:sim({'upperarm01':[.12, -1, .12], 'lowerarm01':[.02, .5, .86]}), giros:SUPINAR, agarre:.9},
    errores:[{n:'Balancearte', musc:{biceps:.35}, malMusc:{lumbar:1, hombros:.8},
      txt:'Balancearte o adelantar los codos pasa el trabajo a la espalda y al hombro. Bajá el peso y dejá los codos quietos.',
      A:{dirs:conj(sim({'upperarm01':[.12, -1, .04], 'lowerarm01':[.06, -1, .16]}), espalda(.18)), giros:SUPINAR, agarre:.9},
      B:{dirs:conj(sim({'upperarm01':[.12, -.82, .55], 'lowerarm01':[.03, .7, .7]}), espalda(-.3)), giros:SUPINAR, agarre:.9}}]
  },
  'sentadilla:barra':{
    obj:'barra', barra:{hueso:'spine01', off:[0, 1.45, -.75], ancho:2.9, polo:[0, -1, -.6]}, cam:{az:.95, y:-.5, dist:36, el:.08}, tempo:[1.3, .3, 2, .5], flecha:'root', flechaDesp:-60,
    musc:{cuadriceps:1, gluteos:1, aductores:.6, isquios:.35, lumbar:.3},
    txt:'Pecho arriba, espalda firme y rodillas en la línea de los pies. Bajá hasta que el muslo quede paralelo al piso.',
    A:{dirs:conj(sim({'upperleg01':[.12, -1, .02], 'lowerleg01':[.06, -1, -.02]}), MANOS_BARRA), giros:GIRO_BARRA, agarre:1},
    B:{dirs:conj(sim({'upperleg01':[.28, -.22, .93], 'lowerleg01':[.1, -.9, -.42]}), espalda(.62, -.05), MANOS_BARRA), giros:GIRO_BARRA, agarre:1},
    errores:[
      {n:'Rodillas adentro', flecha:'lowerleg01.L', flechaDesp:0, musc:{cuadriceps:.7, gluteos:.4},
       txt:'Las rodillas se van hacia adentro: carga la rodilla de costado. Empujalas hacia afuera, en la línea de las puntas de los pies.',
       B:{dirs:conj(sim({'upperleg01':[-.05, -.22, .97], 'lowerleg01':[.22, -.88, -.42]}), espalda(.62, -.05), MANOS_BARRA), giros:GIRO_BARRA, agarre:1}},
      {n:'Espalda redondeada', musc:{cuadriceps:.6, gluteos:.5}, malMusc:{lumbar:1},
       txt:'Si la espalda se redondea, la columna lumbar carga el peso. Mantené el pecho arriba y bajá solo hasta donde puedas con la espalda firme.',
       B:{dirs:conj(sim({'upperleg01':[.28, -.22, .93], 'lowerleg01':[.1, -.9, -.42]}), {spine05:[0, .8, .6], spine04:[0, .6, .8], spine03:[0, .45, .89], spine02:[0, .38, .92], spine01:[0, .32, .95], neck01:[0, .5, .87]}, MANOS_BARRA), giros:GIRO_BARRA, agarre:1}}
    ]
  },
  'press:barra':{
    obj:'barra', props:[...BANCO_PLANO, {t:'cil', r:.16, l:8.5, p:[3.6, PISO + 4.25, -3.6]}, {t:'cil', r:.16, l:8.5, p:[-3.6, PISO + 4.25, -3.6]}],
    cam:{az:1.1, y:-2, z:-.5, dist:30, el:.25}, tempo:[1, .3, 2, .4], flecha:'wrist.L', flechaDesp:30,
    musc:{pecho:1, triceps:.6, hombros:.5},
    txt:'Escápulas juntas y apoyadas, pies firmes en el piso. Bajá la barra hasta el pecho, con los codos a unos 45° del cuerpo.',
    A:conj(ACOSTADO, {manos:dos([0, -.8, -1.9], 2.7), polo:[.6, -1, .4], agarre:.9}),
    B:conj(ACOSTADO, {manos:dos([0, 3.3, -3.1], 2.7), polo:[.6, -1, .4], agarre:.9}),
    errores:[{n:'Codos muy abiertos', malMusc:{hombros:1}, musc:{pecho:.6, triceps:.4},
      txt:'Con los codos a 90° del cuerpo (en cruz) y la barra hacia el cuello, el hombro sufre. Llevalos a unos 45° y bajá a la mitad del pecho.',
      A:conj(ACOSTADO, {manos:dos([0, -.6, -3.4], 2.9), polo:[1, -.15, 0], agarre:.9}), B:conj(ACOSTADO, {manos:dos([0, 3.3, -3.2], 2.9), polo:[1, -.15, 0], agarre:.9})}]
  },
  'press:inclinado':{
    obj:'mancuernas', props:[{t:'caja', s:[3, .6, 7.5], p:[0, -2.9, -2.2], rot:[30, 0, 0]}, ...banco(0, -4.6, 1.3, 3, 3.2, .7)],
    cam:{az:1.15, y:-1, z:-.5, dist:30, el:.18}, tempo:[1, .3, 2, .4], flecha:'wrist.L', flechaDesp:30,
    musc:{pecho:1, hombros:.6, triceps:.5},
    txt:'Banco a 30°. Bajá las mancuernas al costado del pecho, con los codos un poco por debajo de los hombros, y subí juntándolas arriba.',
    A:{rot:[-60, 0, 0], pos:[0, -3.4, 1.0], pies:{L:[2.2, TOBILLO, 4.8], R:[-2.2, TOBILLO, 4.8]}, poloPies:[0, 1, .3], manos:{L:[3.1, .4, -1.7], R:[-3.1, .4, -1.7]}, polo:[.6, -1, .2], giros:{'lowerarm01.L':-1, 'lowerarm01.R':1}, agarre:.9},
    B:{rot:[-60, 0, 0], pos:[0, -3.4, 1.0], pies:{L:[2.2, TOBILLO, 4.8], R:[-2.2, TOBILLO, 4.8]}, poloPies:[0, 1, .3], manos:{L:[1.2, 5, -2.6], R:[-1.2, 5, -2.6]}, polo:[.6, -1, .2], giros:{'lowerarm01.L':-1, 'lowerarm01.R':1}, agarre:.9},
    errores:[{n:'Codos muy abiertos', malMusc:{hombros:1}, musc:{pecho:.6},
      txt:'Con los codos en cruz el hombro carga de más. Bajá con los codos a unos 45° del cuerpo.',
      A:{rot:[-60, 0, 0], pos:[0, -3.4, 1.0], pies:{L:[2.2, TOBILLO, 4.8], R:[-2.2, TOBILLO, 4.8]}, poloPies:[0, 1, .3], manos:{L:[3.6, .9, -2.7], R:[-3.6, .9, -2.7]}, polo:[1, -.1, 0], agarre:.9},
      B:{rot:[-60, 0, 0], pos:[0, -3.4, 1.0], pies:{L:[2.2, TOBILLO, 4.8], R:[-2.2, TOBILLO, 4.8]}, poloPies:[0, 1, .3], manos:{L:[1.4, 5, -2.6], R:[-1.4, 5, -2.6]}, polo:[1, -.1, 0], agarre:.9}}]
  },
  'remo:barra':{
    obj:'barra', cam:{az:1.3, y:-1, dist:34, el:.1}, tempo:[.9, .35, 1.7, .4], flecha:'wrist.L', flechaDesp:28,
    musc:{dorsales:1, trapecio:.6, biceps:.5, hombros:.3, lumbar:.3},
    txt:'Torso inclinado a unos 45°, espalda recta y rodillas un poco flexionadas. Tirá de la barra hacia el ombligo llevando los codos atrás.',
    A:{dirs:conj(inclinado(.72, .7), sim({'upperleg01':[.1, -.92, .38], 'lowerleg01':[.05, -.98, -.18], 'upperarm01':[.18, -1, .02], 'lowerarm01':[.06, -1, .02]})), agarre:.9},
    B:{dirs:conj(inclinado(.72, .7), sim({'upperleg01':[.1, -.92, .38], 'lowerleg01':[.05, -.98, -.18], 'upperarm01':[.35, -.25, -.9], 'lowerarm01':[.05, -1, .15]})), agarre:.9},
    errores:[{n:'Espalda redondeada', malMusc:{lumbar:1}, musc:{dorsales:.5},
      txt:'Con la espalda redondeada la zona lumbar carga el peso. Pecho afuera y espalda recta todo el tiempo.',
      A:{dirs:conj({spine05:[0, .6, .8], spine04:[0, .35, .94], spine03:[0, .15, .99], spine02:[0, .05, 1], spine01:[0, 0, 1], neck01:[0, .2, .98]}, sim({'upperleg01':[.1, -.92, .38], 'lowerleg01':[.05, -.98, -.18], 'upperarm01':[.18, -1, .02], 'lowerarm01':[.06, -1, .02]})), agarre:.9},
      B:{dirs:conj({spine05:[0, .6, .8], spine04:[0, .35, .94], spine03:[0, .15, .99], spine02:[0, .05, 1], spine01:[0, 0, 1], neck01:[0, .2, .98]}, sim({'upperleg01':[.1, -.92, .38], 'lowerleg01':[.05, -.98, -.18], 'upperarm01':[.35, -.25, -.9], 'lowerarm01':[.05, -1, .15]})), agarre:.9}},
      {n:'Subir el torso', malMusc:{lumbar:.8}, musc:{dorsales:.5, trapecio:.6},
      txt:'Si el torso sube en cada repetición, tirás con la espalda baja y el impulso. Quedate inclinado y movés solo los brazos.',
      B:{dirs:conj(inclinado(1, .2), sim({'upperleg01':[.1, -.98, .1], 'lowerleg01':[.05, -1, -.05], 'upperarm01':[.3, -.6, -.75], 'lowerarm01':[.05, -1, .1]})), agarre:.9}}]
  },
  'laterales:mancuernas':{
    obj:'mancuernas', cam:{az:.3, y:2.5, dist:40, el:.05}, tempo:[1, .35, 1.9, .45], flecha:'finger3-1.L', flechaDesp:0,
    musc:{hombros:1, trapecio:.3},
    txt:'Subí los brazos hacia los costados hasta la altura de los hombros, con los codos apenas doblados. Sin impulso.',
    A:{dirs:sim({'upperarm01':[.18, -1, .12], 'lowerarm01':[.15, -1, .18]}), agarre:.9},
    B:{dirs:sim({'upperarm01':[.97, -.05, .18], 'lowerarm01':[.96, .02, .25]}), agarre:.9},
    errores:[{n:'Subir de más', malMusc:{trapecio:1}, musc:{hombros:.5},
      txt:'Pasar la altura del hombro y encogerlo pasa el trabajo al trapecio. Frená cuando los brazos quedan horizontales.',
      B:{dirs:sim({'upperarm01':[.8, .42, .2], 'lowerarm01':[.78, .48, .25], 'clavicle':[.8, .35, 0]}), agarre:.9}}]
  },
  'abdominales:plancha':{
    obj:'', isometrico:true, sinFlecha:true, cam:{az:1.25, y:-5.8, z:-2, dist:36, el:.2}, tempo:[1.4, .8, 1.4, .8],
    musc:{abdomen:1, oblicuos:.6, hombros:.3, gluteos:.3, cuadriceps:.25},
    txt:'Codos debajo de los hombros y el cuerpo en línea recta de la cabeza a los talones. Apretá abdomen y cola, sin aguantar la respiración.',
    A:{rot:[78, 0, 0], pos:[0, -5.6, -.6], pies:{L:[1.3, -7.5, -8.6], R:[-1.3, -7.5, -8.6]}, poloPies:[0, -1, 0], dirs:conj(sim({'upperarm01':[.05, -1, .05], 'lowerarm01':[-.05, -.08, 1], 'foot':[0, -1, -.1]}))},
    B:{rot:[78, 0, 0], pos:[0, -5.5, -.6], pies:{L:[1.3, -7.5, -8.6], R:[-1.3, -7.5, -8.6]}, poloPies:[0, -1, 0], dirs:conj(sim({'upperarm01':[.05, -1, .05], 'lowerarm01':[-.05, -.08, 1], 'foot':[0, -1, -.1]}))},
    errores:[
      {n:'Cadera caída', malMusc:{lumbar:1}, musc:{abdomen:.4}, flecha:'root', flechaDesp:0,
       txt:'Si la cadera cae, la zona lumbar se arquea y carga. Apretá la cola y el abdomen hasta quedar en línea.',
       A:{rot:[78, 0, 0], pos:[0, -5.6, -.6], pies:{L:[1.3, -7.5, -8.6], R:[-1.3, -7.5, -8.6]}, poloPies:[0, -1, 0], dirs:sim({'upperarm01':[.05, -1, .05], 'lowerarm01':[-.05, -.08, 1], 'foot':[0, -1, -.1]})},
       B:{rot:[90, 0, 0], pos:[0, -6.7, -.5], pies:{L:[1.3, -7.5, -8.6], R:[-1.3, -7.5, -8.6]}, poloPies:[0, -1, 0], dirs:conj(sim({'upperarm01':[.05, -1, .05], 'lowerarm01':[-.05, -.08, 1], 'foot':[0, -1, -.1]}), {spine03:[0, -.25, 1], spine01:[0, -.05, 1], neck01:[0, .3, .95]})}},
      {n:'Cola muy arriba', musc:{abdomen:.3, hombros:.6}, flecha:'root', flechaDesp:0,
       txt:'Con la cola arriba el abdomen casi no trabaja. Bajá la cadera hasta que el cuerpo quede recto.',
       B:{rot:[60, 0, 0], pos:[0, -3.6, -1.2], pies:{L:[1.3, -7.5, -8.6], R:[-1.3, -7.5, -8.6]}, poloPies:[0, -1, 0], dirs:sim({'upperarm01':[.05, -1, .05], 'lowerarm01':[-.05, -.08, 1], 'foot':[0, -1, -.1]})}}]
  },
  'bisagra:rumano':{
    obj:'barra', cam:{az:1.35, y:-1.5, dist:34, el:.08}, tempo:[1.1, .3, 2, .4], flecha:'root', flechaDesp:-40,
    musc:{isquios:1, gluteos:1, lumbar:.5, trapecio:.2},
    txt:'Rodillas apenas flexionadas. Llevá la cadera atrás con la espalda recta y la barra pegada a las piernas, hasta sentir la parte de atrás del muslo.',
    A:{dirs:conj(inclinado(.62, .78), sim({'upperleg01':[.08, -.92, .4], 'lowerleg01':[.05, -1, -.08], 'upperarm01':[.15, -1, .05], 'lowerarm01':[.06, -1, 0]})), agarre:.9},
    B:{dirs:sim({'upperleg01':[.1, -1, .02], 'lowerleg01':[.06, -1, -.02], 'upperarm01':[.15, -1, .1], 'lowerarm01':[.06, -1, .05]}), agarre:.9},
    errores:[{n:'Espalda redondeada', malMusc:{lumbar:1}, musc:{isquios:.4, gluteos:.3},
      txt:'Redondear la espalda pasa toda la carga a la columna. Pecho afuera, mirada al frente-abajo y la barra rozando las piernas.',
      A:{dirs:conj({spine05:[0, .6, .8], spine04:[0, .3, .95], spine03:[0, .05, 1], spine02:[0, -.1, 1], spine01:[0, -.2, .98], neck01:[0, -.2, .98]}, sim({'upperleg01':[.08, -.95, .3], 'lowerleg01':[.05, -1, -.05], 'upperarm01':[.15, -1, .15], 'lowerarm01':[.06, -1, .1]})), agarre:.9}}]
  },
  'militar:barra':{
    obj:'barra', cam:{az:.9, y:3.4, dist:40, el:.05}, tempo:[1, .3, 2, .4], flecha:'wrist.L', flechaDesp:30,
    musc:{hombros:1, triceps:.6, trapecio:.4, abdomen:.2},
    txt:'De pie, abdomen y cola apretados. Empujá la barra desde el pecho hasta arriba de la cabeza, sin arquear la espalda.',
    A:{manos:dos([0, 6.2, 1.9], 2.5), polo:[.25, -1, .5], agarre:.9},
    B:{manos:dos([0, 11.6, .4], 2.5), polo:[.6, -.5, .2], agarre:.9},
    errores:[{n:'Arquear la espalda', malMusc:{lumbar:1}, musc:{hombros:.6},
      txt:'Echarse hacia atrás para subir la barra comprime la zona lumbar. Apretá cola y abdomen; si no sale, bajá el peso.',
      A:{manos:dos([0, 6.2, 1.9], 2.5), polo:[.25, -1, .5], agarre:.9, dirs:espalda(-.1)},
      B:{manos:dos([0, 10.6, 2.2], 2.5), polo:[.6, -.5, .2], agarre:.9, dirs:espalda(-.42)}}]
  },
  'jalon:jalon':{
    obj:'barraJalon', props:[...ASIENTO(0), {t:'cil', r:.38, l:4.2, p:[0, -1.4, 3.4], rot:[0, 0, 90], m:'pad'}, columna(0, -2.4), {t:'cable', de:[0, 11.4, .6], a:'manos'}],
    cam:{az:1.0, y:1.5, dist:42, el:.06}, tempo:[1, .4, 2, .4], flecha:'wrist.L', flechaDesp:30,
    musc:{dorsales:1, biceps:.5, trapecio:.4, hombros:.2},
    txt:'Sentado con las rodillas trabadas. Pecho arriba y un poco hacia atrás; bajá la barra al pecho llevando los codos hacia abajo y atrás.',
    A:{pos:[0, -2.6, -.2], pies:PIES_SENTADO(4.6), poloPies:[0, .3, 1], dirs:espalda(-.12), manos:dos([0, 9.6, .7], 3.4), polo:[.6, -1, -.3], agarre:.9},
    B:{pos:[0, -2.6, -.2], pies:PIES_SENTADO(4.6), poloPies:[0, .3, 1], dirs:espalda(-.2), manos:dos([0, 3.6, 1.7], 3.4), polo:[.6, -1, -.3], agarre:.9},
    errores:[{n:'Balancearte', malMusc:{lumbar:1}, musc:{dorsales:.5},
      txt:'Tirarse hacia atrás para bajar la barra usa el impulso del cuerpo. Quedate casi derecho y tirá con la espalda.',
      B:{pos:[0, -2.6, -.2], pies:PIES_SENTADO(4.6), poloPies:[0, .3, 1], dirs:espalda(-.55), manos:dos([0, 2.6, .9], 3.4), polo:[.6, -1, -.3], agarre:.9}}]
  },
  'jalon:dominada':{
    obj:'', props:[{t:'cil', r:.16, l:11, p:[0, 10.4, .6], rot:[0, 0, 90]}, {t:'cil', r:.2, l:18.6, p:[5.4, 1.1, .6]}, {t:'cil', r:.2, l:18.6, p:[-5.4, 1.1, .6]}],
    cam:{az:.8, y:3, dist:38, el:.05}, tempo:[1, .4, 2, .4], flecha:'root', flechaDesp:-40,
    musc:{dorsales:1, biceps:.6, trapecio:.4, antebrazos:.3},
    txt:'Agarre un poco más ancho que los hombros. Subí hasta pasar el mentón por encima de la barra y bajá controlado hasta estirar los brazos.',
    A:{pos:[0, -.4, -.4], manos:dos([0, 10.4, .6], 3.1), polo:[1, -.5, 0], agarre:.9, dirs:sim({'upperleg01':[.04, -1, .12], 'lowerleg01':[0, -.85, -.5]})},
    B:{pos:[0, 3.3, -.6], manos:dos([0, 10.4, .6], 3.1), polo:[1, -.5, 0], agarre:.9, dirs:conj(sim({'upperleg01':[.04, -1, .12], 'lowerleg01':[0, -.85, -.5]}), espalda(-.12))},
    errores:[{n:'Medio recorrido', musc:{dorsales:.5, biceps:.4}, malMusc:{trapecio:.6},
      txt:'Hacer solo la mitad de abajo o de arriba trabaja menos músculo. Bajá hasta estirar los brazos y subí hasta el mentón.',
      A:{pos:[0, 1.2, -.4], manos:dos([0, 10.4, .6], 3.1), polo:[1, -.5, 0], agarre:.9, dirs:sim({'upperleg01':[.04, -1, .12], 'lowerleg01':[0, -.85, -.5]})},
      B:{pos:[0, 2.2, -.5], manos:dos([0, 10.4, .6], 3.1), polo:[1, -.5, 0], agarre:.9, dirs:sim({'upperleg01':[.04, -1, .12], 'lowerleg01':[0, -.85, -.5]})}}]
  },
  'zancada:mancuernas':{
    obj:'mancuernas', cam:{az:1.25, y:-1, dist:36, el:.06}, tempo:[1.1, .3, 1.9, .4], flecha:'root', flechaDesp:-40,
    musc:{cuadriceps:1, gluteos:.9, aductores:.4, isquios:.3},
    txt:'Paso largo. Bajá derecho hasta que la rodilla de atrás casi toque el piso; la rodilla de adelante queda sobre el pie.',
    A:{pos:[0, .6, -.6], pies:{L:[1.2, TOBILLO, 3.2], R:[-1.2, -6.9, -4.6]}, poloPies:[0, 0, 1], dirs:sim({foot:[0, -.3, 1]}), agarre:.9},
    B:{pos:[0, -2.8, -.6], pies:{L:[1.2, TOBILLO, 3.2], R:[-1.2, -6.9, -4.6]}, poloPies:[0, 0, 1], dirs:sim({foot:[0, -.3, 1]}), agarre:.9},
    errores:[{n:'Rodilla adentro', flecha:'lowerleg01.L', flechaDesp:0, musc:{cuadriceps:.6, gluteos:.4},
      txt:'Si la rodilla de adelante se va hacia adentro, carga la rodilla. Mantenela en la línea del pie.',
      B:{pos:[0, -2.8, -.6], pies:{L:[1.2, TOBILLO, 3.2], R:[-1.2, -6.9, -4.6]}, poloPies:[-.9, 0, 1], dirs:sim({foot:[0, -.3, 1]}), agarre:.9}}]
  },
  'zancada:bulgara':{
    obj:'mancuernas', props:banco(0, -4.4, -6.4, 3, 3.4), cam:{az:1.3, y:-1.5, dist:38, el:.08}, tempo:[1.1, .3, 1.9, .4], flecha:'root', flechaDesp:-40,
    musc:{cuadriceps:1, gluteos:1, aductores:.4},
    txt:'Pie de atrás apoyado en el banco. Bajá derecho con la rodilla de adelante sobre el pie, hasta que el muslo quede casi paralelo.',
    A:{pos:[0, .4, -.9], pies:{L:[1.2, TOBILLO, 2.6], R:[-1.2, -3.4, -6.3]}, poloPies:[0, 0, 1], dirs:sim({foot:[0, -.3, 1]}), agarre:.9},
    B:{pos:[0, -2.6, -1.1], pies:{L:[1.2, TOBILLO, 2.6], R:[-1.2, -3.4, -6.3]}, poloPies:[0, 0, 1], dirs:conj(sim({foot:[0, -.3, 1]}), espalda(.15)), agarre:.9},
    errores:[{n:'Rodilla adentro', flecha:'lowerleg01.L', flechaDesp:0, musc:{cuadriceps:.6, gluteos:.4},
      txt:'La rodilla de adelante no se tiene que ir hacia adentro. Empujala hacia afuera, en la línea del pie.',
      B:{pos:[0, -2.6, -1.1], pies:{L:[1.2, TOBILLO, 2.6], R:[-1.2, -3.4, -6.3]}, poloPies:[-.9, 0, 1], dirs:conj(sim({foot:[0, -.3, 1]}), espalda(.15)), agarre:.9}}]
  },
  'triceps:polea':{
    obj:'barraPolea', props:[columna(0, 4.6), {t:'cable', de:[0, 11, 4], a:'manos'}], cam:{az:1.1, y:2, dist:30, el:.06}, tempo:[.9, .35, 1.7, .4], flecha:'wrist.L', flechaDesp:28,
    musc:{triceps:1},
    txt:'Codos pegados al cuerpo y quietos. Estirá los brazos hacia abajo y volvé despacio hasta que los antebrazos queden horizontales.',
    A:{dirs:conj(espalda(.12), sim({'upperarm01':[.12, -1, .1], 'lowerarm01':[.04, .1, 1]})), agarre:.9},
    B:{dirs:conj(espalda(.12), sim({'upperarm01':[.12, -1, .08], 'lowerarm01':[.04, -1, .12]})), agarre:.9},
    errores:[{n:'Mover los codos', malMusc:{hombros:.8, dorsales:.6}, musc:{triceps:.5},
      txt:'Si los codos van y vienen, empujás con el hombro y la espalda. Dejalos quietos al costado del cuerpo.',
      A:{dirs:conj(espalda(.12), sim({'upperarm01':[.25, -.6, .75], 'lowerarm01':[.04, .3, .95]})), agarre:.9},
      B:{dirs:conj(espalda(.25), sim({'upperarm01':[.15, -1, -.2], 'lowerarm01':[.04, -1, .1]})), agarre:.9}}]
  }  ,
  'sentadilla:prensa':{
    obj:'', props:[{t:'caja', s:[3.6, .6, 8], p:[0, -4.9, -2.6], rot:[45, 0, 0], m:'pad'}, {t:'caja', s:[3.6, .6, 3.2], p:[0, -5.6, .8], rot:[-10, 0, 0], m:'pad'}, {t:'caja', s:[1, 3, 1], p:[0, -6.9, -.4], m:'metal'},
      {t:'caja', s:[5.2, 4.2, .4], rot:[-37, 0, 0], m:'metal', sigue:['foot.L', 'foot.R'], off:[0, .2, .5]}, {t:'caja', s:[.3, .3, 14], p:[2.9, -3, 5.4], rot:[-37, 0, 0], m:'metal'}, {t:'caja', s:[.3, .3, 14], p:[-2.9, -3, 5.4], rot:[-37, 0, 0], m:'metal'}],
    cam:{az:1.45, y:-2.5, z:2, dist:38, el:.12}, tempo:[1.1, .3, 2, .4], flecha:'foot.L', flechaDesp:0,
    musc:{cuadriceps:1, gluteos:.7, aductores:.5},
    txt:'Espalda y cola bien apoyadas. Bajá la plataforma hasta que las rodillas formen unos 90° y empujá con todo el pie, sin trabar las rodillas arriba.',
    A:{rot:[-48, 0, 0], pos:[0, -4.2, -.2], pies:{L:[1.5, -1.6, 4.2], R:[-1.5, -1.6, 4.2]}, poloPies:[.1, 1, 0], dirs:conj(sim({foot:[0, .75, .65], 'upperarm01':[.35, -.75, .3], 'lowerarm01':[.1, -.4, .9]})), agarre:.8},
    B:{rot:[-48, 0, 0], pos:[0, -4.2, -.2], pies:{L:[1.5, .9, 7.4], R:[-1.5, .9, 7.4]}, poloPies:[.1, 1, 0], dirs:conj(sim({foot:[0, .75, .65], 'upperarm01':[.35, -.75, .3], 'lowerarm01':[.1, -.4, .9]})), agarre:.8},
    errores:[{n:'Despegar la cola', malMusc:{lumbar:1}, musc:{cuadriceps:.6}, flecha:'root', flechaDesp:0,
      txt:'Bajar de más hace que la cola se despegue del asiento y la zona lumbar se redondee. Bajá solo hasta donde la cola siga apoyada.',
      A:{rot:[-28, 0, 0], pos:[0, -3.6, .6], pies:{L:[1.5, -2.3, 3.4], R:[-1.5, -2.3, 3.4]}, poloPies:[.1, 1, 0], dirs:conj(sim({foot:[0, .75, .65], 'upperarm01':[.35, -.75, .3], 'lowerarm01':[.1, -.4, .9]})), agarre:.8}}]
  },
  'remo:mancuerna':{
    obj:'mancuerna', lado:'R', props:banco(1.3, -4.4, -.6, 3.2, 10), cam:{az:-1.2, y:-2, dist:34, el:.12}, tempo:[.9, .35, 1.7, .4], flecha:'wrist.R', flechaDesp:-26,
    musc:{dorsales:1, trapecio:.5, biceps:.5, hombros:.3},
    txt:'Rodilla y mano del mismo lado en el banco, espalda recta y paralela al piso. Tirá la mancuerna hacia la cadera llevando el codo atrás.',
    A:{rot:[78, 0, 0], pos:[0, -.2, -2], pies:{L:[1.3, -3.6, -5.6], R:[-1.9, TOBILLO, -2.2]}, poloPies:[0, -1, .3], manos:{L:[2.1, -3.7, 3.4], R:[-2, -4.8, 2.8]}, polo:[0, 1, -1], dirs:{'foot.L':[0, -.2, -1], 'foot.R':[0, -.3, 1]}, agarre:.9},
    B:{rot:[78, 0, 0], pos:[0, -.2, -2], pies:{L:[1.3, -3.6, -5.6], R:[-1.9, TOBILLO, -2.2]}, poloPies:[0, -1, .3], manos:{L:[2.1, -3.7, 3.4], R:[-2.1, -1.4, 1]}, polo:[0, 1, -1], dirs:{'foot.L':[0, -.2, -1], 'foot.R':[0, -.3, 1]}, agarre:.9},
    errores:[{n:'Girar el torso', malMusc:{lumbar:1}, musc:{dorsales:.5},
      txt:'Abrir el torso para subir la mancuerna usa el impulso y gira la columna. Dejá los hombros paralelos al piso y movés solo el brazo.',
      B:{rot:[78, 0, -28], pos:[0, .2, -2], pies:{L:[1.3, -3.6, -5.6], R:[-1.9, TOBILLO, -2.2]}, poloPies:[0, -1, .3], manos:{L:[2.1, -3.7, 3.4], R:[-2.4, 0, .4]}, polo:[0, 1, -1], dirs:{'foot.L':[0, -.2, -1], 'foot.R':[0, -.3, 1]}, agarre:.9}}]
  },
  'hipthrust:barra':{
    obj:'barra', barra:{hueso:'root', off:[0, -.1, 1.9], ancho:2.4, polo:[0, 1, 0]}, props:banco(0, -4.4, -3.8, 10, 2.6), cam:{az:1.35, y:-3, z:.5, dist:34, el:.12}, tempo:[.9, .5, 1.7, .4], flecha:'root', flechaDesp:-40,
    musc:{gluteos:1, isquios:.5, cuadriceps:.3},
    txt:'Parte alta de la espalda en el banco y pies firmes. Subí la cadera apretando la cola hasta que el cuerpo quede recto de hombros a rodillas; el mentón mira al pecho.',
    A:{rot:[-48, 0, 0], pos:[0, -5.6, -.6], pies:{L:[1.7, TOBILLO, 4], R:[-1.7, TOBILLO, 4]}, poloPies:[0, 1, .3], dirs:sim({foot:[0, -.3, 1]}), agarre:.9},
    B:{rot:[-88, 0, 0], pos:[0, -3.4, .4], pies:{L:[1.7, TOBILLO, 4], R:[-1.7, TOBILLO, 4]}, poloPies:[0, 1, .3], dirs:sim({foot:[0, -.3, 1]}), agarre:.9},
    errores:[{n:'Arquear la espalda', malMusc:{lumbar:1}, musc:{gluteos:.5},
      txt:'Si arqueás la zona lumbar arriba, la espalda hace el trabajo de la cola. Terminá con las costillas abajo y la pelvis metida.',
      B:{rot:[-100, 0, 0], pos:[0, -3, .5], pies:{L:[1.7, TOBILLO, 4], R:[-1.7, TOBILLO, 4]}, poloPies:[0, 1, .3], dirs:conj(sim({foot:[0, -.3, 1]}), {spine03:[0, -.25, -1], spine02:[0, -.3, -1], spine01:[0, -.15, -1]}), agarre:.9}}]
  },
  'facepull:polea':{
    obj:'soga', props:[columna(0, 7), {t:'cable', de:[0, 6.8, 6.4], a:'manos'}], cam:{az:1.0, y:3, z:1.5, dist:36, el:.1}, tempo:[.9, .5, 1.7, .4], flecha:'wrist.L', flechaDesp:26,
    musc:{hombros:1, trapecio:.7},
    txt:'Polea a la altura de la cara. Tirá la soga hacia la frente separando las manos y llevando los codos altos y hacia atrás.',
    A:{manos:dos([0, 6.6, 5.6], .55), polo:[1, .4, -.3], agarre:.9},
    B:{manos:dos([0, 7, 1.6], 1.9), polo:[1, .5, -.6], agarre:.9},
    errores:[{n:'Echarte atrás', malMusc:{lumbar:1}, musc:{hombros:.5},
      txt:'Si tirás echando el cuerpo hacia atrás, el hombro trabaja poco. Peso liviano, cuerpo quieto y movés solo los brazos.',
      B:{manos:dos([0, 6.4, .6], 1.4), polo:[1, -.2, -.6], dirs:espalda(-.4), agarre:.9}}]
  },
  'pantorrillas:pie':{
    obj:'', props:[{t:'caja', s:[6, .8, 2.2], p:[0, PISO + .4, 1.6]}], cam:{az:1.25, y:-2, dist:38, el:.05}, tempo:[.8, .6, 1.6, .4], flecha:'foot.L', flechaDesp:22,
    musc:{pantorrillas:1},
    txt:'Puntas en el escalón y talones afuera. Subí lo más alto que puedas, aguantá un segundo arriba y bajá lento hasta estirar.',
    A:{pos:[0, 1.5, -.58], dirs:sim({foot:[0, .2, 1]})},
    B:{pos:[0, 3, -.58], dirs:sim({foot:[0, -.9, .45]})},
    errores:[{n:'Rebotar', musc:{pantorrillas:.5},
      txt:'Rebotar abajo y hacer medio recorrido usa el tendón y no el músculo. Bajá lento, pausa abajo y arriba.',
      A:{pos:[0, 2.1, -.58], dirs:sim({foot:[0, -.3, 1]})}, B:{pos:[0, 2.6, -.58], dirs:sim({foot:[0, -.65, .75]})}}]
  },
  'curlfem:acostado':{
    obj:'', sinBase:true, props:[...banco(0, -4.6, 1.2, 3.2, 9.5), rodillo(['foot.L', 'foot.R'], [0, .55, -.2])], cam:{az:-1.35, y:-3, z:-2.5, dist:40, el:.14}, tempo:[.9, .4, 1.8, .4], flecha:'foot.L', flechaDesp:0,
    musc:{isquios:1, pantorrillas:.3},
    txt:'Acostado boca abajo con la cadera pegada al banco. Llevá los talones hacia la cola y bajá lento sin estirar del todo.',
    A:{rot:[90, 0, 0], pos:[0, -3.1, -1.4], dirs:conj(sim({'upperleg01':[.05, -.05, -1], 'lowerleg01':[0, -.05, -1], 'upperarm01':[.4, -.85, .3], 'lowerarm01':[0, -.2, 1], foot:[0, -1, -.1]})), agarre:.9},
    B:{rot:[90, 0, 0], pos:[0, -3.1, -1.4], dirs:conj(sim({'upperleg01':[.05, -.05, -1], 'lowerleg01':[0, .92, -.38], 'upperarm01':[.4, -.85, .3], 'lowerarm01':[0, -.2, 1], foot:[0, .2, -1]})), agarre:.9},
    errores:[{n:'Levantar la cadera', malMusc:{lumbar:1}, musc:{isquios:.5}, flecha:'root',
      txt:'Si la cadera se despega del banco, la zona lumbar ayuda. Apretá la cadera contra el banco y bajá el peso.',
      B:{rot:[72, 0, 0], pos:[0, -2.2, -1.4], dirs:conj(sim({'upperleg01':[.05, -.4, -.9], 'lowerleg01':[0, .92, -.38], 'upperarm01':[.4, -.85, .3], 'lowerarm01':[0, -.2, 1], foot:[0, .2, -1]})), agarre:.9}}]
  },
  'remo:polea':{
    obj:'manija', props:[{t:'caja', s:[3.4, .6, 5.2], p:[0, -6.1, 0], m:'pad'}, {t:'caja', s:[4, 3.6, .4], p:[0, -6.4, 7.4], rot:[-20, 0, 0], m:'metal'}, columna(0, 9.6, 6), {t:'cable', de:[0, -3, 9.2], a:'manos'}],
    cam:{az:1.35, y:-2.5, z:2.5, dist:38, el:.1}, tempo:[.9, .4, 1.8, .4], flecha:'wrist.L', flechaDesp:-26,
    musc:{dorsales:1, trapecio:.6, biceps:.4, hombros:.3},
    txt:'Sentado con la espalda recta y las rodillas un poco flexionadas. Tirá la manija al abdomen juntando las escápulas, sin balancearte.',
    A:{pos:[0, -4.9, -.6], pies:{L:[1.2, -5.9, 7.1], R:[-1.2, -5.9, 7.1]}, poloPies:[0, 1, .2], dirs:conj(sim({foot:[0, .25, 1]}), espalda(.12)), manos:dos([0, -2, 6.8], .5), polo:[.2, -1, -.3], agarre:.9},
    B:{pos:[0, -4.9, -.6], pies:{L:[1.2, -5.9, 7.1], R:[-1.2, -5.9, 7.1]}, poloPies:[0, 1, .2], dirs:conj(sim({foot:[0, .25, 1]})), manos:dos([0, -2.3, 2.3], .5), polo:[.2, -.6, -1], agarre:.9},
    errores:[{n:'Balancear el torso', malMusc:{lumbar:1}, musc:{dorsales:.5},
      txt:'Ir y venir con el torso convierte el remo en un movimiento de espalda baja. Torso quieto y movés solo los brazos.',
      A:{pos:[0, -4.9, -.6], pies:{L:[1.2, -5.9, 7.1], R:[-1.2, -5.9, 7.1]}, poloPies:[0, 1, .2], dirs:conj(sim({foot:[0, .25, 1]}), inclinado(.55, .84)), manos:dos([0, -2.6, 7.4], .5), polo:[.2, -1, -.3], agarre:.9},
      B:{pos:[0, -4.9, -.6], pies:{L:[1.2, -5.9, 7.1], R:[-1.2, -5.9, 7.1]}, poloPies:[0, 1, .2], dirs:conj(sim({foot:[0, .25, 1]}), espalda(-.45)), manos:dos([0, -2.2, 1.6], .5), polo:[.2, -.6, -1], agarre:.9}}]
  },
  'triceps:mancuerna':{
    obj:'mancuerna', lado:'ambas', cam:{az:1.2, y:4.6, dist:42, el:.05}, tempo:[.9, .35, 1.8, .4], flecha:'wrist.L', flechaDesp:26,
    musc:{triceps:1},
    txt:'Codos apuntando al techo y cerca de la cabeza. Bajá la mancuerna detrás de la nuca y estirá los brazos sin mover los codos.',
    A:{manos:dos([0, 6.3, -1.4], .3), polo:[.3, 1, .45], agarre:.9},
    B:{manos:dos([0, 11.3, .3], .3), polo:[.3, 1, .45], agarre:.9},
    errores:[{n:'Codos abiertos', malMusc:{hombros:1}, musc:{triceps:.5},
      txt:'Si los codos se abren hacia los costados, el hombro carga de más. Mantenelos cerca de la cabeza.',
      A:{manos:dos([0, 6.6, -1.2], .3), polo:[1, .5, 0], agarre:.9}, B:{manos:dos([0, 11.3, .3], .3), polo:[1, .5, 0], agarre:.9}}]
  },
  'extension:maquina':{
    obj:'', props:[...ASIENTO(-.4, -3.8), {t:'caja', s:[3.4, 6, .6], p:[0, -.6, -2.3], rot:[-12, 0, 0], m:'pad'}, rodillo(['foot.L', 'foot.R'], [0, 0, .6])],
    cam:{az:1.35, y:-2.5, z:2.5, dist:36, el:.08}, tempo:[.9, .5, 1.8, .4], flecha:'foot.L', flechaDesp:0,
    musc:{cuadriceps:1},
    txt:'Espalda apoyada y rodillas al borde del asiento. Estirá las piernas hasta arriba, aguantá un segundo y bajá lento.',
    A:{pos:[0, -2.7, -1], dirs:conj(sim({'upperleg01':[.07, -.08, 1], 'lowerleg01':[0, -1, -.12], foot:[0, -.2, 1], 'upperarm01':[.35, -.95, -.1], 'lowerarm01':[.1, -1, .1]})), agarre:.9},
    B:{pos:[0, -2.7, -1], dirs:conj(sim({'upperleg01':[.07, -.08, 1], 'lowerleg01':[0, .05, 1], foot:[0, .9, .4], 'upperarm01':[.35, -.95, -.1], 'lowerarm01':[.1, -1, .1]})), agarre:.9},
    errores:[{n:'Patear con impulso', malMusc:{lumbar:.6}, musc:{cuadriceps:.6},
      txt:'Patear rápido y despegar la cola del asiento usa el impulso y estresa la rodilla. Subí controlado y bajá en 2 segundos.',
      B:{pos:[0, -2.1, -.6], rot:[-14, 0, 0], dirs:conj(sim({'upperleg01':[.07, .1, 1], 'lowerleg01':[0, .4, .9], foot:[0, .95, .2], 'upperarm01':[.35, -.95, -.1], 'lowerarm01':[.1, -1, .1]})), agarre:.9}}]
  },
  'curlfem:sentado':{
    obj:'', props:[...ASIENTO(-.4, -3.8), {t:'caja', s:[3.4, 6, .6], p:[0, -.6, -2.3], rot:[-12, 0, 0], m:'pad'}, {t:'cil', r:.38, l:3.6, p:[0, -1.5, 2.4], rot:[0, 0, 90], m:'pad'}, rodillo(['foot.L', 'foot.R'], [0, -.2, -.6])],
    cam:{az:1.35, y:-3, z:1, dist:34, el:.08}, tempo:[.9, .5, 1.8, .4], flecha:'foot.L', flechaDesp:0,
    musc:{isquios:1, pantorrillas:.3},
    txt:'Rodillo de arriba sobre los muslos y el de abajo detrás de los tobillos. Llevá los talones hacia abajo y atrás, y volvé lento.',
    A:{pos:[0, -2.7, -1], dirs:conj(sim({'upperleg01':[.07, -.08, 1], 'lowerleg01':[0, .05, 1], foot:[0, .9, .4], 'upperarm01':[.35, -.95, -.1], 'lowerarm01':[.1, -1, .1]})), agarre:.9},
    B:{pos:[0, -2.7, -1], dirs:conj(sim({'upperleg01':[.07, -.08, 1], 'lowerleg01':[0, -.95, -.3], foot:[0, -.3, 1], 'upperarm01':[.35, -.95, -.1], 'lowerarm01':[.1, -1, .1]})), agarre:.9},
    errores:[{n:'Despegar la cola', malMusc:{lumbar:.6}, musc:{isquios:.5},
      txt:'Si la cola se levanta del asiento, el movimiento se acorta y empuja la cadera. Ajustá el rodillo de los muslos y bajá el peso.',
      B:{pos:[0, -2.1, -.4], rot:[-12, 0, 0], dirs:conj(sim({'upperleg01':[.07, .15, 1], 'lowerleg01':[0, -.7, .7], foot:[0, -.1, 1], 'upperarm01':[.35, -.95, -.1], 'lowerarm01':[.1, -1, .1]})), agarre:.9}}]
  },
  'aductores:maquina':{
    obj:'', props:[...ASIENTO(-.4, -3.8), {t:'caja', s:[3.4, 6, .6], p:[0, -.6, -2.3], rot:[-12, 0, 0], m:'pad'},
      {t:'caja', s:[.5, 2.2, 1.6], m:'pad', sigue:['lowerleg01.L'], off:[-.6, -.6, 0]}, {t:'caja', s:[.5, 2.2, 1.6], m:'pad', sigue:['lowerleg01.R'], off:[.6, -.6, 0]}],
    cam:{az:.35, y:-3, z:1, dist:34, el:.15}, tempo:[.9, .5, 1.8, .4], flecha:'lowerleg01.L', flechaDesp:0,
    musc:{aductores:1},
    txt:'Espalda apoyada. Cerrá las piernas apretando la parte interna del muslo y abrí lento, sin dejar que el peso te abra de golpe.',
    A:{pos:[0, -2.7, -1], dirs:conj(sim({'upperleg01':[.72, -.08, .7], 'lowerleg01':[.1, -1, 0], foot:[.2, -.2, 1], 'upperarm01':[.35, -.95, -.1], 'lowerarm01':[.1, -1, .1]})), agarre:.9},
    B:{pos:[0, -2.7, -1], dirs:conj(sim({'upperleg01':[.12, -.08, 1], 'lowerleg01':[.02, -1, 0], foot:[0, -.2, 1], 'upperarm01':[.35, -.95, -.1], 'lowerarm01':[.1, -1, .1]})), agarre:.9},
    errores:[{n:'Abrir de golpe', musc:{aductores:.5},
      txt:'Dejar que las piernas se abran rápido estira de golpe la ingle. Volvé en 2 segundos y abrí solo hasta donde controles.',
      A:{pos:[0, -2.7, -1], dirs:conj(sim({'upperleg01':[.9, -.08, .4], 'lowerleg01':[.15, -1, 0], foot:[.3, -.2, 1], 'upperarm01':[.35, -.95, -.1], 'lowerarm01':[.1, -1, .1]})), agarre:.9}}]
  },
  'pantorrillas:sentado':{
    obj:'', props:[...ASIENTO(-.6, -3.8), {t:'caja', s:[4.2, .5, 1.2], m:'pad', sigue:['lowerleg01.L', 'lowerleg01.R'], off:[0, .6, -.4]}, {t:'caja', s:[5, .6, 2], p:[0, PISO + .3, 4.6]}],
    cam:{az:1.3, y:-4, z:1.5, dist:30, el:.06}, tempo:[.8, .6, 1.6, .4], flecha:'lowerleg01.L', flechaDesp:20,
    musc:{pantorrillas:1},
    txt:'Almohadilla sobre las rodillas y puntas en el escalón. Subí los talones lo más alto posible, pausa, y bajá lento hasta estirar.',
    A:{pos:[0, -2.7, -1.2], dirs:conj(sim({'upperleg01':[.08, -.05, 1], 'lowerleg01':[0, -1, .05], foot:[0, .3, 1], 'upperarm01':[.3, -.8, .5], 'lowerarm01':[0, -.2, 1]})), agarre:.9},
    B:{pos:[0, -2.2, -1.2], dirs:conj(sim({'upperleg01':[.08, .05, 1], 'lowerleg01':[0, -1, .05], foot:[0, -.75, .65], 'upperarm01':[.3, -.8, .5], 'lowerarm01':[0, -.2, 1]})), agarre:.9},
    errores:[{n:'Rebotar', musc:{pantorrillas:.5},
      txt:'Rebotar y hacer medio recorrido trabaja poco el sóleo. Bajá hasta estirar, pausa, y subí hasta arriba.',
      A:{pos:[0, -2.5, -1.2], dirs:conj(sim({'upperleg01':[.08, 0, 1], 'lowerleg01':[0, -1, .05], foot:[0, -.2, 1], 'upperarm01':[.3, -.8, .5], 'lowerarm01':[0, -.2, 1]})), agarre:.9},
      B:{pos:[0, -2.3, -1.2], dirs:conj(sim({'upperleg01':[.08, .03, 1], 'lowerleg01':[0, -1, .05], foot:[0, -.5, .85], 'upperarm01':[.3, -.8, .5], 'lowerarm01':[0, -.2, 1]})), agarre:.9}}]
  },
  'abdominales:pallof':{
    obj:'manija', props:[columna(-7.5, 1.8), {t:'cable', de:[-7, 4.2, 1.8], a:'manos'}], cam:{az:.25, y:2, dist:38, el:.08}, tempo:[1, .8, 1.4, .4], flecha:'wrist.L', flechaDesp:0,
    musc:{oblicuos:1, abdomen:.8, gluteos:.3},
    txt:'De costado a la polea, pies al ancho de los hombros. Estirá los brazos al frente sin dejar que el cable te gire, aguantá y volvé.',
    A:{manos:dos([0, 4.2, 1.9], .3), polo:[.2, -1, -.4], dirs:sim({'upperleg01':[.18, -1, .05], 'lowerleg01':[.1, -1, .02]}), agarre:.9},
    B:{manos:dos([0, 4.4, 5.8], .3), polo:[.2, -1, -.4], dirs:sim({'upperleg01':[.18, -1, .05], 'lowerleg01':[.1, -1, .02]}), agarre:.9},
    errores:[{n:'Dejarte girar', malMusc:{lumbar:1}, musc:{oblicuos:.4},
      txt:'Si el torso gira hacia la polea, el abdomen no está frenando la rotación. Bajá el peso y mantené el pecho al frente.',
      B:{rot:[0, -28, 0], manos:dos([-2.6, 4.4, 5.2], .3), polo:[.2, -1, -.4], dirs:sim({'upperleg01':[.18, -1, .05], 'lowerleg01':[.1, -1, .02]}), agarre:.9}}]
  },
  'fondos:paralelas':{
    obj:'', props:[{t:'cil', r:.18, l:9, p:[2.6, 3, 1.2], rot:[90, 0, 0]}, {t:'cil', r:.18, l:9, p:[-2.6, 3, 1.2], rot:[90, 0, 0]}, {t:'cil', r:.2, l:11.2, p:[2.6, -2.6, 4.6]}, {t:'cil', r:.2, l:11.2, p:[-2.6, -2.6, 4.6]}, {t:'cil', r:.2, l:11.2, p:[2.6, -2.6, -2.2]}, {t:'cil', r:.2, l:11.2, p:[-2.6, -2.6, -2.2]}],
    cam:{az:1.2, y:2.5, dist:40, el:.08}, tempo:[1, .35, 1.9, .4], flecha:'root', flechaDesp:-40,
    musc:{triceps:1, pecho:.8, hombros:.5},
    txt:'Brazos estirados sobre las barras y el torso un poco inclinado. Bajá hasta que los codos queden a 90° y subí empujando.',
    A:{pos:[0, 3.7, -.4], rot:[8, 0, 0], manos:dos([0, 3.2, 1.2], 2.6), polo:[0, 0, -1], dirs:sim({'upperleg01':[.05, -1, .25], 'lowerleg01':[0, -.8, -.6]}), agarre:.9},
    B:{pos:[0, 1, -.9], rot:[22, 0, 0], manos:dos([0, 3.2, 1.2], 2.6), polo:[0, .2, -1], dirs:sim({'upperleg01':[.05, -1, .25], 'lowerleg01':[0, -.8, -.6]}), agarre:.9},
    errores:[{n:'Bajar de más', malMusc:{hombros:1}, musc:{triceps:.5, pecho:.5},
      txt:'Bajar demasiado estira el hombro en una posición riesgosa. Frená cuando los codos llegan a 90°.',
      B:{pos:[0, -.6, -1.1], rot:[25, 0, 0], manos:dos([0, 3.2, 1.2], 2.6), polo:[0, .4, -1], dirs:sim({'upperleg01':[.05, -1, .25], 'lowerleg01':[0, -.8, -.6]}), agarre:.9}}]
  },
  'militar:mancuernas':{
    obj:'mancuernas', props:[...ASIENTO(-.6, -3.8), {t:'caja', s:[3.4, 7.5, .6], p:[0, 0, -2.4], rot:[-6, 0, 0], m:'pad'}],
    cam:{az:.8, y:1.5, dist:38, el:.05}, tempo:[1, .3, 1.9, .4], flecha:'wrist.L', flechaDesp:24,
    musc:{hombros:1, triceps:.5, trapecio:.3},
    txt:'Sentado con la espalda apoyada. Arrancá con las palmas hacia vos y, mientras subís, girá las manos hasta que miren al frente.',
    A:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], manos:{L:[1.3, 3.6, 1.2], R:[-1.3, 3.6, 1.2]}, polo:[.1, -1, .8], giros:{'lowerarm01.L':.9, 'lowerarm01.R':-.9}, agarre:.9},
    B:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], manos:{L:[1.8, 8.2, -.6], R:[-1.8, 8.2, -.6]}, polo:[1, -.6, 0], giros:{'lowerarm01.L':-.8, 'lowerarm01.R':.8}, agarre:.9},
    errores:[{n:'Arquear la espalda', malMusc:{lumbar:1}, musc:{hombros:.5},
      txt:'Despegar la espalda del respaldo y arquearla para empujar carga la zona lumbar. Espalda apoyada y abdomen firme.',
      B:{pos:[0, -2.5, -.6], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], dirs:espalda(-.35), manos:{L:[1.8, 7.6, 1.2], R:[-1.8, 7.6, 1.2]}, polo:[1, -.6, 0], giros:{'lowerarm01.L':-.8, 'lowerarm01.R':.8}, agarre:.9}}]
  },
  'curl:scott':{
    obj:'barraZ', props:[...ASIENTO(-1, -3.8), {t:'caja', s:[4, .6, 3.4], p:[0, 1.2, 2.2], rot:[-48, 0, 0], m:'pad'}, {t:'caja', s:[.8, 6.6, .8], p:[0, -4.9, 2.8], m:'metal'}],
    cam:{az:1.3, y:1, z:1.5, dist:30, el:.1}, tempo:[1, .35, 1.9, .45], flecha:'wrist.L', flechaDesp:24,
    musc:{biceps:1, antebrazos:.4},
    txt:'Axilas sobre el borde del banco y brazos apoyados. Subí la barra sin despegar los codos y bajá hasta casi estirar.',
    A:{pos:[0, -2.5, -1.4], pies:PIES_SENTADO(3.2), poloPies:[0, .3, 1], dirs:conj(espalda(.25), sim({'upperarm01':[.2, -.62, .76], 'lowerarm01':[.08, -.62, .78]})), giros:SUPINAR, agarre:.9},
    B:{pos:[0, -2.5, -1.4], pies:PIES_SENTADO(3.2), poloPies:[0, .3, 1], dirs:conj(espalda(.25), sim({'upperarm01':[.2, -.62, .76], 'lowerarm01':[.04, .85, .5]})), giros:SUPINAR, agarre:.9},
    errores:[{n:'Despegar los codos', malMusc:{hombros:1}, musc:{biceps:.5},
      txt:'Si los codos se levantan del banco, el hombro ayuda a subir. Dejalos apoyados todo el recorrido.',
      B:{pos:[0, -2.2, -1.6], pies:PIES_SENTADO(3.2), poloPies:[0, .3, 1], dirs:conj(espalda(-.05), sim({'upperarm01':[.2, -.1, .98], 'lowerarm01':[.04, .9, .3]})), giros:SUPINAR, agarre:.9}}]
  },
  'triceps:frances':{
    obj:'barraZ', props:BANCO_PLANO, cam:{az:1.2, y:-1.5, z:-.5, dist:32, el:.22}, tempo:[.9, .35, 1.9, .4], flecha:'wrist.L', flechaDesp:26,
    musc:{triceps:1},
    txt:'Acostado, brazos verticales y codos quietos. Bajá la barra hacia la frente doblando solo los codos y volvé a estirar.',
    A:conj(ACOSTADO, {dirs:conj(sim({foot:[0, -.3, 1], 'upperarm01':[.12, .97, -.22], 'lowerarm01':[.06, -.25, -.97]})), agarre:.9}),
    B:conj(ACOSTADO, {dirs:conj(sim({foot:[0, -.3, 1], 'upperarm01':[.12, .97, -.22], 'lowerarm01':[.05, .98, -.15]})), agarre:.9}),
    errores:[{n:'Codos abiertos', malMusc:{hombros:1}, musc:{triceps:.5},
      txt:'Abrir los codos hacia afuera pasa la carga al hombro y al codo. Mantenelos apuntando al techo y al ancho de los hombros.',
      A:conj(ACOSTADO, {dirs:conj(sim({foot:[0, -.3, 1], 'upperarm01':[.55, .8, -.25], 'lowerarm01':[-.3, -.25, -.92]})), agarre:.9}),
      B:conj(ACOSTADO, {dirs:conj(sim({foot:[0, -.3, 1], 'upperarm01':[.55, .8, -.25], 'lowerarm01':[-.1, .98, -.1]})), agarre:.9})}]
  },
  'curlfem:nordico':{
    obj:'', props:[{t:'cil', r:.4, l:4.4, p:[0, -7.3, -4.4], rot:[0, 0, 90], m:'pad'}, {t:'caja', s:[4.4, .5, 5], p:[0, PISO + .25, -1.6], m:'pad'}],
    cam:{az:1.45, y:-3.5, z:1.5, dist:34, el:.1}, tempo:[1, .2, 2.6, .5], flecha:'neck01', flechaDesp:0,
    musc:{isquios:1, gluteos:.4},
    txt:'De rodillas con los tobillos sujetos. Con el cuerpo recto de rodillas a cabeza, dejate caer hacia adelante lo más lento posible frenando con los isquios.',
    A:{rot:[52, 0, 0], pos:[0, -4.85, 2.6], pies:{L:[1.3, -7.3, -4], R:[-1.3, -7.3, -4]}, poloPies:[0, -1, .3], dirs:sim({'upperarm01':[.3, -.5, .8], 'lowerarm01':[.1, -.3, .95], foot:[0, -.2, -1]})},
    B:{rot:[0, 0, 0], pos:[0, -3.1, -.3], pies:{L:[1.3, -7.3, -4], R:[-1.3, -7.3, -4]}, poloPies:[0, -1, .3], dirs:sim({'upperarm01':[.3, -.9, .3], 'lowerarm01':[.1, -.5, .85], foot:[0, -.2, -1]})},
    errores:[{n:'Doblar la cadera', malMusc:{lumbar:.6}, musc:{isquios:.4},
      txt:'Si bajás doblando la cadera, los isquios casi no frenan. Mantené el cuerpo recto de las rodillas a la cabeza.',
      A:{rot:[10, 0, 0], pos:[0, -3.3, .1], pies:{L:[1.3, -7.3, -4], R:[-1.3, -7.3, -4]}, poloPies:[0, -1, .3], dirs:conj(inclinado(.2, .98), sim({'upperarm01':[.3, -.5, .8], 'lowerarm01':[.1, -.3, .95], foot:[0, -.2, -1]}))}}]
  },
  'pajaros:mancuernas':{
    obj:'mancuernas', cam:{az:.9, y:-.5, dist:36, el:.2}, tempo:[.9, .4, 1.8, .4], flecha:'finger3-1.L', flechaDesp:0,
    musc:{hombros:1, trapecio:.6},
    txt:'Torso casi paralelo al piso y espalda recta. Abrí los brazos hacia los costados con los codos apenas doblados, como un pájaro.',
    A:{dirs:conj(inclinado(.3, .95), sim({'upperleg01':[.1, -.9, .42], 'lowerleg01':[.05, -.98, -.15], 'upperarm01':[.15, -1, .1], 'lowerarm01':[.1, -1, .12]})), agarre:.9},
    B:{dirs:conj(inclinado(.3, .95), sim({'upperleg01':[.1, -.9, .42], 'lowerleg01':[.05, -.98, -.15], 'upperarm01':[.96, -.25, 0], 'lowerarm01':[.94, -.3, .1]})), agarre:.9},
    errores:[{n:'Usar impulso', malMusc:{lumbar:.8, trapecio:.8}, musc:{hombros:.4},
      txt:'Levantar el torso y tirar con impulso pasa el trabajo a la espalda baja y al trapecio. Peso liviano y torso quieto.',
      B:{dirs:conj(inclinado(.75, .65), sim({'upperleg01':[.1, -.95, .25], 'lowerleg01':[.05, -1, -.1], 'upperarm01':[.8, .3, -.4], 'lowerarm01':[.8, .35, -.3]})), agarre:.9}}]
  },
  'curl:muneca':{
    obj:'mancuernas', props:[...ASIENTO(-.6, -3.8)], cam:{az:1.2, y:-2, z:2, dist:26, el:.15}, tempo:[.8, .4, 1.5, .4], flecha:'finger3-1.L', flechaDesp:0,
    musc:{antebrazos:1},
    txt:'Antebrazos apoyados sobre los muslos con las muñecas afuera. Subí la mancuerna doblando solo la muñeca y bajá lento.',
    A:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8, 1.2), poloPies:[0, .3, 1], dirs:conj(espalda(.45), sim({'upperarm01':[.15, -.85, .5], 'lowerarm01':[-.08, -.18, .98], wrist:[0, -.8, .6]})), giros:SUPINAR, agarre:.9},
    B:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8, 1.2), poloPies:[0, .3, 1], dirs:conj(espalda(.45), sim({'upperarm01':[.15, -.85, .5], 'lowerarm01':[-.08, -.18, .98], wrist:[0, .55, .83]})), giros:SUPINAR, agarre:.9},
    errores:[{n:'Mover el brazo', musc:{antebrazos:.5}, malMusc:{biceps:.6},
      txt:'Si levantás el antebrazo del muslo, el bíceps hace el trabajo. Dejá el antebrazo apoyado y movés solo la muñeca.',
      B:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8, 1.2), poloPies:[0, .3, 1], dirs:conj(espalda(.45), sim({'upperarm01':[.15, -.85, .5], 'lowerarm01':[-.05, .35, .94], wrist:[0, .55, .83]})), giros:SUPINAR, agarre:.9}}]
  }
};

// Otras variantes de los mismos movimientos (algunas reutilizan una de arriba con otro elemento o aparato)
const X = EJ3D, cambiar = (k, extra) => Object.assign({}, X[k], extra);
const BRAZOS_PECHO = sim({'upperarm01':[.32, -.82, .45], 'lowerarm01':[-.42, .45, .8]});
const SENT_A = sim({'upperleg01':[.12, -1, .02], 'lowerleg01':[.06, -1, -.02]}), SENT_B = sim({'upperleg01':[.28, -.22, .93], 'lowerleg01':[.1, -.9, -.42]});
Object.assign(EJ3D, {
  'sentadilla:mancuerna':cambiar('sentadilla:barra', {obj:'mancuerna', lado:'ambas', barra:null, cam:{az:.95, y:-.5, dist:36, el:.08},
    txt:'Mancuerna pegada al pecho, codos hacia abajo. Bajá entre las rodillas con el pecho arriba hasta que los muslos queden paralelos.',
    A:{dirs:conj(SENT_A, BRAZOS_PECHO), agarre:.9}, B:{dirs:conj(SENT_B, espalda(.4, -.05), BRAZOS_PECHO), agarre:.9},
    errores:[{n:'Rodillas adentro', flecha:'lowerleg01.L', flechaDesp:0, musc:{cuadriceps:.7, gluteos:.4}, txt:'Las rodillas no se tienen que ir hacia adentro. Empujalas hacia afuera, en la línea de los pies.',
      B:{dirs:conj(sim({'upperleg01':[-.05, -.22, .97], 'lowerleg01':[.22, -.88, -.42]}), espalda(.4, -.05), BRAZOS_PECHO), agarre:.9}}]}),
  'sentadilla:libre':cambiar('sentadilla:barra', {obj:'', barra:null, anim:'sentadilla_libre',
    txt:'Brazos al frente para equilibrarte. Bajá como sentándote en una silla, pecho arriba y talones apoyados.',
    A:{dirs:conj(SENT_A, sim({'upperarm01':[.15, -.1, 1], 'lowerarm01':[.1, -.05, 1]}))}, B:{dirs:conj(SENT_B, espalda(.55, -.05), sim({'upperarm01':[.15, -.1, 1], 'lowerarm01':[.1, -.05, 1]}))},
    errores:[{n:'Talones arriba', musc:{cuadriceps:.7}, malMusc:{pantorrillas:.6}, txt:'Si se levantan los talones, el peso va a la punta del pie y a la rodilla. Mantené el pie entero apoyado y llevá la cola atrás.',
      B:{dirs:conj(sim({'upperleg01':[.25, -.35, .9], 'lowerleg01':[.08, -.75, -.65], foot:[0, -.75, .65]}), espalda(.35, -.05), sim({'upperarm01':[.15, -.1, 1], 'lowerarm01':[.1, -.05, 1]}))}}]}),
  'sentadilla:hack':cambiar('sentadilla:barra', {obj:'', barra:null, props:[{t:'caja', s:[3.6, 10, .6], p:[0, 0, -2.4], rot:[-18, 0, 0], m:'pad'}, {t:'caja', s:[5, .4, 3.4], p:[0, PISO + .2, 1.6], rot:[-10, 0, 0], m:'metal'}],
    txt:'Espalda apoyada en el respaldo y pies un poco adelante. Bajá hasta que los muslos queden paralelos y empujá con todo el pie.',
    A:{dirs:conj(SENT_A, espalda(-.2), sim({'upperarm01':[.55, -.55, .6], 'lowerarm01':[-.25, .85, .3]}))}, B:{dirs:conj(SENT_B, espalda(.05), sim({'upperarm01':[.55, -.55, .6], 'lowerarm01':[-.25, .85, .3]}))}, errores:[]}),
  'bisagra:rumano-mancuerna':cambiar('bisagra:rumano', {obj:'mancuernas'}),
  'bisagra:piso':cambiar('bisagra:rumano', {
    txt:'Barra pegada a las canillas, espalda recta y pecho arriba. Empujá el piso con las piernas y terminá parado apretando la cola.',
    musc:{gluteos:1, isquios:.8, cuadriceps:.6, lumbar:.6, trapecio:.4},
    A:{dirs:conj(inclinado(.48, .88), sim({'upperleg01':[.14, -.55, .82], 'lowerleg01':[.06, -.95, -.3], 'upperarm01':[.15, -1, .05], 'lowerarm01':[.06, -1, 0]})), agarre:.9}}),
  'bisagra:hiper':{
    obj:'', props:[{t:'caja', s:[3.2, .8, 2.4], p:[0, -1.4, 1.4], rot:[30, 0, 0], m:'pad'}, {t:'cil', r:.38, l:3.4, p:[0, -6.1, -3.6], rot:[0, 0, 90], m:'pad'}, {t:'caja', s:[1, 7, 1], p:[0, -5, -.6], rot:[40, 0, 0], m:'metal'}],
    cam:{az:1.45, y:-2, z:1, dist:38, el:.1}, tempo:[1, .4, 1.8, .4], flecha:'neck01', flechaDesp:0,
    musc:{lumbar:1, gluteos:.7, isquios:.5},
    txt:'Cadera apoyada en el borde y talones trabados. Bajá el torso con la espalda recta y subí hasta quedar en línea con las piernas, sin pasarte.',
    A:{rot:[150, 0, 0], pos:[0, -1.2, .6], pies:{L:[1.2, -5.9, -3.9], R:[-1.2, -5.9, -3.9]}, poloPies:[0, 1, 0], dirs:sim({'upperarm01':[.4, -.4, .8], 'lowerarm01':[-.6, .3, -.5]})},
    B:{rot:[52, 0, 0], pos:[0, -1.2, .4], pies:{L:[1.2, -5.9, -3.9], R:[-1.2, -5.9, -3.9]}, poloPies:[0, 1, 0], dirs:sim({'upperarm01':[.4, -.4, .8], 'lowerarm01':[-.6, .3, -.5]})},
    errores:[{n:'Pasarse arriba', malMusc:{lumbar:1}, musc:{gluteos:.4}, txt:'Subir de más arquea la zona lumbar. Frená cuando el cuerpo queda en línea recta.',
      B:{rot:[30, 0, 0], pos:[0, -1.2, .3], pies:{L:[1.2, -5.9, -3.9], R:[-1.2, -5.9, -3.9]}, poloPies:[0, 1, 0], dirs:conj(sim({'upperarm01':[.4, -.4, .8], 'lowerarm01':[-.6, .3, -.5]}), {spine02:[0, .55, -.83], spine01:[0, .7, -.7]})}}]},
  'press:mancuernas':cambiar('press:barra', {obj:'mancuernas', props:BANCO_PLANO,
    txt:'Escápulas juntas y apoyadas. Bajá las mancuernas al costado del pecho, codos a unos 45° del cuerpo, y subí juntándolas arriba.',
    A:conj(ACOSTADO, {manos:{L:[3.1, -.6, -1.8], R:[-3.1, -.6, -1.8]}, polo:[.6, -1, .3], giros:{'lowerarm01.L':-1, 'lowerarm01.R':1}, agarre:.9}),
    B:conj(ACOSTADO, {manos:{L:[1.3, 3.4, -3.1], R:[-1.3, 3.4, -3.1]}, polo:[.6, -1, .3], giros:{'lowerarm01.L':-1, 'lowerarm01.R':1}, agarre:.9})}),
  'press:maquina':{
    obj:'', props:[...ASIENTO(-.6, -3.8), {t:'caja', s:[3.4, 7.5, .6], p:[0, 0, -2.4], rot:[-6, 0, 0], m:'pad'}], cam:{az:1.2, y:0, dist:38, el:.1}, tempo:[1, .3, 1.9, .4], flecha:'wrist.L', flechaDesp:24,
    musc:{pecho:1, triceps:.6, hombros:.4},
    txt:'Espalda apoyada y manijas a la altura del pecho. Empujá hasta estirar sin trabar los codos y volvé lento.',
    A:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], manos:dos([0, 3.4, 1.5], 2.6), polo:[.7, -1, -.2], agarre:.9},
    B:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], manos:dos([0, 3.6, 6.4], 2.2), polo:[.7, -1, -.2], agarre:.9},
    errores:[{n:'Despegar la espalda', malMusc:{hombros:1}, musc:{pecho:.5}, txt:'Si separás la espalda del respaldo y adelantás los hombros, el hombro hace el trabajo. Espalda apoyada y escápulas juntas.',
      B:{pos:[0, -2.5, -.4], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], dirs:espalda(.35), manos:dos([0, 3.4, 7.2], 2.2), polo:[.7, -1, -.2], agarre:.9}}]},
  'press:flexiones':{
    obj:'', cam:{az:1.3, y:-5.5, z:-1.5, dist:36, el:.18}, tempo:[.9, .3, 1.7, .4], flecha:'neck01', flechaDesp:0,
    musc:{pecho:1, triceps:.6, hombros:.4, abdomen:.3},
    txt:'Manos un poco más anchas que los hombros y el cuerpo recto. Bajá hasta que el pecho casi toque el piso, con los codos a unos 45°.',
    A:{rot:[76, 0, 0], pos:[0, -6.4, -.9], pies:{L:[1.1, -7.6, -9.2], R:[-1.1, -7.6, -9.2]}, poloPies:[0, -1, 0], manos:dos([0, -7.8, 3.9], 2.6), polo:[.6, .2, -1], dirs:sim({foot:[0, -1, -.1]}), giros:{'lowerarm01.L':-1.4, 'lowerarm01.R':1.4}},
    B:{rot:[64, 0, 0], pos:[0, -3.9, -1.3], pies:{L:[1.1, -7.6, -9.2], R:[-1.1, -7.6, -9.2]}, poloPies:[0, -1, 0], manos:dos([0, -7.8, 3.9], 2.6), polo:[.6, .2, -1], dirs:sim({foot:[0, -1, -.1]}), giros:{'lowerarm01.L':-1.4, 'lowerarm01.R':1.4}},
    errores:[{n:'Cadera caída', malMusc:{lumbar:1}, musc:{pecho:.5}, flecha:'root', txt:'Si la cadera cae, la espalda baja se arquea. Apretá abdomen y cola para que el cuerpo suba y baje en bloque.',
      B:{rot:[74, 0, 0], pos:[0, -5, -1.1], pies:{L:[1.1, -7.6, -9.2], R:[-1.1, -7.6, -9.2]}, poloPies:[0, -1, 0], manos:dos([0, -7.8, 3.9], 2.6), polo:[.6, .2, -1], dirs:conj(sim({foot:[0, -1, -.1]}), {spine03:[0, -.3, 1], spine01:[0, .2, 1]})}}]},
  'remo:invertido':{
    obj:'', props:[{t:'cil', r:.14, l:10, p:[0, -2.2, -2.2], rot:[0, 0, 90]}, {t:'cil', r:.18, l:6, p:[4.6, -5.2, -2.2]}, {t:'cil', r:.18, l:6, p:[-4.6, -5.2, -2.2]}],
    cam:{az:1.35, y:-4, z:1, dist:38, el:.1}, tempo:[.9, .35, 1.7, .4], flecha:'neck01', flechaDesp:0,
    musc:{dorsales:1, trapecio:.7, biceps:.5, hombros:.3},
    txt:'Debajo de una barra, cuerpo recto y talones en el piso. Tirá llevando el pecho a la barra y juntando las escápulas.',
    A:{rot:[-78, 0, 0], pos:[0, -5.8, 2.8], pies:{L:[1.1, -7.6, 8.6], R:[-1.1, -7.6, 8.6]}, poloPies:[0, 1, 0], manos:dos([0, -2.2, -2.2], 2.8), polo:[.5, -.6, .5], dirs:sim({foot:[0, .2, 1]}), agarre:.9},
    B:{rot:[-70, 0, 0], pos:[0, -4, 2.4], pies:{L:[1.1, -7.6, 8.6], R:[-1.1, -7.6, 8.6]}, poloPies:[0, 1, 0], manos:dos([0, -2.2, -2.2], 2.8), polo:[.5, -.6, .5], dirs:sim({foot:[0, .2, 1]}), agarre:.9},
    errores:[{n:'Cadera caída', malMusc:{lumbar:.8}, musc:{dorsales:.5}, flecha:'root', txt:'Si la cadera se cae, el cuerpo se dobla y la espalda trabaja menos. Apretá cola y abdomen y mantené una línea recta.',
      B:{rot:[-50, 0, 0], pos:[0, -5.6, 2], pies:{L:[1.1, -7.6, 8.6], R:[-1.1, -7.6, 8.6]}, poloPies:[0, 1, 0], manos:dos([0, -2.2, -2.2], 2.8), polo:[.5, -.6, .5], dirs:sim({foot:[0, .2, 1], upperleg01:[.05, -.6, .8]}), agarre:.9}}]},
  'jalon:banda':cambiar('jalon:dominada', {props:[...X['jalon:dominada'].props, {t:'cable', banda:true, de:[0, 10.4, .6], a:'pies'}],
    txt:'Banda colgada de la barra y apoyada en los pies o rodillas: te ayuda en la parte más difícil. Subí hasta el mentón y bajá controlado.'}),
  'militar:maquina':cambiar('militar:mancuernas', {obj:'',
    txt:'Espalda apoyada y manijas a la altura de los hombros. Empujá hacia arriba sin trabar los codos y bajá lento.',
    A:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], manos:{L:[2.2, 3.4, .6], R:[-2.2, 3.4, .6]}, polo:[.8, -1, .2], agarre:.9},
    B:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], manos:{L:[1.9, 8.2, .2], R:[-1.9, 8.2, .2]}, polo:[.8, -1, .2], agarre:.9}}),
  'militar:pica':{
    obj:'', cam:{az:1.35, y:-4, z:-1, dist:36, el:.12}, tempo:[.9, .3, 1.8, .4], flecha:'neck01', flechaDesp:0,
    musc:{hombros:1, triceps:.6, trapecio:.4},
    txt:'Cuerpo en V invertida con la cadera alta. Bajá la cabeza hacia el piso entre las manos y empujá hasta estirar los brazos.',
    A:{rot:[140, 0, 0], pos:[0, -.6, -1.4], pies:{L:[1.1, -7.6, -6.6], R:[-1.1, -7.6, -6.6]}, poloPies:[0, 0, 1], manos:dos([0, -7.8, 2.6], 2.4), polo:[0, 0, 1], dirs:sim({foot:[0, -.9, .2]})},
    B:{rot:[124, 0, 0], pos:[0, .6, -2.3], pies:{L:[1.1, -7.6, -6.6], R:[-1.1, -7.6, -6.6]}, poloPies:[0, 0, 1], manos:dos([0, -7.8, 2.6], 2.4), polo:[0, 0, 1], dirs:sim({foot:[0, -.9, .2]})},
    errores:[]},
  'laterales:polea':cambiar('laterales:mancuernas', {obj:'manija', lado:'R', props:[columna(4, 0, 6), {t:'cable', de:[3.6, -7.2, 0], a:'R'}], cam:{az:.3, y:2.5, dist:40, el:.05}, flecha:'finger3-1.R',
    txt:'De costado a la polea baja, cable por delante del cuerpo. Subí el brazo hasta la altura del hombro y bajá lento.',
    A:{dirs:{'upperarm01.R':[-.18, -1, .15], 'lowerarm01.R':[-.15, -1, .2], 'upperarm01.L':[.45, -.8, -.2], 'lowerarm01.L':[-.6, -.2, .25]}, agarre:.9},
    B:{dirs:{'upperarm01.R':[-.97, -.05, .18], 'lowerarm01.R':[-.96, .02, .25], 'upperarm01.L':[.45, -.8, -.2], 'lowerarm01.L':[-.6, -.2, .25]}, agarre:.9}, errores:[]}),
  'laterales:banda':cambiar('laterales:mancuernas', {obj:'', props:[{t:'cable', banda:true, de:'foot.L', a:'L'}, {t:'cable', banda:true, de:'foot.R', a:'R'}]}),
  'laterales:maquina':cambiar('laterales:mancuernas', {obj:'', props:[...ASIENTO(-.6, -3.8), {t:'caja', s:[.6, 2, .9], m:'pad', sigue:['lowerarm01.L'], off:[.5, 0, 0]}, {t:'caja', s:[.6, 2, .9], m:'pad', sigue:['lowerarm01.R'], off:[-.5, 0, 0]}],
    txt:'Sentado con los codos contra las almohadillas. Subí los brazos hacia los costados hasta la altura del hombro.',
    A:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], dirs:sim({'upperarm01':[.25, -1, .1], 'lowerarm01':[.1, -.1, 1]}), agarre:.9},
    B:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], dirs:sim({'upperarm01':[.97, -.1, .1], 'lowerarm01':[.4, 0, .9]}), agarre:.9}, errores:[]}),
  'curl:polea':cambiar('curl:barra', {obj:'barraPolea', props:[columna(0, 5.2, 4), {t:'cable', de:[0, -6.8, 4.6], a:'manos'}]}),
  'curl:banda':cambiar('curl:barra', {obj:'', props:[{t:'cable', banda:true, de:'foot.L', a:'L'}, {t:'cable', banda:true, de:'foot.R', a:'R'}]}),
  'triceps:banco':{
    obj:'', props:banco(0, -4.4, -2.6, 6, 3), cam:{az:1.25, y:-3, z:1.5, dist:36, el:.1}, tempo:[.9, .3, 1.8, .4], flecha:'root', flechaDesp:-40,
    musc:{triceps:1, pecho:.4, hombros:.4},
    txt:'Manos en el borde del banco detrás tuyo y piernas al frente. Bajá doblando los codos hacia atrás hasta 90° y subí estirando.',
    A:{pos:[0, -2.5, -1], pies:{L:[1.2, TOBILLO, 6.4], R:[-1.2, TOBILLO, 6.4]}, poloPies:[0, 1, 0], manos:dos([0, -3.7, -2.5], 1.8), polo:[0, .2, -1], dirs:sim({foot:[0, .1, 1]}), giros:{'lowerarm01.L':1.4, 'lowerarm01.R':-1.4}},
    B:{pos:[0, -4.7, -1.2], pies:{L:[1.2, TOBILLO, 6.4], R:[-1.2, TOBILLO, 6.4]}, poloPies:[0, 1, 0], manos:dos([0, -3.7, -2.5], 1.8), polo:[0, .2, -1], dirs:sim({foot:[0, .1, 1]}), giros:{'lowerarm01.L':1.4, 'lowerarm01.R':-1.4}},
    errores:[{n:'Bajar de más', malMusc:{hombros:1}, musc:{triceps:.5}, txt:'Bajar mucho estira el hombro hacia adelante y lo lesiona. Frená con los codos a 90°.',
      B:{pos:[0, -6.1, -1.3], pies:{L:[1.2, TOBILLO, 6.4], R:[-1.2, TOBILLO, 6.4]}, poloPies:[0, 1, 0], manos:dos([0, -3.7, -2.5], 1.8), polo:[0, .2, -1], dirs:sim({foot:[0, .1, 1]})}}]},
  'hipthrust:mancuerna':cambiar('hipthrust:barra', {obj:'mancuerna', lado:'ambas'}),
  'hipthrust:puente':{
    obj:'', cam:{az:1.35, y:-5.5, z:.5, dist:32, el:.15}, tempo:[.9, .6, 1.6, .4], flecha:'root', flechaDesp:-40,
    musc:{gluteos:1, isquios:.5},
    txt:'Acostado boca arriba con las rodillas dobladas. Subí la cadera apretando la cola hasta quedar en línea de hombros a rodillas.',
    A:{rot:[-90, 0, 0], pos:[0, -7.2, 1.5], pies:{L:[1.6, TOBILLO, 5.2], R:[-1.6, TOBILLO, 5.2]}, poloPies:[0, 1, .2], dirs:conj(sim({foot:[0, -.3, 1], 'upperarm01':[.3, -.1, 1], 'lowerarm01':[.2, -.05, 1]}))},
    B:{rot:[-112, 0, 0], pos:[0, -5.4, 1.4], pies:{L:[1.6, TOBILLO, 5.2], R:[-1.6, TOBILLO, 5.2]}, poloPies:[0, 1, .2], dirs:conj(sim({foot:[0, -.3, 1], 'upperarm01':[.3, -.1, 1], 'lowerarm01':[.2, -.05, 1]}))},
    errores:[{n:'Arquear la espalda', malMusc:{lumbar:1}, musc:{gluteos:.5}, txt:'Subir arqueando la zona lumbar no trabaja la cola. Terminá con las costillas abajo y la pelvis metida.',
      B:{rot:[-122, 0, 0], pos:[0, -5, 1.3], pies:{L:[1.6, TOBILLO, 5.2], R:[-1.6, TOBILLO, 5.2]}, poloPies:[0, 1, .2], dirs:conj(sim({foot:[0, -.3, 1], 'upperarm01':[.3, -.1, 1], 'lowerarm01':[.2, -.05, 1]}), {spine03:[0, -.1, -1], spine02:[0, -.2, -1]})}}]},
  'zancada:libre':cambiar('zancada:mancuernas', {obj:'',
    A:conj(X['zancada:mancuernas'].A, {dirs:conj(sim({foot:[0, -.3, 1], 'upperarm01':[.45, -.8, -.2], 'lowerarm01':[-.6, -.2, .2]}))}),
    B:conj(X['zancada:mancuernas'].B, {dirs:conj(sim({foot:[0, -.3, 1], 'upperarm01':[.45, -.8, -.2], 'lowerarm01':[-.6, -.2, .2]}))})}),
  'extension:banda':cambiar('extension:maquina', {props:[...ASIENTO(-.4, -3.8), {t:'cable', banda:true, de:[0, -7.6, -1], a:'foot.L'}, {t:'cable', banda:true, de:[0, -7.6, -1], a:'foot.R'}]}),
  'extension:sissy':{
    obj:'', props:[{t:'cil', r:.15, l:9, p:[3.2, -3.7, 1.5]}], cam:{az:1.35, y:-1.5, dist:38, el:.06}, tempo:[1, .3, 2, .4], flecha:'lowerleg01.L', flechaDesp:0,
    musc:{cuadriceps:1, abdomen:.3},
    txt:'En puntas de pie y agarrado de un apoyo. Llevá las rodillas hacia adelante y el cuerpo hacia atrás en línea recta, y volvé.',
    A:{pos:[0, 1.6, -.5], pies:{L:[1.3, -6.9, .3], R:[-1.3, -6.9, .3]}, poloPies:[0, 0, 1], dirs:sim({foot:[0, -.85, .5], 'upperarm01':[.4, -.8, .4], 'lowerarm01':[.2, -.2, .9]})},
    B:{rot:[-38, 0, 0], pos:[0, -2.2, -2.2], pies:{L:[1.3, -6.9, .3], R:[-1.3, -6.9, .3]}, poloPies:[0, 0, 1], dirs:sim({foot:[0, -.85, .5], 'upperarm01':[.6, -.8, .4], 'lowerarm01':[.3, -.2, .9]})},
    errores:[]},
  'curlfem:banda':cambiar('curlfem:acostado', {props:[{t:'cable', banda:true, de:[0, -7.9, -11], a:'foot.L'}, {t:'cable', banda:true, de:[0, -7.9, -11], a:'foot.R'}], cam:{az:-1.35, y:-6, z:-2.5, dist:40, el:.16},
    A:conj(X['curlfem:acostado'].A, {pos:[0, -7.2, -1.4]}), B:conj(X['curlfem:acostado'].B, {pos:[0, -7.2, -1.4]}), errores:[]}),
  'pantorrillas:escalon':cambiar('pantorrillas:pie', {
    txt:'Sobre un escalón con un solo pie y agarrado de algo para el equilibrio. Subí lo más alto que puedas y bajá lento hasta estirar.',
    A:{pos:[0, 1.5, -.58], dirs:{'foot.L':[0, .2, 1], 'upperleg01.R':[-.1, -1, .05], 'lowerleg01.R':[0, -.5, -.85]}},
    B:{pos:[0, 3, -.58], dirs:{'foot.L':[0, -.9, .45], 'upperleg01.R':[-.1, -1, .05], 'lowerleg01.R':[0, -.5, -.85]}}, errores:[]}),
  'abdominales:crunch':{
    obj:'soga', props:[columna(0, 5.4), {t:'cable', de:[0, 6, 4.8], a:'manos'}], cam:{az:1.35, y:-3, z:1, dist:36, el:.08}, tempo:[.9, .5, 1.8, .4], flecha:'neck01', flechaDesp:0,
    musc:{abdomen:1, oblicuos:.5},
    txt:'De rodillas y con la soga a los costados de la cabeza. Enrollá la columna llevando los codos hacia los muslos; la cadera no se mueve.',
    A:{pos:[0, -3.3, -.6], pies:{L:[1.2, -7.5, -4.4], R:[-1.2, -7.5, -4.4]}, poloPies:[0, -1, .3], dirs:conj(espalda(.2), sim({'upperarm01':[.25, .2, .95], 'lowerarm01':[-.6, .7, -.2], foot:[0, -.3, -1]})), agarre:.9},
    B:{pos:[0, -3.3, -.6], pies:{L:[1.2, -7.5, -4.4], R:[-1.2, -7.5, -4.4]}, poloPies:[0, -1, .3], dirs:conj({spine05:[0, .9, .4], spine04:[0, .6, .8], spine03:[0, .2, .98], spine02:[0, -.2, .98], spine01:[0, -.45, .9], neck01:[0, -.6, .8]}, sim({'upperarm01':[.25, -.5, .8], 'lowerarm01':[-.6, .5, -.4], foot:[0, -.3, -1]})), agarre:.9},
    errores:[{n:'Tirar con la cadera', malMusc:{lumbar:.6}, musc:{abdomen:.4}, txt:'Si la cadera va hacia atrás, el movimiento lo hacen los brazos y el peso del cuerpo. Dejá la cadera quieta y enrollá la columna.',
      B:{pos:[0, -4.6, -2], pies:{L:[1.2, -7.5, -4.4], R:[-1.2, -7.5, -4.4]}, poloPies:[0, -1, .3], dirs:conj(inclinado(.25, .97), sim({'upperarm01':[.25, -.5, .8], 'lowerarm01':[-.6, .5, -.4], foot:[0, -.3, -1]})), agarre:.9}}]},
  'abdominales:colgado':cambiar('jalon:dominada', {
    musc:{abdomen:1, oblicuos:.5, antebrazos:.4}, flecha:'foot.L', flechaDesp:0,
    txt:'Colgado de la barra sin balancearte. Subí las piernas hasta la altura de la cadera, enrollando un poco la pelvis, y bajá lento.',
    A:{pos:[0, -.4, -.4], manos:dos([0, 10.4, .6], 3.1), polo:[1, -.5, 0], agarre:.9, dirs:sim({'upperleg01':[.04, -1, .08], 'lowerleg01':[0, -1, .05]})},
    B:{pos:[0, -.4, -.7], manos:dos([0, 10.4, .6], 3.1), polo:[1, -.5, 0], agarre:.9, dirs:sim({'upperleg01':[.06, -.05, 1], 'lowerleg01':[.02, -.4, .92]})},
    errores:[{n:'Balancearte', malMusc:{lumbar:.8}, musc:{abdomen:.4}, txt:'Balancear el cuerpo para subir las piernas usa el impulso. Frená el balanceo y subí lento.',
      A:{pos:[0, -.4, 1.4], manos:dos([0, 10.4, .6], 3.1), polo:[1, -.5, 0], agarre:.9, dirs:conj(espalda(-.3), sim({'upperleg01':[.04, -.9, -.4], 'lowerleg01':[0, -1, -.2]}))}}]}),
  'abdominales:rueda':{
    obj:'', props:[{t:'cil', r:.75, l:.7, rot:[0, 0, 90], m:'banco', sigue:['wrist.L', 'wrist.R'], off:[0, -.5, .2]}, {t:'caja', s:[4, .4, 3], p:[0, PISO + .2, -1.6], m:'pad'}],
    cam:{az:1.35, y:-5, z:1.5, dist:38, el:.12}, tempo:[1.2, .3, 1.6, .4], flecha:'neck01', flechaDesp:0,
    musc:{abdomen:1, oblicuos:.5, dorsales:.4, hombros:.3},
    txt:'De rodillas con la rueda bajo los hombros. Rodá hacia adelante con el abdomen apretado, sin que se hunda la espalda, y volvé.',
    A:{rot:[35, 0, 0], pos:[0, -3.6, .3], pies:{L:[1.2, -7.5, -4.4], R:[-1.2, -7.5, -4.4]}, poloPies:[0, -1, .3], manos:dos([0, -7.3, 3.4], .4), polo:[0, 0, -1], dirs:sim({foot:[0, -.3, -1]}), agarre:.9},
    B:{rot:[72, 0, 0], pos:[0, -5.6, 1.2], pies:{L:[1.2, -7.5, -4.4], R:[-1.2, -7.5, -4.4]}, poloPies:[0, -1, .3], manos:dos([0, -7.3, 8.4], .4), polo:[0, 0, -1], dirs:sim({foot:[0, -.3, -1]}), agarre:.9},
    errores:[{n:'Espalda hundida', malMusc:{lumbar:1}, musc:{abdomen:.4}, flecha:'root', txt:'Si la espalda se hunde al ir hacia adelante, la zona lumbar carga todo. Llegá solo hasta donde puedas con el abdomen firme.',
      B:{rot:[84, 0, 0], pos:[0, -6.7, 1.6], pies:{L:[1.2, -7.5, -4.4], R:[-1.2, -7.5, -4.4]}, poloPies:[0, -1, .3], manos:dos([0, -7.3, 9.4], .4), polo:[0, 0, -1], dirs:conj(sim({foot:[0, -.3, -1]}), {spine03:[0, -.3, 1], spine01:[0, .2, 1]}), agarre:.9}}]},
  'facepull:banda':cambiar('facepull:polea', {obj:'', props:[{t:'cil', r:.2, l:16, p:[0, 0, 7]}, {t:'cable', banda:true, de:[0, 6.8, 6.8], a:'L'}, {t:'cable', banda:true, de:[0, 6.8, 6.8], a:'R'}]}),
  'encogimientos:mancuernas':{
    obj:'mancuernas', cam:{az:2.5, y:3, dist:32, el:.12}, tempo:[.8, .6, 1.4, .4], flecha:'upperarm01.L', flechaDesp:0,
    musc:{trapecio:1, antebrazos:.3},
    txt:'Brazos estirados al costado. Subí los hombros hacia las orejas, aguantá un segundo y bajá lento. Sin girar los hombros.',
    A:{dirs:sim({'upperarm01':[.15, -1, .05], 'lowerarm01':[.08, -1, .08]}), agarre:.9},
    B:{dirs:conj(sim({'upperarm01':[.15, -1, .05], 'lowerarm01':[.08, -1, .08], clavicle:[.82, .55, 0], shoulder01:[.85, .5, 0]})), agarre:.9},
    errores:[{n:'Girar los hombros', malMusc:{hombros:.8}, musc:{trapecio:.5}, txt:'Hacer círculos con los hombros no suma y carga la articulación. Subí y bajá derecho.',
      B:{dirs:conj(sim({'upperarm01':[.15, -1, -.2], 'lowerarm01':[.08, -1, -.1], clavicle:[.8, .4, -.4], shoulder01:[.85, .3, -.4]})), agarre:.9}}]},
  'encogimientos:barra':null,
  'abduccion:maquina':cambiar('aductores:maquina', {musc:{gluteos:1}, txt:'Espalda apoyada. Abrí las piernas empujando con la parte de afuera de la cadera y cerrá lento.',
    A:X['aductores:maquina'].B, B:X['aductores:maquina'].A, errores:[]}),
  'abduccion:banda':{
    obj:'', props:[{t:'cable', banda:true, de:'lowerleg01.L', a:'lowerleg01.R'}], cam:{az:.3, y:-2, dist:38, el:.06}, tempo:[.8, .2, .8, .2], flecha:'foot.L', flechaDesp:0,
    musc:{gluteos:1},
    txt:'Banda por encima de las rodillas y semiflexionado. Dá pasos cortos hacia el costado sin juntar los pies del todo.',
    A:{pos:[0, -.2, -.7], pies:{L:[1.4, TOBILLO, .2], R:[-1.4, TOBILLO, .2]}, poloPies:[.3, 0, 1], dirs:conj(espalda(.25), sim({foot:[0, -.3, 1]}))},
    B:{pos:[.9, -.2, -.7], pies:{L:[3.6, TOBILLO, .2], R:[-1.4, TOBILLO, .2]}, poloPies:[.3, 0, 1], dirs:conj(espalda(.25), sim({foot:[0, -.3, 1]}))},
    errores:[{n:'Rodillas adentro', musc:{gluteos:.4}, txt:'Si las rodillas se juntan, el glúteo no trabaja. Empujá la banda hacia afuera todo el tiempo.',
      A:{pos:[0, -.2, -.7], pies:{L:[1.4, TOBILLO, .2], R:[-1.4, TOBILLO, .2]}, poloPies:[-.5, 0, 1], dirs:conj(espalda(.25), sim({foot:[0, -.3, 1]}))},
      B:{pos:[.9, -.2, -.7], pies:{L:[3.6, TOBILLO, .2], R:[-1.4, TOBILLO, .2]}, poloPies:[-.5, 0, 1], dirs:conj(espalda(.25), sim({foot:[0, -.3, 1]}))}}]},
  'abduccion:polea':{
    obj:'', props:[columna(-5.2, .2, 6), {t:'cable', de:[-4.8, -7.6, .2], a:'foot.L'}], cam:{az:.25, y:-1, dist:40, el:.05}, tempo:[.8, .4, 1.6, .4], flecha:'foot.L', flechaDesp:0,
    musc:{gluteos:1},
    txt:'De costado a la polea con el tobillo enganchado del lado de afuera. Abrí la pierna hacia el costado sin inclinar el torso.',
    A:{dirs:conj({'upperleg01.L':[-.05, -1, 0], 'lowerleg01.L':[-.03, -1, 0]}, sim({'upperarm01':[.2, -1, .05]}))},
    B:{dirs:conj({'upperleg01.L':[.6, -.8, 0], 'lowerleg01.L':[.6, -.8, 0]}, sim({'upperarm01':[.2, -1, .05]}))}, errores:[]},
  'aductores:polea':{
    obj:'', props:[columna(6, .2, 6), {t:'cable', de:[5.6, -7.6, .2], a:'foot.L'}], cam:{az:.25, y:-1, dist:40, el:.05}, tempo:[.8, .4, 1.6, .4], flecha:'foot.L', flechaDesp:0,
    musc:{aductores:1},
    txt:'De costado a la polea con el tobillo de adentro enganchado. Cruzá la pierna por delante de la otra y volvé lento.',
    A:{dirs:{'upperleg01.L':[.45, -.9, 0], 'lowerleg01.L':[.45, -.9, 0]}},
    B:{dirs:{'upperleg01.L':[-.25, -.95, .15], 'lowerleg01.L':[-.25, -.95, .15]}}, errores:[]},
  'aductores:sumo':cambiar('sentadilla:barra', {obj:'mancuerna', lado:'ambas', barra:null, cam:{az:.5, y:-1, dist:38, el:.08},
    musc:{aductores:1, gluteos:.9, cuadriceps:.7},
    txt:'Pies bien abiertos y puntas hacia afuera. Bajá con la mancuerna colgando entre las piernas y el pecho arriba.',
    A:{pos:[0, .6, -.6], pies:{L:[3.1, TOBILLO, .6], R:[-3.1, TOBILLO, .6]}, poloPies:[.8, 0, .6], dirs:sim({foot:[.6, -.3, .75], 'upperarm01':[.06, -1, .1], 'lowerarm01':[-.08, -1, .05]}), agarre:.9},
    B:{pos:[0, -2.6, -.8], pies:{L:[3.1, TOBILLO, .6], R:[-3.1, TOBILLO, .6]}, poloPies:[.8, 0, .6], dirs:conj(espalda(.15), sim({foot:[.6, -.3, .75], 'upperarm01':[.06, -1, .1], 'lowerarm01':[-.08, -1, .05]})), agarre:.9}, errores:[]}),
  'pajaros:maquina':{
    obj:'', props:[...ASIENTO(-.4, -3.8), {t:'caja', s:[3, 5, .6], p:[0, 1.6, 2.2], m:'pad'}], cam:{az:.7, y:1.5, dist:38, el:.25}, tempo:[.9, .4, 1.8, .4], flecha:'finger3-1.L', flechaDesp:0,
    musc:{hombros:1, trapecio:.6},
    txt:'Pecho contra el respaldo y brazos al frente. Abrí los brazos hacia atrás a la altura de los hombros, juntando las escápulas.',
    A:{pos:[0, -2.7, -.6], pies:PIES_SENTADO(3.4), poloPies:[0, .3, 1], dirs:sim({'upperarm01':[.18, .05, 1], 'lowerarm01':[.15, .05, 1]}), agarre:.9},
    B:{pos:[0, -2.7, -.6], pies:PIES_SENTADO(3.4), poloPies:[0, .3, 1], dirs:sim({'upperarm01':[1, .05, -.15], 'lowerarm01':[.98, .05, -.05]}), agarre:.9}, errores:[]}
});
EJ3D['encogimientos:barra'] = cambiar('encogimientos:mancuernas', {obj:'barra'});
EJ3D['fondos:maquina'] = cambiar('press:maquina', {
    musc:{triceps:1, pecho:.6, hombros:.3},
    txt:'Sentado y con la espalda apoyada. Empujá las manijas hacia abajo hasta estirar los brazos y subí lento hasta 90°.',
    A:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], manos:dos([0, 2.6, -.4], 2.6), polo:[0, .3, -1], agarre:.9},
    B:{pos:[0, -2.7, -1.2], pies:PIES_SENTADO(3.8), poloPies:[0, .3, 1], manos:dos([0, -1.6, .2], 2.6), polo:[0, .3, -1], agarre:.9}, errores:[]});
EJ3D['hipthrust:banda'] = cambiar('hipthrust:puente', {props:[{t:'cable', banda:true, de:'lowerleg01.L', a:'lowerleg01.R'}],
  txt:'Banda por encima de las rodillas. Subí la cadera apretando la cola y empujando las rodillas hacia afuera contra la banda.'});
EJ3D['rotacion:banda'] = {
  obj:'', props:[{t:'cable', banda:true, de:'L', a:'R'}], cam:{az:.35, y:3, dist:30, el:.15}, tempo:[.9, .4, 1.6, .4], flecha:'finger3-1.L', flechaDesp:0,
  musc:{hombros:1},
  txt:'Codos pegados al cuerpo y doblados a 90°. Abrí las manos hacia afuera estirando la banda, sin despegar los codos, y volvé lento.',
  A:{dirs:sim({'upperarm01':[.12, -1, .02], 'lowerarm01':[.15, -.05, 1]}), giros:{'lowerarm01.L':-1.2, 'lowerarm01.R':1.2}, agarre:.8},
  B:{dirs:sim({'upperarm01':[.12, -1, .02], 'lowerarm01':[.85, -.05, .5]}), giros:{'lowerarm01.L':-1.2, 'lowerarm01.R':1.2}, agarre:.8},
  errores:[{n:'Despegar los codos', malMusc:{trapecio:.6}, musc:{hombros:.5}, txt:'Si los codos se separan del cuerpo, el movimiento lo hace el hombro entero. Dejalos pegados, como sosteniendo una toalla.',
    B:{dirs:sim({'upperarm01':[.6, -.8, .02], 'lowerarm01':[.9, .2, .35]}), giros:{'lowerarm01.L':-1.2, 'lowerarm01.R':1.2}, agarre:.8}}]};

// Calentamiento (para guías e imágenes; no son ejercicios del plan)
EJ3D['calent:separacion'] = {
  obj:'', props:[{t:'cable', banda:true, de:'L', a:'R'}], cam:{az:.35, y:3, dist:32, el:.12}, tempo:[.9, .4, 1.4, .4], flecha:'finger3-1.L', flechaDesp:0,
  musc:{trapecio:1, hombros:.6, dorsales:.3},
  txt:'Brazos estirados al frente a la altura del pecho. Abrí la banda hacia los costados juntando los omóplatos y volvé lento.',
  A:{dirs:sim({'upperarm01':[.12, -.05, 1], 'lowerarm01':[.12, -.05, 1]}), agarre:.8},
  B:{dirs:sim({'upperarm01':[1, -.05, .12], 'lowerarm01':[1, -.05, .1]}), agarre:.8}, errores:[]};
EJ3D['calent:circulos'] = {
  obj:'', cam:{az:.3, y:2.5, dist:38, el:.08}, tempo:[1, .2, 1, .2], flecha:'finger3-1.L', flechaDesp:0,
  musc:{hombros:1},
  txt:'Brazos abiertos a la altura de los hombros. Hacé círculos chicos que se van agrandando, hacia adelante y hacia atrás.',
  A:{dirs:sim({'upperarm01':[.97, -.05, .18], 'lowerarm01':[.96, .02, .25]})},
  B:{dirs:sim({'upperarm01':[.95, .2, -.15], 'lowerarm01':[.94, .25, -.1]})}, errores:[]};
