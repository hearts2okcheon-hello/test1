import { describe, expect, it } from "vitest";
import { SPLASH_ID, SPLASH_KEY, SPLASH_MIN_MS, SPLASH_ONCE_SCRIPT, splashWait } from "@/lib/splash";

describe("시작 화면을 보여 주는 시간 (T-SPLASH-01)", () => {
  it("화면이 빨리 준비돼도 달려가는 모습이 보일 만큼은 남겨 둔다", () => {
    expect(splashWait(0)).toBe(SPLASH_MIN_MS);
    expect(splashWait(300)).toBe(SPLASH_MIN_MS - 300);
  });
  it("이미 그만큼 지났으면 바로 치운다", () => {
    expect(splashWait(SPLASH_MIN_MS)).toBe(0);
    expect(splashWait(5000)).toBe(0);
  });
  it("시계가 이상해도 정해 둔 시간보다 오래 붙잡지 않는다", () => {
    expect(splashWait(-100)).toBe(SPLASH_MIN_MS);
    expect(splashWait(Number.NaN)).toBe(0);
  });
});

describe("같은 창에서는 한 번만 (T-SPLASH-02)", () => {
  type El = { state: string; setAttribute(name: string, value: string): void };
  const element = (): El => ({
    state: "run",
    setAttribute(name, value) {
      if (name === "data-state") this.state = value;
    },
  });
  function storage(initial: Record<string, string> = {}) {
    const data = { ...initial };
    return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) };
  }
  // 화면에 넣는 글(스크립트)을 그대로 돌려 본다
  function run(store: unknown, el: El | null) {
    new Function("sessionStorage", "document", SPLASH_ONCE_SCRIPT)(store, { getElementById: (id: string) => (id === SPLASH_ID ? el : null) });
  }

  it("처음 열 때는 시작 화면을 그대로 두고, 봤다고 적어 둔다", () => {
    const store = storage();
    const el = element();
    run(store, el);
    expect(el.state).toBe("run");
    expect(store.data[SPLASH_KEY]).toBe("1");
  });
  it("같은 창에서 다시 열면 그리기 전에 감춘다", () => {
    const store = storage({ [SPLASH_KEY]: "1" });
    const el = element();
    run(store, el);
    expect(el.state).toBe("off");
  });
  it("저장소를 못 쓰거나 시작 화면이 없어도 멈추지 않는다", () => {
    const broken = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    };
    const el = element();
    expect(() => run(broken, el)).not.toThrow();
    expect(el.state).toBe("run");
    expect(() => run(storage({ [SPLASH_KEY]: "1" }), null)).not.toThrow();
  });
});
