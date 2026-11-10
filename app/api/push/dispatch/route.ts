import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { requireSupabaseEnv } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = { endpoint: string; p256dh: string; auth: string; title: string; body: string; url: string; tag: string | null };

/**
 * DB(push_outbox)에 쌓인 알림을 휴대폰으로 보낸다.
 * DB 가 pg_net 으로 이 주소를 부른다. 비밀값(x-push-secret)이 맞을 때만 동작한다 (ADR-013)
 */
export async function POST(req: Request) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret || req.headers.get("x-push-secret") !== secret) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return Response.json({ error: "push keys missing" }, { status: 503 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:hearts2okcheon@gmail.com", publicKey, privateKey);

  const { url, key } = requireSupabaseEnv();
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  let sent = 0;
  const gone: string[] = [];
  for (let round = 0; round < 5; round++) {
    const { data, error } = await supabase.rpc("claim_push_batch", { p_secret: secret, p_limit: 200 });
    if (error) return Response.json({ error: error.message, sent }, { status: 500 });
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) break;
    await Promise.all(
      rows.map(async (r) => {
        try {
          await webpush.sendNotification(
            { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
            JSON.stringify({ title: r.title, body: r.body, url: r.url, tag: r.tag }),
            { TTL: 6 * 3600, urgency: "high" },
          );
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          // 앱을 지웠거나 알림을 끈 기기
          if (code === 404 || code === 410) gone.push(r.endpoint);
        }
      }),
    );
  }
  if (gone.length > 0) await supabase.rpc("forget_push_endpoints", { p_secret: secret, p_endpoints: gone });
  return Response.json({ sent, gone: gone.length });
}
