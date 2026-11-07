import Link from "next/link";
import { redirect } from "next/navigation";
import { Osori } from "@/components/Osori";
import { SignOutButton } from "@/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";
import type { AdminContent, Metrics, OwnerCodeItem, QueueItem, StoreSign } from "@/lib/types";
import { ProxyPanel, QueueList, StoreForm } from "./AdminPanels";
import { CodePanel } from "./CodePanel";
import { ContentPanel } from "./ContentPanel";

export const dynamic = "force-dynamic";

const TABS = [
  { id: "codes", label: "사장님 코드" },
  { id: "content", label: "게시물" },
  { id: "queue", label: "엇갈림·무응답" },
  { id: "proxy", label: "대리 등록" },
  { id: "stores", label: "가게 관리" },
  { id: "metrics", label: "지표" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === sp.tab) ? (sp.tab as Tab) : "codes";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.is_anonymous) redirect("/admin/login");
  const { data: isAdmin } = await supabase.rpc("okc_is_admin");
  if (!isAdmin) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <Osori mood="think" size={110} />
        <h1 className="font-display text-2xl font-normal">옥천신문 관리자만 볼 수 있어요</h1>
        <SignOutButton />
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-8">
      <header className="flex items-center gap-2.5">
        <Osori mood="work" size={64} />
        <div className="flex flex-1 flex-col">
          <span className="text-[13px] text-muted">옥천신문 관리자</span>
          <h1 className="font-display text-2xl leading-tight font-normal">옥!소리 관리</h1>
        </div>
        <SignOutButton />
      </header>

      <nav aria-label="관리 메뉴" className="-mx-[18px] flex gap-1.5 overflow-x-auto px-[18px] pb-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin?tab=${t.id}`}
            aria-current={t.id === tab ? "page" : undefined}
            className={`min-h-10 shrink-0 rounded-[20px] border-2 px-3.5 py-2 text-sm font-bold ${t.id === tab ? "border-ink bg-yellow" : "border-line bg-card"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "queue" && <QueueTab />}
      {tab === "proxy" && <ProxyTab />}
      {tab === "codes" && <CodesTab />}
      {tab === "content" && <ContentTab />}
      {tab === "stores" && <StoreForm />}
      {tab === "metrics" && <MetricsTab from={sp.from} to={sp.to} />}
    </main>
  );
}

async function QueueTab() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_get_queue");
  return <QueueList items={(data ?? []) as QueueItem[]} />;
}

async function ProxyTab() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_store_signs");
  const { data: notices } = await supabase
    .from("notices")
    .select("id, store_id, kind, at_time, memo, source, created_at, from_report_id")
    .is("ended_at", null)
    .gt("expires_at", new Date().toISOString());
  return <ProxyPanel stores={(data ?? []) as StoreSign[]} notices={notices ?? []} />;
}

async function CodesTab() {
  const supabase = await createClient();
  const [codes, signs] = await Promise.all([supabase.rpc("admin_list_owner_codes"), supabase.rpc("get_store_signs")]);
  const items = (codes.data ?? []) as OwnerCodeItem[];
  const linked = new Set(items.map((c) => c.store_id));
  const unlinked = ((signs.data ?? []) as StoreSign[]).filter((s) => !linked.has(s.store_id)).map((s) => ({ store_id: s.store_id, name: s.name }));
  return <CodePanel items={items} unlinkedStores={unlinked} />;
}

async function ContentTab() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_list_content");
  return <ContentPanel content={(data ?? { posts: [], comments: [] }) as AdminContent} />;
}

/** 기본 기간: 최근 7일 */
async function MetricsTab({ from, to }: { from?: string; to?: string }) {
  const day = 24 * 60 * 60 * 1000;
  const toDate = to ? new Date(`${to}T00:00:00+09:00`) : new Date(Date.now() + day);
  const fromDate = from ? new Date(`${from}T00:00:00+09:00`) : new Date(toDate.getTime() - 7 * day);
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_metrics", { p_from: fromDate.toISOString(), p_to: toDate.toISOString() });
  const m = data as Metrics | null;
  if (!m) return <p className="text-sm text-muted">지표를 불러오지 못했어요.</p>;

  const pct = (a: number, b: number) => (b === 0 ? "-" : `${Math.round((a / b) * 100)}%`);
  const rows: [string, string, string][] = [
    ["공지 등록률", pct(m.stores_with_owner_notice, m.verified_pilot_stores), `직접 공지한 가게 ${m.stores_with_owner_notice} ÷ 인증된 시범 가게 ${m.verified_pilot_stores}`],
    ["가게당 공지 일수", m.verified_pilot_stores ? (m.owner_notice_store_days / m.verified_pilot_stores).toFixed(1) : "-", `공지한 가게·날 ${m.owner_notice_store_days}`],
    ["확인 요청 응답률", pct(m.questions_answered_by_owner, m.questions_asked), `사장님 답 ${m.questions_answered_by_owner} ÷ 확인 질문 ${m.questions_asked}`],
    ["주민 재방문율", pct(m.returning_visitors, m.visitors), `2일 이상 방문 ${m.returning_visitors} ÷ 방문자 ${m.visitors}`],
  ];

  return (
    <section className="flex flex-col gap-3">
      <form className="flex flex-wrap items-end gap-2 text-sm" action="/admin">
        <input type="hidden" name="tab" value="metrics" />
        <label className="flex flex-col gap-1">
          시작일
          <input type="date" name="from" defaultValue={from} className="min-h-11 rounded-xl border-2 border-line bg-white px-2" />
        </label>
        <label className="flex flex-col gap-1">
          끝일(포함 안 함)
          <input type="date" name="to" defaultValue={to} className="min-h-11 rounded-xl border-2 border-line bg-white px-2" />
        </label>
        <button className="min-h-11 rounded-xl border-2 border-yellow-deep bg-yellow px-3 font-bold">보기</button>
      </form>
      <p className="text-xs text-muted">
        {fromDate.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} ~ {toDate.toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} 전날까지 · 시범 가게 {m.pilot_stores}곳 중 인증 {m.verified_pilot_stores}곳
      </p>
      {rows.map(([label, value, detail]) => (
        <div key={label} className="flex items-center gap-3 rounded-[20px] border-2 border-line bg-card px-4 py-3">
          <span className="flex flex-1 flex-col">
            <span className="font-bold">{label}</span>
            <span className="text-xs text-muted">{detail}</span>
          </span>
          <span className="font-display text-3xl">{value}</span>
        </div>
      ))}
      <p className="text-xs text-muted">공지 정확도는 현장 표본 확인 기록으로 따로 계산해요. (design.md §7)</p>
    </section>
  );
}
