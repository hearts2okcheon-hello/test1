import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PLAZA_TABS } from "@/lib/plaza";
import { SUBMIT_COPY, SUBMIT_DONE_MS, SUBMIT_RETRY, SUBMIT_TRANSITION_MS, afterPostHref, canSubmit, createSubmitter, submitLabel, type SubmitPhase } from "@/lib/submit";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/** 버튼이 거쳐 간 상태를 차례로 적어 둔다 */
function track(opts: Parameters<typeof createSubmitter>[1] = {}) {
  const seen: [SubmitPhase, string | null][] = [];
  const s = createSubmitter((phase, error) => seen.push([phase, error]), opts);
  return { s, seen, phases: () => seen.map(([p]) => p) };
}

/** 밖에서 끝내 줄 수 있는 서버 요청 */
function pending() {
  let ok!: () => void;
  let fail!: (e: unknown) => void;
  const calls = { n: 0 };
  const promise = new Promise<void>((resolve, reject) => {
    ok = resolve;
    fail = reject;
  });
  return { task: () => (calls.n++, promise), ok, fail, calls };
}

describe("저장·올리기 버튼의 글 (T-SUBMIT-01)", () => {
  it("정보·캘린더 저장: 저장하기 → 저장 중… → 저장했어요!", () => {
    expect(submitLabel("save", "idle")).toBe("저장하기");
    expect(submitLabel("save", "working")).toBe("저장 중…");
    expect(submitLabel("save", "done")).toBe("저장했어요!");
  });
  it("글 올리기: 올리기 → 올리는 중… → 올렸어요!", () => {
    expect(submitLabel("post", "idle")).toBe("올리기");
    expect(submitLabel("post", "working")).toBe("올리는 중…");
    expect(submitLabel("post", "done")).toBe("올렸어요!");
  });
  it("처음 등록하는 화면은 기본 글을 그대로 두고, 처리 중·완료만 맞춘다", () => {
    expect(submitLabel("register", "idle", "내 정보 등록하기")).toBe("내 정보 등록하기");
    expect(submitLabel("register", "working", "내 정보 등록하기")).toBe("등록하는 중…");
    expect(submitLabel("register", "done", "내 정보 등록하기")).toBe("등록했어요!");
  });
  it("아직 누를 수 없을 때의 안내(날짜를 골라 주세요)는 기본 글 자리에 보인다", () => {
    expect(submitLabel("save", "idle", "날짜를 골라 주세요")).toBe("날짜를 골라 주세요");
    expect(submitLabel("save", "working", "날짜를 골라 주세요")).toBe("저장 중…");
  });
  it("실패하면 어느 버튼이든 다시 시도", () => {
    for (const kind of Object.keys(SUBMIT_COPY) as (keyof typeof SUBMIT_COPY)[]) expect(submitLabel(kind, "failed")).toBe("다시 시도");
    expect(SUBMIT_RETRY).toBe("다시 시도");
  });
});

describe("상태가 바뀌는 시간 (T-SUBMIT-02)", () => {
  it("바뀌는 움직임은 200~300ms, 완료 표시는 1~1.5초", () => {
    expect(SUBMIT_TRANSITION_MS).toBeGreaterThanOrEqual(200);
    expect(SUBMIT_TRANSITION_MS).toBeLessThanOrEqual(300);
    expect(SUBMIT_DONE_MS).toBeGreaterThanOrEqual(1000);
    expect(SUBMIT_DONE_MS).toBeLessThanOrEqual(1500);
  });
});

describe("누른 뒤의 흐름 (T-SUBMIT-03)", () => {
  it("서버가 성공을 알려 준 뒤에만 완료가 된다", async () => {
    const { s, phases } = track();
    const req = pending();
    s.run(req.task);
    expect(phases()).toEqual(["working"]);
    await vi.advanceTimersByTimeAsync(8000);
    expect(phases()).toEqual(["working"]); // 아무리 오래 걸려도 답이 오기 전에는 완료가 아니다
    req.ok();
    await vi.advanceTimersByTimeAsync(0);
    expect(phases()).toEqual(["working", "done"]);
  });

  it("완료 표시가 끝난 뒤에 다음 일을 한다. 화면을 옮길 때는 옮겨질 때까지 완료 그대로", async () => {
    const { s, phases } = track();
    const then = vi.fn();
    const done = s.run(async () => {}, { then });
    await vi.advanceTimersByTimeAsync(SUBMIT_DONE_MS - 1);
    expect(then).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(then).toHaveBeenCalledTimes(1);
    expect(await done).toBe(true);
    expect(phases()).toEqual(["working", "done"]);
    expect(s.phase()).toBe("done");
  });

  it("화면에 남는 저장(캘린더)은 완료 표시 뒤 기본 상태로 돌아와 다시 쓸 수 있다", async () => {
    const { s, phases } = track();
    const then = vi.fn();
    s.run(async () => {}, { then, stay: true });
    await vi.advanceTimersByTimeAsync(SUBMIT_DONE_MS);
    expect(then).toHaveBeenCalledTimes(1);
    expect(phases()).toEqual(["working", "done", "idle"]);
  });

  it("성공이 확인된 그때 할 일(onDone)은 완료 표시와 함께 한다", async () => {
    const { s } = track();
    const onDone = vi.fn();
    const then = vi.fn();
    s.run(async () => {}, { onDone, then });
    await vi.advanceTimersByTimeAsync(0);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(then).not.toHaveBeenCalled();
  });
});

describe("같은 요청을 두 번 보내지 않는다 (T-SUBMIT-04)", () => {
  it("처리 중에 또 눌러도 한 번만 보낸다", async () => {
    const { s } = track();
    const req = pending();
    s.run(req.task);
    expect(await s.run(req.task)).toBe(false);
    expect(await s.run(req.task)).toBe(false);
    expect(req.calls.n).toBe(1);
  });

  it("완료 표시 중에도 다시 보내지 않는다", async () => {
    const { s } = track();
    const task = vi.fn(async () => {});
    s.run(task);
    await vi.advanceTimersByTimeAsync(SUBMIT_DONE_MS / 2);
    expect(s.phase()).toBe("done");
    expect(await s.run(task)).toBe(false);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("누를 수 있는 때는 기본 상태와 실패한 뒤뿐", () => {
    expect(canSubmit("idle")).toBe(true);
    expect(canSubmit("failed")).toBe(true);
    expect(canSubmit("working")).toBe(false);
    expect(canSubmit("done")).toBe(false);
  });
});

describe("실패 (T-SUBMIT-05)", () => {
  it("실패하면 알림 글과 함께 failed 가 되고, 다음 일은 하지 않는다", async () => {
    const { s, seen } = track({ explain: () => "인터넷 연결을 확인하고 다시 눌러 주세요." });
    const then = vi.fn();
    const onDone = vi.fn();
    expect(await s.run(async () => Promise.reject(new Error("network")), { then, onDone })).toBe(false);
    await vi.advanceTimersByTimeAsync(SUBMIT_DONE_MS * 2);
    expect(seen).toEqual([
      ["working", null],
      ["failed", "인터넷 연결을 확인하고 다시 눌러 주세요."],
    ]);
    expect(then).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("오류 코드는 앱의 말투로 바꿔 알린다", async () => {
    const { s, seen } = track();
    await s.run(async () => Promise.reject({ message: "INVALID_BODY" }));
    expect(seen.at(-1)).toEqual(["failed", "내용을 써 주세요."]);
  });

  it("다시 누르면 다시 보낸다 (재시도). 성공하면 알림 글이 지워진다", async () => {
    const { s, seen } = track();
    await s.run(async () => Promise.reject(new Error("x")));
    const task = vi.fn(async () => {});
    s.run(task);
    await vi.advanceTimersByTimeAsync(0);
    expect(task).toHaveBeenCalledTimes(1);
    expect(seen.slice(-2)).toEqual([
      ["working", null],
      ["done", null],
    ]);
  });
});

describe("화면을 떠났을 때 (T-SUBMIT-06)", () => {
  it("완료 표시 도중에 떠나면 화면을 옮기지 않고, 받아 둔 화면만 새로 받게 한다", async () => {
    const onAbandon = vi.fn();
    const { s } = track({ onAbandon });
    const then = vi.fn();
    s.run(async () => {}, { then });
    await vi.advanceTimersByTimeAsync(SUBMIT_DONE_MS / 2);
    s.stop();
    await vi.advanceTimersByTimeAsync(SUBMIT_DONE_MS);
    expect(then).not.toHaveBeenCalled();
    expect(onAbandon).toHaveBeenCalledTimes(1);
  });

  it("처리 중에 떠났는데 저장이 됐으면, 받아 둔 화면을 새로 받게 한다", async () => {
    const onAbandon = vi.fn();
    const { s, phases } = track({ onAbandon });
    const req = pending();
    const then = vi.fn();
    s.run(req.task, { then });
    s.stop();
    req.ok();
    await vi.advanceTimersByTimeAsync(SUBMIT_DONE_MS * 2);
    expect(onAbandon).toHaveBeenCalledTimes(1);
    expect(then).not.toHaveBeenCalled();
    expect(phases()).toEqual(["working"]); // 떠난 화면에는 더 알리지 않는다
  });

  it("저장한 것이 없으면 떠나도 아무 일도 하지 않는다", async () => {
    const onAbandon = vi.fn();
    const { s } = track({ onAbandon });
    s.stop();
    const failing = track({ onAbandon });
    await failing.s.run(async () => Promise.reject(new Error("x")));
    failing.s.stop();
    expect(onAbandon).not.toHaveBeenCalled();
  });

  it("화면이 다시 붙으면(개발 모드의 두 번 그리기) 그대로 쓸 수 있다", async () => {
    const { s, phases } = track();
    s.stop();
    s.resume();
    s.run(async () => {});
    await vi.advanceTimersByTimeAsync(0);
    expect(phases()).toEqual(["working", "done"]);
  });
});

describe("글을 올린 뒤 가는 곳 (T-SUBMIT-07)", () => {
  const tabs = PLAZA_TABS.map((t) => `/news?tab=${t.id}`);
  it("가게 소식·공지는 소통광장의 사장님 소식 줄", () => {
    expect(afterPostHref("store")).toBe("/news?tab=owner");
    expect(tabs).toContain(afterPostHref("store"));
  });
  it("동네 이야기는 소통광장의 동네 이야기 줄", () => {
    expect(afterPostHref("story")).toBe("/news?tab=community");
    expect(tabs).toContain(afterPostHref("story"));
  });
});
