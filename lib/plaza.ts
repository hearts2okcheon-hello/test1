// 소통광장 "동네 이야기"의 줄 (ADR-018). 예전의 "전체" 자리에 옥천신문(최근 기사)이 들어간다

export const PLAZA_TABS = [
  { id: "okinews", name: "옥천신문" },
  { id: "community", name: "동네 이야기" },
  { id: "owner", name: "사장님 소식" },
  { id: "neighbor", name: "이웃 제보" },
] as const;

export type PlazaTab = (typeof PLAZA_TABS)[number]["id"];

/** 주소의 ?tab= 값. 모르는 값이면 null (그때는 보던 줄이나 맨 앞 옥천신문을 연다) */
export function plazaTab(value: string | null | undefined): PlazaTab | null {
  return PLAZA_TABS.find((t) => t.id === value)?.id ?? null;
}
