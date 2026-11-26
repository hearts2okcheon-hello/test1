import { describe, expect, it } from "vitest";
import { ALERT_ACTION_LABEL, alertAction, alertKind, alertTitle, type AlertItem } from "@/lib/alerts";

const base: AlertItem = { id: 1, title: "사장님, 오늘 문 여셨나요?", body: "하츠투호떡 평소 여는 시간(09:00)이 지났어요.", url: "/owner/store", created_at: "2026-11-27T09:10:00+09:00", is_read: false, kind: "open_check", needs_action: true };

describe("알림 종류와 제목 (T-ALERT-10)", () => {
  it("서버가 알려 준 종류를 쓰고, 모르는 값이나 빈 값은 other", () => {
    expect(alertKind("favorite")).toBe("favorite");
    expect(alertKind("open_check")).toBe("open_check");
    expect(alertKind("report")).toBe("report");
    expect(alertKind("reply")).toBe("reply");
    expect(alertKind("새로 생긴 종류")).toBe("other");
    expect(alertKind(undefined)).toBe("other");
    expect(alertKind(null)).toBe("other");
  });

  it("제목 앞의 그림 글자는 뗀다 (종류는 아이콘이 알려 준다)", () => {
    expect(alertTitle("⭐ 이루네 가든")).toBe("이루네 가든");
    expect(alertTitle("🔔 이웃 제보가 왔어요")).toBe("이웃 제보가 왔어요");
    expect(alertTitle("💬 사장님이 답했어요")).toBe("사장님이 답했어요");
  });

  it("그림 글자가 없는 제목은 그대로", () => {
    expect(alertTitle("사장님, 오늘 문 여셨나요?")).toBe("사장님, 오늘 문 여셨나요?");
    expect(alertTitle("별 ⭐ 이 가운데 있는 가게")).toBe("별 ⭐ 이 가운데 있는 가게");
  });
});

describe("할 일이 남은 알림에만 누를 곳을 보인다 (T-ALERT-11)", () => {
  it("오픈 시간 확인이고 아직 할 일이 남았으면 '영업 상태 설정' → 알림이 가리키는 화면", () => {
    expect(ALERT_ACTION_LABEL).toBe("영업 상태 설정");
    expect(alertAction(base)).toEqual({ label: "영업 상태 설정", href: "/owner/store" });
  });

  it("이미 처리했거나 날이 지난 알림에는 없다", () => {
    expect(alertAction({ ...base, needs_action: false })).toBeNull();
    expect(alertAction({ ...base, needs_action: undefined })).toBeNull();
  });

  it("소식만 전하는 알림에는 없다", () => {
    expect(alertAction({ ...base, kind: "favorite", needs_action: true })).toBeNull();
    expect(alertAction({ ...base, kind: "reply", needs_action: true })).toBeNull();
    expect(alertAction({ ...base, kind: undefined, needs_action: true })).toBeNull();
  });
});
