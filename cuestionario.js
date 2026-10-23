/* Cuestionario inicial: una pregunta por pantalla. Con las respuestas se arma el perfil (y el plan) igual que con el formulario de Perfil.
   Respuestas en atlas.cuest = {i, r:{...}}; al terminar quedan también en PERFIL.cuest */
(function(){
const CQ = Object.assign({i:0, r:{}}, store.get('atlas.cuest', {}));
const guardar = () => store.set('atlas.cuest', CQ);
const R = CQ.r;
const sx = () => R.sexo === 'm' ? 'm' : 'h';
const imc = () => R.peso && R.altura ? R.peso / Math.pow(R.altura / 100, 2) : null;

// Tipos: uno (toca y avanza), varios (marcás y Continuar), num (número con + y −), figs (figuras de cuerpo), info (pantalla de resultado)
const PASOS = [
  {id:'meta', tipo:'uno', t:'¿Qué querés lograr?', ops:() => Object.entries(METAS).map(([k, o]) => [k, o.n, {panza:'🎯', peso:'⚖️', marcar:'🔥', musculo:'💪', grande:'🏋️', gluteos:'🍑', fuerza:'🦾', forma:'🏃', salud:'❤️'}[k]])},
  {id:'sexo', tipo:'uno', t:'¿Sos hombre o mujer?', sub:'Cambia las figuras de cuerpo y el peso inicial de cada ejercicio.', ops:() => [['h', 'Hombre', '🙋‍♂️'], ['m', 'Mujer', '🙋‍♀️']]},
  {id:'edad', tipo:'num', t:'¿Cuántos años tenés?', u:'años', min:14, max:90, def:28, paso:1, ayuda:'Con la edad cambia cuánto comer y cuánto descansar entre entrenamientos.'},
  {id:'altura', tipo:'num', t:'¿Cuánto medís?', u:'cm', min:130, max:220, def:() => R.sexo === 'm' ? 163 : 175, paso:1},
  {id:'peso', tipo:'num', t:'¿Cuánto pesás hoy?', u:'kg', min:35, max:250, def:() => R.sexo === 'm' ? 62 : 78, paso:.5, ayuda:() => {
    const i = imc(); if(!i) return '';
    const c = i < 18.5 ? 'bajo peso' : i < 25 ? 'peso normal' : i < 30 ? 'sobrepeso' : 'obesidad';
    return `Tu IMC es <b>${fmtNum(Math.round(i * 10) / 10)}</b> (${c}). El IMC no distingue músculo de grasa: es solo una referencia.`; }},
  {id:'hoy', tipo:'figs', t:'¿Cómo está tu cuerpo hoy?', sub:'Elegí la figura que más se parezca.', figs:() => Object.entries(FIGS).map(([k, f]) => [k, f.n, `${sx()}_${k}`, k === figuraPorImc(R.peso, R.altura)])},
  {id:'cmeta', tipo:'figs', t:'¿Cómo querés quedar?', sub:'Debajo de cada una, el peso aproximado al que llegarías.', figs:() => Object.entries(metasDe(R.sexo)).map(([k, f]) => {
    const p = planCuerpo(R.hoy, k, R.peso, R.sexo); return [k, f.n + (p ? ` · ~${p.peso} kg` : ''), `${sx()}_meta_${k}`, false]; })},
  {id:'pobj', tipo:'num', t:'¿Cuál es tu peso objetivo?', u:'kg', min:35, max:250, paso:.5,
    def:() => { const p = planCuerpo(R.hoy, R.cmeta, R.peso, R.sexo); return p ? p.peso : R.peso || 75; },
    ayuda:() => { if(!R.peso || !R.pobj) return ''; const d = R.pobj - R.peso, pc = Math.round(Math.abs(d) / R.peso * 100);
      return Math.abs(d) < 1 ? 'Mantener el peso y cambiar la composición: menos grasa y más músculo.'
        : d < 0 ? `Bajar <b>${fmtNum(-d)} kg</b> (${pc}% de tu peso). Bajar un 10% ya mejora la presión, el azúcar en sangre y las articulaciones.`
        : `Subir <b>${fmtNum(d)} kg</b>. Con pesas y comiendo un poco más, la mayor parte puede ser músculo.`; }},
  {id:'frec', tipo:'uno', t:'¿Cuánto entrenás hoy en día?', ops:() => [['diario', 'Casi todos los días', '🏆'], ['semana', 'Varias veces por semana', '💪'], ['mes', 'Algunas veces por mes', '🙂'], ['antes', 'Entrenaba, pero dejé', '😔'], ['nunca', 'Nunca entrené', '🌱']]},
  {id:'mejor', tipo:'uno', t:'¿Cuándo estuviste en tu mejor forma?', ops:() => [['1', 'Hace menos de 1 año', '⭐'], ['3', 'Hace 1 a 3 años', '📅'], ['mas', 'Hace más de 3 años', '⏳'], ['nunca', 'Todavía no: es ahora', '🚀']]},
  {id:'metab', tipo:'uno', t:'¿Cómo cambia tu peso?', ops:() => [['sube', 'Subo rápido y me cuesta bajar', '📈'], ['facil', 'Subo y bajo fácil', '📊'], ['cuesta', 'Me cuesta subir de peso o de músculo', '📉']]},
  {id:'dias', tipo:'uno', t:'¿Cuántos días por semana querés entrenar?', sub:'Los planes son de 3, 4 o 5 días. Con menos de 3 casi no se progresa.', ops:() => [['3', '3 días', '🗓️'], ['4', '4 días', '🗓️'], ['5', '5 días', '🗓️']]},
  {id:'div', tipo:'uno', t:'¿Cómo querés dividir el entrenamiento?', ops:() => [['auto', 'Que lo decida la app', '✨', 'Recomendado. Según tus días: 3 → cuerpo completo, 4 → torso y piernas, 5 → empuje, tirón y piernas.'],
    ['full', 'Cuerpo completo', '🧍', 'Todo el cuerpo en cada sesión (plan de 3 días).'], ['tp', 'Torso y piernas', '↕️', 'Un día arriba y otro abajo (plan de 4 días).'],
    ['et', 'Empuje, tirón y piernas', '↔️', 'Pecho y hombros, espalda y bíceps, piernas (plan de 5 días).']]},
  {id:'min', tipo:'uno', t:'¿Cuánto tiempo querés que dure cada entrenamiento?', ops:() => [['30', '30 min', '⏱️'], ['45', '45 min', '⏱️'], ['60', '1 hora', '⏱️'], ['75', '1 h 15', '⏱️'], ['90', '1 h 30', '⏱️'], ['120', '2 horas', '⏱️']]},
  {id:'hora', tipo:'uno', t:'¿A qué hora preferís entrenar?', sub:'Para avisarte en tu horario.', ops:() => [['manana', 'A la mañana', '🌅'], ['mediodia', 'Al mediodía', '☀️'], ['tarde', 'A la tarde', '🌇'], ['noche', 'A la noche', '🌙'], ['varia', 'A distintas horas', '🔀']]},
  {id:'lugar', tipo:'uno', t:'¿Dónde vas a entrenar?', ops:() => [['grande', 'Gimnasio grande', '🏢', 'Con máquinas, poleas, barras y mancuernas.'], ['chico', 'Gimnasio chico', '🏠', 'Pocas máquinas, pero barras y mancuernas.'],
    ['casa', 'En casa', '🛋️', 'Mancuernas y un banco.'], ['mixto', 'Gimnasio y casa', '🔁', 'El plan es de gimnasio; en casa te digo cómo reemplazar.']]},
  {id:'mus', tipo:'varios', t:'¿Qué músculos te importan más?', sub:'Elegí todos los que quieras.', unico:'todos', ops:() => [['pecho', 'Pecho', '🫀'], ['hombros', 'Hombros', '🔺'], ['brazos', 'Brazos', '💪'], ['abdomen', 'Abdominales', '🍫'], ['espalda', 'Espalda', '🪽'], ['piernas', 'Piernas y glúteos', '🦵'], ['todos', 'Todos por igual', '⚖️']]},
  {id:'mol', tipo:'varios', t:'¿Tenés alguna molestia?', sub:'Marcalas y cambio los ejercicios que cargan esa zona.', unico:'no', ops:() => [['no', 'Ninguna', '✅'], ['lumbar', 'Espalda baja', '🔴'], ['rodilla', 'Rodillas', '🔴'], ['hombro', 'Hombros', '🔴'], ['codo', 'Codos', '🔴']]},
  {id:'motiv', tipo:'varios', t:'¿Qué te motiva a entrenar?', sub:'Elegí todos los que quieras.', ops:() => [['verse', 'Verme mejor', '😎'], ['salud', 'Mejorar la salud', '❤️'], ['sentirse', 'Sentirme bien con mi cuerpo', '😌'], ['forma', 'Estar en forma', '🏃'], ['fuerte', 'Ser más fuerte', '🏋️']]},
  {id:'probs', tipo:'varios', t:'¿Qué te pasó las otras veces que entrenaste?', sub:'Elegí todos los que quieras.', unico:'ninguno', ops:() => [['plan', 'No tenía un plan claro', '🗒️'], ['motiv', 'Me faltó motivación', '🥱'], ['saber', 'No sabía cómo hacerlo', '📚'], ['result', 'No veía resultados', '👀'], ['tiempo', 'No tenía tiempo', '⏰'], ['ninguno', 'Nada de esto', '✅']]},
  {id:'dia', tipo:'uno', t:'¿Cómo es tu día típico?', ops:() => [['poco', 'Paso casi todo el día sentado', '💻'], ['algo', 'Me muevo en los descansos', '🚶'], ['mucho', 'Estoy de pie o en movimiento todo el día', '🏃']]},
  {id:'energia', tipo:'uno', t:'¿Cómo es tu energía durante el día?', ops:() => [['baja', 'Baja: ando cansado todo el día', '🪫'], ['almuerzo', 'Me bajoneo después de almorzar', '😴'], ['comidas', 'Llego agotado a las comidas', '🍽️'], ['alta', 'Alta y pareja', '🔋']]},
  {id:'sueno', tipo:'uno', t:'¿Cuánto dormís?', ops:() => [['5', 'Menos de 6 horas', '😵'], ['6', '6 a 7 horas', '😐'], ['7', '7 a 8 horas', '😊'], ['8', 'Más de 8 horas', '😴']]},
  {id:'agua', tipo:'uno', t:'¿Cuánta agua tomás por día?', ops:() => [['1', 'Menos de 1 litro', '💧'], ['2', '1 a 2 litros', '💧💧'], ['3', '2 a 3 litros', '💧💧💧'], ['4', 'Más de 3 litros', '🐳']]},
  {id:'perfil', tipo:'info', t:'Tu perfil', html:perfilHTML},
  {id:'evento', tipo:'uno', t:'¿Tenés algo importante para lo que quieras estar en forma?', sub:'Con una fecha en mente es más fácil ser constante.', ops:() => [['vacaciones', 'Vacaciones', '✈️'], ['cumple', 'Cumpleaños', '🎂'], ['casamiento', 'Casamiento', '🥂'], ['deporte', 'Competencia o partido', '🏅'], ['otro', 'Otra cosa', '📌'], ['no', 'Nada en especial', '➖']]},
  {id:'proy', tipo:'info', t:'Tu camino', html:proyHTML},
  {id:'conf', tipo:'uno', t:'¿Qué tan seguro estás de lograrlo?', ops:() => [['si', '¡Creo que puedo!', '🔥'], ['intento', 'No sé, pero lo voy a intentar', '🤘'], ['duda', 'No estoy seguro', '🤔']]},
  {id:'fin', tipo:'info', t:'Tu plan está listo', html:finHTML, boton:'Armar mi plan'}
];

/* ---------- Cálculos para las pantallas de resultado ---------- */
function proyeccion(){
  if(!R.peso || !R.pobj) return null;
  const d = R.pobj - R.peso;
  // Ritmo sano: bajar ~0,7% del peso por semana (máx. 1 kg); subir 0,25 kg por semana
  const ritmo = d < 0 ? Math.min(1, R.peso * .007) : .25;
  const sem = Math.abs(d) < 1 ? 0 : Math.ceil(Math.abs(d) / ritmo);
  const f = new Date(); f.setDate(f.getDate() + sem * 7);
  return {d, sem, fecha:f, ritmo};
}
const fechaTxt = f => f.toLocaleDateString('es-AR', {day:'numeric', month:'long', year:'numeric'});
function perfilHTML(){
  const i = imc(), pos = i ? Math.max(0, Math.min(100, (i - 15) / (40 - 15) * 100)) : null;
  const cat = !i ? '' : i < 18.5 ? 'Bajo peso' : i < 25 ? 'Normal' : i < 30 ? 'Sobrepeso' : 'Obesidad';
  const tips = [];
  if(i >= 25) tips.push(['⚠️', 'Con sobrepeso suben los riesgos de presión alta, diabetes y dolores de espalda y rodillas. Bajar de a poco ya los reduce.']);
  if(R.sueno === '5') tips.push(['😴', 'Dormís menos de 6 horas: el músculo se recupera durmiendo. Apuntá a 7–8 horas.']);
  if(R.agua === '1') tips.push(['💧', `Tomás poca agua. Tu meta: unos <b>${fmtNum(Math.round((R.peso || 70) * .035 * 10) / 10)} litros</b> por día (más los días que entrenás).`]);
  if(R.energia === 'almuerzo') tips.push(['🍽️', 'El bajón después de comer suele venir de platos muy pesados en harinas. Sumá proteína y verduras al almuerzo.']);
  if(R.energia === 'baja') tips.push(['🔋', 'Si andás cansado todo el día, primero sueño y agua. El entrenamiento, al principio, suave.']);
  if(R.dia === 'poco') tips.push(['🚶', 'Pasás mucho tiempo sentado: sumá caminatas cortas. 6.000–8.000 pasos por día ayudan mucho.']);
  const fila = (e, a, b) => `<div class="cq-pf-f"><span>${e}</span><div><small>${a}</small><b>${b}</b></div></div>`;
  const NV = {diario:'Casi todos los días', semana:'Varias veces por semana', mes:'Algunas veces por mes', antes:'Entrenaba, pero dejé', nunca:'Nunca entrené'};
  const MET = {sube:'Sube fácil, baja lento', facil:'Sube y baja fácil', cuesta:'Le cuesta subir'};
  const DIA = {poco:'Sentado la mayor parte', algo:'Algo activo', mucho:'Muy activo'};
  return `<div class="cq-card">
      <p class="cq-k">Índice de masa corporal (IMC)</p>
      ${i ? `<div class="cq-imc"><div class="cq-imc-b"><i style="left:${pos}%"><em>${fmtNum(Math.round(i * 100) / 100)}</em></i></div>
        <div class="cq-imc-l"><span>Bajo</span><span>Normal</span><span>Sobrepeso</span><span>Obesidad</span></div></div>
        <p class="cq-imc-c">Estás en <b>${cat.toLowerCase()}</b>.</p>` : '<p class="cq-sub">Falta tu peso o tu altura.</p>'}
    </div>
    <div class="cq-card cq-pf">${fila('🏃', 'Entrenamiento', NV[R.frec] || '—')}${fila('🔥', 'Metabolismo', MET[R.metab] || '—')}${fila('💼', 'Día típico', DIA[R.dia] || '—')}${fila('🎯', 'Objetivo', METAS[R.meta] ? METAS[R.meta].n : '—')}</div>
    ${tips.length ? `<div class="cq-card"><p class="cq-k">Para tener en cuenta</p><ul class="cq-tips">${tips.map(([e, t]) => `<li><span>${e}</span><p>${t}</p></li>`).join('')}</ul></div>` : ''}`;
}
function proyHTML(){
  const p = proyeccion();
  if(!p) return '<p class="cq-sub">Falta tu peso o tu peso objetivo.</p>';
  if(!p.sem) return `<div class="cq-card"><p class="cq-big">Mantener <b>${fmtNum(R.peso)} kg</b></p><p class="cq-sub">Tu trabajo es cambiar la composición: menos grasa y más músculo, con el mismo peso. En 3–4 meses se nota en el espejo y en la cinta.</p></div>`;
  // Curva: rápida al principio y más lenta al final (como suele pasar)
  const W = 320, H = 170, x0 = 34, x1 = W - 12, y0 = 18, y1 = H - 26, a = R.peso, b = R.pobj, lo = Math.min(a, b), hi = Math.max(a, b);
  const Y = v => y1 - (v - lo) / (hi - lo || 1) * (y1 - y0), pts = [];
  for(let k = 0; k <= 40; k++){ const t = k / 40, e = 1 - Math.pow(1 - t, 1.7); pts.push(`${(x0 + (x1 - x0) * t).toFixed(1)},${Y(a + (b - a) * e).toFixed(1)}`); }
  const mes = d => d.toLocaleDateString('es-AR', {month:'short'}).replace('.', '');
  const ticks = [0, .5, 1].map(t => { const v = lo + (hi - lo) * t; return `<text x="${x0 - 6}" y="${Y(v) + 4}" text-anchor="end">${fmtNum(Math.round(v * 10) / 10)}</text><line x1="${x0}" x2="${x1}" y1="${Y(v)}" y2="${Y(v)}"/>`; }).join('');
  return `<div class="cq-card"><p class="cq-sub" style="margin:0 0 4px">Si seguís el plan, llegarías a</p>
      <p class="cq-big"><b>${fmtNum(b)} kg</b> para el <b>${fechaTxt(p.fecha)}</b></p>
      <svg class="cq-graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tu peso de ${fmtNum(a)} a ${fmtNum(b)} kilos en ${p.sem} semanas">
        <defs><linearGradient id="cqg" x1="0" x2="1"><stop offset="0" stop-color="#F0594C"/><stop offset=".55" stop-color="#F5B83D"/><stop offset="1" stop-color="#34D399"/></linearGradient></defs>
        <g class="cq-ej">${ticks}</g>
        <polyline points="${pts.join(' ')}" fill="none" stroke="url(#cqg)" stroke-width="4" stroke-linecap="round"/>
        <circle cx="${x1}" cy="${Y(b)}" r="6" class="cq-pt"/>
        <text x="${x0}" y="${H - 6}" class="cq-mes">${mes(new Date())}</text><text x="${x1}" y="${H - 6}" text-anchor="end" class="cq-mes">${mes(p.fecha)}</text>
      </svg>
      <p class="cq-sub">Son unas <b>${p.sem} semanas</b>, ${p.d < 0 ? `bajando unos ${fmtNum(Math.round(p.ritmo * 10) / 10)} kg por semana` : 'subiendo unos 0,25 kg por semana'}. Es una estimación: cada cuerpo responde distinto.</p></div>`;
}
function finHTML(){
  const P = armarPerfil(), pl = PLANES[P.dias];
  const dias = Object.values(pl.dias).map(d => d.titulo).join(' · ');
  const li = [
    ['🎯', METAS[P.meta].n],
    ['🗓️', `${P.dias} días por semana: ${dias}`],
    ['⏱️', `${P.min} minutos por sesión`],
    ['📍', P.lugar === 'casa' ? 'En casa, con mancuernas y banco' : 'En el gimnasio'],
    P.molestias.length ? ['🩹', `Cuidando ${P.molestias.map(m => MOLESTIAS[m]).join(' y ')}: cambio los ejercicios que la cargan`] : null,
    R.evento && R.evento !== 'no' ? ['📌', 'Con tu fecha en mente'] : null
  ].filter(Boolean);
  return `<div class="cq-card"><ul class="cq-tips">${li.map(([e, t]) => `<li><span>${e}</span><p>${t}</p></li>`).join('')}</ul></div>
    <p class="cq-sub">Podés cambiar cualquier respuesta después, en la pestaña Perfil.</p>`;
}

/* ---------- Respuestas → perfil ---------- */
function armarPerfil(){
  const plc = planCuerpo(R.hoy, R.cmeta, R.peso, R.sexo);
  const nivel = R.frec === 'diario' && R.mejor === '1' ? 'avanzado' : ['diario', 'semana'].includes(R.frec) ? 'medio' : 'nuevo';
  let dias = Number(R.dias) || 4;
  if(R.div === 'full') dias = 3; else if(R.div === 'tp') dias = 4; else if(R.div === 'et') dias = 5;
  const meta = METAS[R.meta] ? R.meta : 'forma';
  return {meta, obj:METAS[meta].obj, nivel, dias, min:Number(R.min) || 60, lugar:R.lugar === 'casa' ? 'casa' : 'gym',
    molestias:(R.mol || []).filter(m => MOLESTIAS[m]), altura:R.altura || null, edad:R.edad || null, peso:R.peso || null,
    sexo:R.sexo || null, actividad:R.dia || null,
    cuerpo:R.hoy || R.cmeta ? {hoy:R.hoy || null, meta:R.cmeta || null, peso:R.pobj || (plc ? plc.peso : null)} : null,
    cuest:Object.assign({}, R)};
}
function terminar(){
  PERFIL = armarPerfil();
  store.set('atlas.perfil', PERFIL);
  if(PERFIL.peso) anotarCuerpo({peso:PERFIL.peso});
  Object.keys(SWAP).forEach(k => delete SWAP[k]); store.set('atlas.swap', SWAP);
  PL = null; S.plan = PERFIL.dias; store.set('atlas.plan', S.plan);
  S.dia = HOY; S.entrenar = false;
  CQ.i = 0; guardar();
  cerrar();
  renderPlan(); setTab('semana'); window.scrollTo({top:0});
  if(!store.get('atlas.tour', false)) mostrarTour();
}

/* ---------- Pantallas ---------- */
const el = () => document.getElementById('cuest');
const val = (f, d) => typeof f === 'function' ? f() : f ?? d;
function respondido(p){
  const v = R[p.id];
  return p.tipo === 'info' || (p.tipo === 'varios' ? (v || []).length > 0 : v != null && v !== '');
}
function pintar(){
  const p = PASOS[CQ.i], n = PASOS.length, c = el();
  let cuerpo = '';
  if(p.tipo === 'uno' || p.tipo === 'varios'){
    const sel = p.tipo === 'varios' ? (R[p.id] || []) : [R[p.id]];
    cuerpo = `<div class="cq-ops">${val(p.ops).map(([v, t, e, d]) => `<button type="button" class="cq-op${sel.includes(v) ? ' sel' : ''}" data-v="${v}" aria-pressed="${sel.includes(v)}">
      <span class="cq-op-t"><b>${t}</b>${d ? `<small>${d}</small>` : ''}</span>${e ? `<span class="cq-op-e" aria-hidden="true">${e}</span>` : ''}</button>`).join('')}</div>`;
  } else if(p.tipo === 'num'){
    if(R[p.id] == null) R[p.id] = val(p.def);
    cuerpo = `<div class="cq-num"><button type="button" class="cq-mm" data-d="-1" aria-label="Menos">−</button>
      <label><input type="number" inputmode="decimal" id="cq-in" value="${R[p.id]}" min="${p.min}" max="${p.max}" step="${p.paso}"><span>${p.u}</span></label>
      <button type="button" class="cq-mm" data-d="1" aria-label="Más">+</button></div><div class="cq-ay" id="cq-ay">${val(p.ayuda, '')}</div>`;
  } else if(p.tipo === 'figs'){
    cuerpo = `<div class="cq-figs">${val(p.figs).map(([k, t, img, sug]) => `<button type="button" class="cq-fig${R[p.id] === k ? ' sel' : ''}" data-v="${k}" aria-pressed="${R[p.id] === k}">
      <img src="img/cuerpos/${img}.webp" alt="" width="320" height="867" decoding="async"><span>${sug ? '★ ' : ''}${t}</span></button>`).join('')}</div>`;
  } else cuerpo = p.html();
  const boton = p.tipo !== 'uno' && p.tipo !== 'figs' || p.boton;
  c.innerHTML = `<div class="cq-top"><button type="button" class="cq-atras" aria-label="Volver"${CQ.i ? '' : ' data-salir'}>‹</button>
      <div class="cq-bar" role="progressbar" aria-valuemin="1" aria-valuemax="${n}" aria-valuenow="${CQ.i + 1}"><i style="width:${(CQ.i + 1) / n * 100}%"></i></div>
      <span class="cq-cnt">${CQ.i + 1}/${n}</span></div>
    <div class="cq-body"><h2 class="cq-t">${p.t}</h2>${p.sub ? `<p class="cq-sub">${p.sub}</p>` : ''}${cuerpo}</div>
    ${boton ? `<div class="cq-pie"><button type="button" class="hoy-btn cq-sig"${respondido(p) ? '' : ' disabled'}>${p.boton || 'Continuar'}</button></div>` : ''}`;
  c.scrollTop = 0;
}
function ir(d){
  const j = CQ.i + d;
  if(j < 0) return;
  if(j >= PASOS.length){ terminar(); return; }
  CQ.i = j; guardar(); pintar();
}
function abrir(desde0){
  if(desde0) CQ.i = 0;
  let c = el();
  if(!c){ c = document.createElement('div'); c.id = 'cuest'; c.setAttribute('role', 'dialog'); c.setAttribute('aria-modal', 'true'); c.setAttribute('aria-label', 'Cuestionario'); document.body.appendChild(c); escuchar(c); }
  // Datos que la app ya tiene
  if(PERFIL){ ['altura', 'edad', 'sexo'].forEach(k => { if(R[k] == null && PERFIL[k] != null) R[k] = PERFIL[k]; }); if(R.meta == null && metaDe(PERFIL)) R.meta = metaDe(PERFIL); }
  if(R.peso == null && pesoCorporal()) R.peso = pesoCorporal();
  c.hidden = false; document.documentElement.classList.add('cq-abierto');
  pintar();
}
function cerrar(){ const c = el(); if(c) c.hidden = true; document.documentElement.classList.remove('cq-abierto'); }
function escuchar(c){
  c.addEventListener('click', e => {
    const p = PASOS[CQ.i];
    if(e.target.closest('.cq-atras')){
      if(e.target.closest('[data-salir]')){ cerrar(); if(!PERFIL){ store.set('atlas.perfilOmitido', true); setTab('semana'); } return; }
      ir(-1); return;
    }
    if(e.target.closest('.cq-sig')){ if(respondido(p)) ir(1); return; }
    const mm = e.target.closest('.cq-mm');
    if(mm){ const i = $('#cq-in'); const v = Math.min(p.max, Math.max(p.min, (numero(i.value) || val(p.def)) + Number(mm.dataset.d) * p.paso)); i.value = Math.round(v * 10) / 10; i.dispatchEvent(new Event('input', {bubbles:true})); return; }
    const op = e.target.closest('.cq-op, .cq-fig');
    if(!op) return;
    const v = op.dataset.v;
    if(p.tipo === 'varios'){
      let s = R[p.id] || [];
      s = s.includes(v) ? s.filter(x => x !== v) : (v === p.unico ? [v] : s.filter(x => x !== p.unico).concat(v));
      R[p.id] = s; guardar(); pintar();
      return;
    }
    R[p.id] = v; guardar();
    if(p.id === 'sexo' || p.id === 'hoy') { delete R.cmeta; delete R.pobj; }   // cambian las figuras de meta y el peso sugerido
    pintar();
    setTimeout(() => ir(1), 220);   // se ve la selección y pasa sola
  });
  c.addEventListener('input', e => {
    if(e.target.id !== 'cq-in') return;
    const p = PASOS[CQ.i], v = numero(e.target.value);
    R[p.id] = v >= p.min && v <= p.max ? v : null;
    if(p.id === 'peso' || p.id === 'altura'){ delete R.hoy; delete R.cmeta; delete R.pobj; }
    guardar();
    const ay = $('#cq-ay'); if(ay) ay.innerHTML = val(p.ayuda, '');
    const b = c.querySelector('.cq-sig'); if(b) b.disabled = !respondido(p);
  });
}
window.CUEST = {abrir, cerrar};
})();
