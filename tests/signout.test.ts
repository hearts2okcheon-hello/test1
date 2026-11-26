import { afterEach, describe, expect, it, vi } from "vitest";
import { AFTER_SIGN_OUT, SIGN_OUT_COPY, SIGN_OUT_TIMEOUT_MS, SPINNER_AFTER_MS, canPress, runSignOut, showsSpinner, staleAfterSignOut } from "@/lib/signout";

afterEach(() => vi.useRealTimers());

describe("로그아웃 확인 창의 글 (T-LOGOUT-01)", () => {
  it("제목 · 설명 · 버튼 이름", () => {
    expect(SIGN_OUT_COPY.title).toBe("로그아웃 하시겠어요?");
    expect(SIGN_OUT_COPY.detail).toBe("다시 이용하려면 로그인해야 해요.");
    expect(SIGN_OUT_COPY.cancel).toBe("취소");
    expect(SIGN_OUT_COPY.confirm).toBe("로그아웃");
  });
  it("실패하면 알리고 다시 시도하게 한다", () => {
    expect(SIGN_OUT_COPY.failed).toContain("로그아웃하지 못했어요");
    expect(SIGN_OUT_COPY.retry).toBe("다시 시도");
  });
  it("끝나면 비로그인 홈으로 간다", () => {
    expect(AFTER_SIGN_OUT).toBe("/");
  });
});

describe("로그아웃 처리 (T-LOGOUT-02)", () => {
  it("오류 없이 끝나면 done", async () => {
    expect(await runSignOut(async () => ({ error: null }))).toBe("done");
  });
  it("오류를 돌려주면 failed (세션은 그대로라 다시 시도할 수 있다)", async () => {
    expect(await runSignOut(async () => ({ error: new Error("network") }))).toBe("failed");
  });
  it("도중에 터져도 failed", async () => {
    expect(
      await runSignOut(async () => {
        throw new Error("boom");
      }),
    ).toBe("failed");
  });
  it("답이 오지 않으면 정해 둔 시간 뒤에 failed (끝없이 기다리지 않는다)", async () => {
    vi.useFakeTimers();
    const result = runSignOut(() => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(SIGN_OUT_TIMEOUT_MS - 1);
    let settled = false;
    result.then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBe("failed");
  });
});

describe("처리하는 동안 (T-LOGOUT-03)", () => {
  it("금방 끝나면 스피너를 보이지 않고, 늦어질 때만 보인다", () => {
    expect(showsSpinner("working", 0)).toBe(false);
    expect(showsSpinner("working", SPINNER_AFTER_MS - 1)).toBe(false);
    expect(showsSpinner("working", SPINNER_AFTER_MS)).toBe(true);
  });
  it("묻는 중이거나 실패한 뒤에는 스피너가 없다", () => {
    expect(showsSpinner("ask", 5000)).toBe(false);
    expect(showsSpinner("failed", 5000)).toBe(false);
  });
  it("처리하는 동안에는 버튼을 누를 수 없다 (두 번 눌러도 한 번만)", () => {
    expect(canPress("working")).toBe(false);
    expect(canPress("ask")).toBe(true);
    expect(canPress("failed")).toBe(true);
  });
});

describe("로그아웃한 뒤 남아 있는 화면 (T-LOGOUT-04)", () => {
  it("그릴 때는 로그인해 있었는데 지금은 아니면 그 화면을 새로 받아야 한다", () => {
    expect(staleAfterSignOut(true, false)).toBe(true);
  });
  it("여전히 로그인해 있거나, 처음부터 로그인하지 않았으면 그대로 둔다", () => {
    expect(staleAfterSignOut(true, true)).toBe(false);
    expect(staleAfterSignOut(false, false)).toBe(false);
    expect(staleAfterSignOut(false, true)).toBe(false);
  });
});
