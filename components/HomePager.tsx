"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { flushSync } from "react-dom";
import { HomeFavorites } from "@/app/HomeFavorites";
import { CATEGORY_GROUPS, categoryById } from "@/lib/categories";
import { HOME_TABS, feedInTab, homeTabName, neighborHomeTab, sectionsInTab, storesInTab, tabDirection, type HomeTabId, type TabGroupId } from "@/lib/homeTabs";
import { TAB_RESELECT } from "@/lib/nav";
import { feedDetail, feedTag } from "@/lib/signs";
import { filterByStatus, storeStatus, type StatusFilter } from "@/lib/storeFilter";
import { setInnerPager, shouldCommitSwipe, swipeLock } from "@/lib/swipe";
import { blocksSwipe } from "@/lib/swipeDom";
import type { FeedItem, StoreSign } from "@/lib/types";
import { CategoryIcon } from "./CategoryIcon";
import { StatusSelect } from "./StatusSelect";
import { StoreCard } from "./StoreCard";
import { TimeAgo } from "./TimeAgo";

/** 홈에서는 가게를 구역마다 이만큼씩만 보여 주고, 더 있으면 "더 보기"로 넘긴다 */
const STORE_LIMIT = 10;
/** 실시간 가게소식은 이만큼만 보여 주고, 더 있으면 소통광장의 사장님 소식으로 넘긴다 */
const FEED_LIMIT = 5;
const SLIDE_MS = 240;
const BACK_MS = 200;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

// 다른 화면에 다녀와도 보던 탭과 상태 고르기를 기억한다 (앱을 새로 열면 전체)
const remembered: { tab: HomeTabId; status: StatusFilter } = { tab: "all", status: "all" };

const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * 홈의 카테고리 탭 (ADR-016, ADR-022). 맨 왼쪽이 전체, 그다음 식당 · 카페·디저트 · 미용 · 생활용품 · 패션 · 의료·건강 · 생활시설 · 식료품.
 * 탭을 누르거나 화면을 옆으로 밀면 그 업종의 가게소식과 가게로 넘어가고, 식당처럼 여러 카테고리가 든 묶음은 아래로 카테고리마다 나뉜다.
 * 미는 동안 지금 화면과 옆 화면이 손가락을 따라오고, 마지막 탭에서 더 밀면 아래 탭(소통광장)으로 넘어간다 (TabSwipe 가 맡는다)
 */
export function HomePager({ feed, stores, favoriteIds }: { feed: FeedItem[]; stores: StoreSign[]; favoriteIds: string[] }) {
  const [tab, setTab] = useState<HomeTabId>(() => remembered.tab);
  const [peek, setPeek] = useState<HomeTabId | null>(null);
  const [status, setStatus] = useState<StatusFilter>(() => remembered.status);
  const [stuck, setStuck] = useState(false);
  const frame = useRef<HTMLDivElement>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const row = useRef<HTMLDivElement>(null);
  // 손짓과 애니메이션이 읽는 지금 값 (다시 그리기를 기다리지 않는다)
  const live = useRef<{ tab: HomeTabId; peek: HomeTabId | null; moving: boolean; alive: boolean }>({ tab: remembered.tab, peek: null, moving: false, alive: true });
  const go = useRef<(next: HomeTabId) => void>(() => {});

  // 기억해 둔 탭으로 돌아왔으면 탭 줄에서 그 탭이 보이게 한다
  useLayoutEffect(() => {
    const el = document.getElementById(`home-tab-${remembered.tab}`);
    if (row.current && el) row.current.scrollLeft = el.offsetLeft - (row.current.clientWidth - el.offsetWidth) / 2;
  }, []);

  // 탭 줄이 화면 위에 붙었는지 (붙으면 바탕과 아래 선을 준다)
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const st = live.current;
    st.alive = true;
    const pane = (id: HomeTabId) => frame.current?.querySelector<HTMLElement>(`[data-pane="${id}"]`) ?? null;
    const width = () => frame.current?.clientWidth ?? window.innerWidth;
    // 탭 줄이 위에 붙기 시작하는 스크롤 위치. 여기로 가면 화면의 맨 위가 탭 줄 바로 아래에 온다
    const stickTop = () => (sentinel.current ? sentinel.current.getBoundingClientRect().top + window.scrollY : 0);
    const clear = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.transition = "";
      el.style.transform = "";
      el.style.top = "";
      el.style.willChange = "";
    };

    function centerTab(id: HomeTabId) {
      const el = document.getElementById(`home-tab-${id}`);
      if (!row.current || !el) return;
      row.current.scrollTo({ left: el.offsetLeft - (row.current.clientWidth - el.offsetWidth) / 2, behavior: calm() ? "auto" : "smooth" });
    }

    function setPeekNow(next: HomeTabId | null) {
      if (st.peek === next) return;
      st.peek = next;
      flushSync(() => setPeek(next));
    }

    /** 옆 화면을 손가락이 끌어온 자리(dx)에 놓는다. 스크롤해 내려와 있었다면 탭 줄 바로 아래에서부터 보이게 한다 */
    function placePeek(next: HomeTabId, dir: 1 | -1, dx: number) {
      setPeekNow(next);
      const el = pane(next);
      if (!el) return;
      el.style.transition = "";
      el.style.willChange = "transform";
      el.style.top = `${Math.max(0, window.scrollY - stickTop())}px`;
      el.style.transform = `translate3d(${dx + dir * width()}px,0,0)`;
    }

    /** 넘김을 끝낸다: 옆 화면이 지금 화면이 된다 (같은 화면 조각을 그대로 써서 깜빡이지 않는다) */
    function settle(next: HomeTabId) {
      if (!st.alive) return;
      const top = stickTop();
      const changed = st.tab !== next;
      st.tab = next;
      st.peek = null;
      remembered.tab = next;
      flushSync(() => {
        setTab(next);
        setPeek(null);
      });
      clear(pane(next));
      // 탭 줄이 위에 붙어 있었다면 새 화면은 맨 위부터 보여 준다
      if (window.scrollY > top) window.scrollTo(0, top);
      st.moving = false;
      if (changed) centerTab(next);
    }

    function run(els: (HTMLElement | null)[], to: string[], ms: number, done: () => void) {
      els.forEach((el, i) => {
        if (!el) return;
        el.style.transition = `transform ${ms}ms ${EASE}`;
        el.style.transform = to[i];
      });
      window.setTimeout(done, ms + 40);
    }

    /** 옆 화면이 제자리로 들어오고 지금 화면은 반대쪽으로 나간다 */
    function finish(next: HomeTabId, dir: 1 | -1) {
      st.moving = true;
      const el = pane(next);
      if (el) void el.offsetWidth; // 놓인 자리에서부터 미끄러지게
      run([el, pane(st.tab)], ["translate3d(0,0,0)", `translate3d(${-dir * width()}px,0,0)`], SLIDE_MS, () => settle(next));
    }

    /** 덜 밀었으면 제자리로 돌아간다 */
    function cancel(dir: 1 | -1) {
      st.moving = true;
      run([pane(st.tab), st.peek ? pane(st.peek) : null], ["translate3d(0,0,0)", `translate3d(${dir * width()}px,0,0)`], BACK_MS, () => {
        if (!st.alive) return;
        setPeekNow(null);
        clear(pane(st.tab));
        st.moving = false;
      });
    }

    go.current = (next) => {
      if (st.moving || next === st.tab) return;
      const dir = tabDirection(st.tab, next);
      if (dir === 0) return;
      if (calm()) return settle(next);
      placePeek(next, dir, 0);
      finish(next, dir);
    };

    // ── 옆으로 밀기 ──────────────────────────────────────────────
    let start: { x: number; y: number } | null = null;
    let locked: boolean | null = null;
    let mine = false;
    let dir: 1 | -1 = 1;
    let lastX = 0;
    let lastT = 0;
    let vx = 0;

    function onStart(e: TouchEvent) {
      locked = null;
      mine = false;
      start = st.moving || e.touches.length !== 1 || blocksSwipe(e.target as Element) ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY };
      if (start) {
        lastX = start.x;
        lastT = e.timeStamp;
        vx = 0;
      }
    }

    function onMove(e: TouchEvent) {
      if (!start) return;
      const x = e.touches[0].clientX;
      const dx = x - start.x;
      if (locked === null) {
        locked = swipeLock(dx, e.touches[0].clientY - start.y);
        if (!locked) return;
        // 손가락이 가는 쪽에 넘길 카테고리가 있을 때만 맡는다. 끝이면 아래 탭 밀기(TabSwipe)가 맡는다
        mine = neighborHomeTab(st.tab, dx < 0 ? 1 : -1) !== null;
        if (!mine) start = null;
      }
      if (!start || !locked || !mine) return;

      const dt = e.timeStamp - lastT;
      if (dt > 0) {
        vx = 0.7 * ((x - lastX) / dt) + 0.3 * vx;
        lastX = x;
        lastT = e.timeStamp;
      }
      if (calm()) return;

      const d: 1 | -1 = dx < 0 ? 1 : -1;
      const next = neighborHomeTab(st.tab, d);
      const cur = pane(st.tab);
      if (!cur) return;
      cur.style.transition = "";
      cur.style.willChange = "transform";
      if (!next) {
        // 밀다가 되돌아와 끝을 넘으면 조금만 끌려온다
        setPeekNow(null);
        cur.style.transform = `translate3d(${dx * 0.2}px,0,0)`;
        return;
      }
      dir = d;
      placePeek(next, d, dx);
      cur.style.transform = `translate3d(${dx}px,0,0)`;
    }

    function onEnd(e: TouchEvent) {
      if (!start || !mine) {
        start = null;
        return;
      }
      const dx = e.changedTouches[0].clientX - start.x;
      start = null;
      if (e.timeStamp - lastT > 120) vx = 0; // 멈췄다가 뗐으면 튕긴 것이 아니다
      const d: 1 | -1 = dx < 0 ? 1 : -1;
      const next = neighborHomeTab(st.tab, d);
      const commit = next !== null && shouldCommitSwipe(dx, vx, width());
      if (calm()) {
        if (commit && next) settle(next);
        return;
      }
      if (commit && next) {
        if (st.peek !== next) placePeek(next, d, dx);
        finish(next, d);
      } else {
        cancel(dir);
      }
    }

    function onCancel() {
      if (start && mine && !calm()) cancel(dir);
      start = null;
    }

    // 아래 홈 탭을 다시 누르면 전체 · 맨 위로 돌아간다
    function onReselect(e: Event) {
      if ((e as CustomEvent<string>).detail !== "/" || st.moving) return;
      if (st.tab !== "all") settle("all");
      window.scrollTo({ top: 0, behavior: calm() ? "auto" : "smooth" });
    }

    // 넘기는 중이거나 그쪽에 카테고리가 있으면 아래 탭 밀기는 손을 뗀다
    setInnerPager((dx) => st.moving || neighborHomeTab(st.tab, dx < 0 ? 1 : -1) !== null);
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onCancel, { passive: true });
    window.addEventListener(TAB_RESELECT, onReselect);
    return () => {
      st.alive = false;
      st.moving = false;
      setInnerPager(null);
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
      window.removeEventListener(TAB_RESELECT, onReselect);
    };
  }, []);

  // 탭 줄: ← → Home End 로 옮긴다 (탭을 옮기면 바로 그 화면이 열린다)
  function onKey(e: KeyboardEvent<HTMLButtonElement>) {
    const i = HOME_TABS.findIndex((t) => t.id === tab);
    const j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? HOME_TABS.length - 1 : -1;
    const next = HOME_TABS[j];
    if (!next || next.id === tab) return;
    e.preventDefault();
    go.current(next.id);
    document.getElementById(`home-tab-${next.id}`)?.focus();
  }

  function pickStatus(next: StatusFilter) {
    remembered.status = next;
    setStatus(next);
  }

  const panes: HomeTabId[] = peek && peek !== tab ? [tab, peek] : [tab];

  return (
    <div className="flex flex-col">
      <div ref={sentinel} aria-hidden className="h-0" />
      <div className={`sticky top-0 z-30 -mx-5 border-b-2 ${stuck ? "border-line bg-paper" : "border-transparent"}`}>
        <div ref={row} role="tablist" aria-label="카테고리" className="ok-scroll-x relative flex gap-1 overflow-x-auto px-5 py-2">
          {HOME_TABS.map((t) => {
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                id={`home-tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={on}
                aria-controls={on ? `home-panel-${t.id}` : undefined}
                tabIndex={on ? 0 : -1}
                onClick={() => go.current(t.id)}
                onKeyDown={onKey}
                className={`flex h-12 shrink-0 items-center gap-2 rounded-full border-2 pr-4 pl-1.5 font-display text-base whitespace-nowrap ${on ? "border-sage-deep bg-sage text-white" : "border-transparent hover:bg-card"}`}
              >
                <TabIcon id={t.id} />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={frame} className="ok-pager relative -mx-5 mt-2">
        {panes.map((id) => (
          <div
            key={id}
            data-pane={id}
            id={`home-panel-${id}`}
            role="tabpanel"
            aria-labelledby={`home-tab-${id}`}
            aria-hidden={id === tab ? undefined : true}
            inert={id !== tab}
            className={id === tab ? "px-5" : "absolute inset-x-0 top-0 px-5"}
          >
            <TabPane id={id} feed={feed} stores={stores} favoriteIds={favoriteIds} status={status} onStatus={pickStatus} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** 탭 그림: 묶음을 대표하는 카테고리 그림을 작은 동그라미에. 전체는 네 칸 */
function TabIcon({ id }: { id: HomeTabId }) {
  if (id === "all") {
    return (
      <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-yellow-soft text-ink">
        <svg width="24" height="24" viewBox="0 0 64 64" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round">
          <rect x="9" y="9" width="20" height="20" rx="6" fill={categoryById("cafe")!.bg} />
          <rect x="35" y="9" width="20" height="20" rx="6" fill={categoryById("korean")!.bg} />
          <rect x="9" y="35" width="20" height="20" rx="6" fill={categoryById("japanese")!.bg} />
          <rect x="35" y="35" width="20" height="20" rx="6" fill="var(--color-yellow)" />
        </svg>
      </span>
    );
  }
  const icon = CATEGORY_GROUPS.find((g) => g.id === id)!.icon;
  return (
    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: categoryById(icon)!.bg }}>
      <CategoryIcon id={icon} size={26} />
    </span>
  );
}

type PaneProps = { stores: StoreSign[]; status: StatusFilter; onStatus: (next: StatusFilter) => void };

/** 탭 하나의 내용. 맨 위에 실시간 가게소식(글이 있을 때만), 전체는 (즐겨찾는 가게) → 전체 가게, 묶음 탭은 카테고리마다 나뉜 가게 */
function TabPane({ id, feed, favoriteIds, ...rest }: PaneProps & { id: HomeTabId; feed: FeedItem[]; favoriteIds: string[] }) {
  return id === "all" ? <AllPane feed={feed} favoriteIds={favoriteIds} {...rest} /> : <GroupPane id={id} feed={feed} {...rest} />;
}

/**
 * 그 탭의 "실시간 가게소식" (ADR-022): 영업시간 변경 · 임시휴무 · 외출 · 사장님 소식과 공지를 짧게 보여 준다.
 * 올라온 글이 있을 때만 그린다. 없으면 빈 칸도 여백도 두지 않는다.
 * 글마다 종류(공지 · 소식 · 임시휴무 · 외출 중 …)를 붙여 구별한다
 */
function LiveNews({ rows, name }: { rows: FeedItem[]; name: string }) {
  if (rows.length === 0) return null;
  return (
    <section aria-label={`${name} 실시간 가게소식`} className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <h2 className="flex min-w-0 flex-1 items-center gap-2 font-display text-[19px] font-normal">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-coral" />
          실시간 가게소식
        </h2>
        {rows.length > FEED_LIMIT && <MoreLink href="/news?tab=owner" label="가게소식 더 보기" />}
      </div>
      <ul className="ok-sticker flex flex-col rounded-[22px] border-2 border-line bg-card px-4">
        {rows.slice(0, FEED_LIMIT).map((f, i) => {
          const tag = feedTag(f);
          return (
            <li key={`${f.item_type}-${f.item_id}`} className={i > 0 ? "border-t-2 border-line" : ""}>
              <Link href={f.item_type === "post" ? `/stores/${f.store_id}/posts/${f.item_id}` : `/stores/${f.store_id}`} className="flex flex-col gap-1 py-2.5">
                <span className="flex items-center gap-2">
                  <span className="shrink-0 rounded-[9px] px-2 py-0.5 font-display text-[13px] leading-snug" style={{ background: tag.bg, color: tag.fg }}>
                    {tag.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-base">{f.store_name}</span>
                  <span className="shrink-0 text-[13px] text-muted">
                    {f.source === "owner" ? "사장님" : "옥천신문"} · <TimeAgo iso={f.created_at} />
                  </span>
                </span>
                <span className="line-clamp-2 text-[15px] leading-snug">{feedDetail(f)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 전체 탭: 실시간 가게소식 → (즐겨찾는 가게가 있으면) 그 가게들의 팻말 → 전체 가게 */
function AllPane({ feed, favoriteIds, stores, status, onStatus }: PaneProps & { feed: FeedItem[]; favoriteIds: string[] }) {
  const shown = filterByStatus(stores, status);
  return (
    <div className="flex flex-col gap-6 pb-1">
      <LiveNews rows={feedInTab(feed, stores, "all")} name="전체" />
      <HomeFavorites stores={stores} initialIds={favoriteIds} />
      <section aria-label="전체 가게" className="flex flex-col gap-3">
        <PaneHead title="전체 가게" stores={stores} shown={shown.length} status={status} onStatus={onStatus} more={stores.length >= STORE_LIMIT ? "/stores" : null} />
        <StoreGrid stores={shown} />
        {shown.length === 0 && <EmptyNote>{stores.length === 0 ? "아직 등록된 가게가 없어요." : NO_MATCH}</EmptyNote>}
      </section>
    </div>
  );
}

/** 묶음 탭: 실시간 가게소식 아래로 카테고리마다 나뉜다 (식당은 한식 → 중식 → …). 카테고리가 하나뿐인 묶음은 나누지 않는다 */
function GroupPane({ id, feed, stores, status, onStatus }: PaneProps & { id: TabGroupId; feed: FeedItem[] }) {
  const name = homeTabName(id);
  const inTab = storesInTab(stores, id);
  const sections = sectionsInTab(stores, id);
  const single = sections.length === 1;
  const filled = sections.map((s) => ({ ...s, shown: filterByStatus(s.stores, status) })).filter((s) => s.shown.length > 0);
  const vacant = sections.filter((s) => s.stores.length === 0).map((s) => s.category.name);
  const shown = filled.reduce((n, s) => n + s.shown.length, 0);

  return (
    <div className="flex flex-col gap-6 pb-1">
      <LiveNews rows={feedInTab(feed, stores, id)} name={name} />
      <section aria-label={`${name} 가게`} className="flex flex-col gap-4">
      <PaneHead
        title={`${name} 가게`}
        stores={inTab}
        shown={shown}
        status={status}
        onStatus={onStatus}
        more={single && inTab.length >= STORE_LIMIT ? `/stores?cat=${sections[0].category.id}` : null}
      />
      {filled.map(({ category, stores: all, shown: list }) => (
        <section key={category.id} aria-label={category.name} className="flex flex-col gap-2.5">
          {!single && (
            <div className="flex min-h-11 items-center gap-2">
              <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full" style={{ background: category.bg }}>
                <CategoryIcon id={category.id} size={23} />
              </span>
              <h3 className="flex min-w-0 flex-1 items-baseline gap-1.5 font-display text-[17px] font-normal">
                <span className="truncate">{category.name}</span>
                <span className="shrink-0 font-sans text-sm text-muted">{list.length}곳</span>
              </h3>
              {all.length >= STORE_LIMIT && <MoreLink href={`/stores?cat=${category.id}`} label={`${category.name} 더 보기`} />}
            </div>
          )}
          <StoreGrid stores={list} />
        </section>
      ))}
      {filled.length === 0 && <EmptyNote>{inTab.length === 0 ? `아직 등록된 ${name} 가게가 없어요.` : NO_MATCH}</EmptyNote>}
      {!single && inTab.length > 0 && status === "all" && vacant.length > 0 && <p className="px-1 text-sm leading-normal text-muted">아직 가게가 없는 분류: {vacant.join(" · ")}</p>}
      </section>
    </div>
  );
}

const NO_MATCH = "지금 이 상태인 가게가 없어요. 위에서 다른 상태를 골라 주세요.";

/** 구역 머리: 제목 · 영업중 수 · 상태 고르기 · (많으면) 더 보기 */
function PaneHead({ title, stores, shown, status, onStatus, more }: PaneProps & { title: string; shown: number; more: string | null }) {
  const open = stores.filter((s) => storeStatus(s) === "open").length;
  return (
    <div className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <h2 className="truncate font-display text-[19px] font-normal">{title}</h2>
        <span aria-live="polite" className="text-sm text-muted">
          {status === "all" ? (
            <>
              영업중 <b className={open > 0 ? "text-open" : ""}>{open}곳</b> · 모두 {stores.length}곳
            </>
          ) : (
            <>
              <b className="text-ink">{shown}곳</b> · 모두 {stores.length}곳
            </>
          )}
        </span>
      </div>
      <StatusSelect value={status} onChange={onStatus} />
      {more && <MoreLink href={more} label="더 보기" />}
    </div>
  );
}

function StoreGrid({ stores }: { stores: StoreSign[] }) {
  if (stores.length === 0) return null;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] items-start gap-3">
      {stores.slice(0, STORE_LIMIT).map((s) => (
        <StoreCard key={s.store_id} store={s} />
      ))}
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[20px] border-2 border-dashed border-line px-4 py-3.5 text-[15px] leading-normal text-muted">{children}</p>;
}

function MoreLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} aria-label={label} className="flex min-h-11 shrink-0 items-center gap-0.5 rounded-full border-2 border-line bg-card pr-2.5 pl-3.5 font-display text-[15px]">
      더 보기
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
