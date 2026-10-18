// Atlas Gym: recordatorios de entrenamiento por notificación push.
// modo "cron": lo llama pg_cron cada hora; manda el recordatorio a quien le toca a esa hora (una vez por día).
// modo "prueba": lo llama la app con la sesión del usuario; manda una notificación de prueba a sus dispositivos.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const VAPID_PUBLICA = "BHk-E_hl2KbZQSBv3SuLL7zZVyavLuhqyv6jG7ThviLzJUp2XDnOcxHLXOPSiZWJU5jGqDPw4tMnZ8SD1p20KUQ";
const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };

// Mismos planes que la app: qué rutina toca cada día (0 = domingo)
const SEMANA: Record<number, Record<number, string>> = {
  3: { 1: "A", 2: "DA", 3: "B", 4: "DA", 5: "C", 6: "D", 0: "D" },
  4: { 1: "TA", 2: "PA", 3: "DA", 4: "TB", 5: "PB", 6: "D", 0: "D" },
  5: { 1: "EMP", 2: "TIR", 3: "PIA", 4: "TBR", 5: "PIB", 6: "DA", 0: "D" },
};
const TITULO: Record<string, string> = {
  A: "Cuerpo completo A", B: "Cuerpo completo B", C: "Cuerpo completo C", TA: "Torso A", PA: "Piernas A", TB: "Torso B", PB: "Piernas B",
  EMP: "Empuje", TIR: "Tirón", PIA: "Piernas A", TBR: "Torso y brazos", PIB: "Piernas B",
};
const DIAS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

type Sub = { endpoint: string; user_id: string; p256dh: string; auth: string; hora: number; tz: string };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const parse = (x: unknown) => { try { return typeof x === "string" ? JSON.parse(x) : x; } catch { return null; } };

function ahoraEn(tz: string) {
  const d = new Date();
  const hora = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(d));
  const fecha = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const dia = DIAS[new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" }).format(d)];
  return { hora, fecha, dia };
}

async function enviar(subs: Sub[], datos: { title: string; body: string; url?: string }) {
  let ok = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(datos), { TTL: 6 * 3600 });
      ok++;
    } catch (e) {
      const st = (e as { statusCode?: number }).statusCode;
      if (st === 404 || st === 410) await sb.from("gym_push").delete().eq("endpoint", s.endpoint);   // el celular ya no acepta: se borra
      console.error("push", st, (e as Error).message);
    }
  }
  return ok;
}

// Qué decir hoy a un usuario según su plan y lo que entrenó (null = no hace falta recordar)
function mensaje(datos: Record<string, string> | null, fecha: string, dia: number) {
  const plan = Number(parse(datos?.["atlas.plan"]) || 4);
  const perfil = parse(datos?.["atlas.perfil"]) || {};
  const log = (parse(datos?.["atlas.log"]) || {}) as Record<string, { f: string }[]>;
  const clave = (SEMANA[plan] || SEMANA[4])[dia];
  if (!clave || clave === "D" || clave === "DA") return null;   // día libre
  const fechas = Object.values(log).flat().map((x) => x.f);
  if (fechas.includes(fecha)) return null;                     // ya entrenó hoy
  const ult = fechas.sort().pop();
  const dias = ult ? Math.round((Date.parse(fecha) - Date.parse(ult)) / 864e5) : null;
  const rutina = TITULO[clave] || "tu rutina", min = perfil.min ? `Unos ${perfil.min} minutos. ` : "";
  if (dias !== null && dias >= 3) return { tipo: "volver", title: `Hace ${dias} días que no entrenás`, body: `Hoy te toca ${rutina}. ${min}Con hacerlo hoy ya retomás el ritmo.` };
  return { tipo: "hoy", title: `Hoy te toca ${rutina}`, body: `${min}Tocá para empezar: la app te guía paso a paso.` };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const body = await req.json().catch(() => ({}));
  const { data: privada } = await sb.rpc("gym_secreto", { nombre: "gym_vapid_privada" });
  webpush.setVapidDetails("https://mi-atlas-gym.vercel.app", VAPID_PUBLICA, privada as string);

  if (body.modo === "prueba") {
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) return json({ error: "sin sesión" }, 401);
    const { data: subs } = await sb.from("gym_push").select("*").eq("user_id", user.id);
    const ok = await enviar((subs || []) as Sub[], { title: "¡Listo! Así te van a llegar", body: "Los recordatorios de Atlas Gym están activados en este celular." });
    return json({ enviados: ok });
  }

  if (body.modo === "cron") {
    const { data: secreto } = await sb.rpc("gym_secreto", { nombre: "gym_cron_secreto" });
    if (!secreto || body.secreto !== secreto) return json({ error: "no autorizado" }, 401);
    const { data: subs } = await sb.from("gym_push").select("*").eq("activo", true);
    const porUsuario = new Map<string, Sub[]>();
    for (const s of (subs || []) as Sub[]) porUsuario.set(s.user_id, [...(porUsuario.get(s.user_id) || []), s]);
    let enviados = 0;
    for (const [uid, lista] of porUsuario) {
      const tocan = lista.filter((s) => ahoraEn(s.tz).hora === s.hora);
      if (!tocan.length) continue;
      const { fecha, dia } = ahoraEn(tocan[0].tz);
      const { data: ya } = await sb.from("gym_push_log").select("fecha").eq("user_id", uid).eq("fecha", fecha).maybeSingle();
      if (ya) continue;
      const { data: fila } = await sb.from("gym_datos").select("datos").eq("user_id", uid).maybeSingle();
      const m = mensaje((fila?.datos || null) as Record<string, string> | null, fecha, dia);
      if (!m) continue;
      const ok = await enviar(tocan, { title: m.title, body: m.body, url: "/?empezar=1" });
      if (ok) { await sb.from("gym_push_log").insert({ user_id: uid, fecha, tipo: m.tipo }); enviados += ok; }
    }
    return json({ enviados });
  }
  return json({ error: "modo desconocido" }, 400);
});
