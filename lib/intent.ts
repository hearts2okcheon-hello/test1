// 가입할 때 "가게를 등록할 것입니까?" 답에 따라 사장님 메뉴를 보일지 정한다 (ADR-019).
// 누가 사장님 메뉴를 보는지는 DB 의 okc_owner_mode() 가 정하고, 화면은 그 답(owner)만 받는다

export type WriteItem = "story" | "owner" | "report";

/**
 * 쓰기 버튼을 펼쳤을 때 위에서부터 나오는 것.
 * 사장님 소식은 가게를 등록하는(한) 사람에게만 나온다. 없을 때는 동네 이야기가 그 자리로 내려온다
 */
export function writeMenu(owner: boolean): WriteItem[] {
  return owner ? ["story", "owner", "report"] : ["story", "report"];
}

/**
 * 내 공간에 가게 줄(가게 등록하기 · 내 가게)을 보일까.
 * 가게를 등록하지 않겠다고 답한 사람에게만 감춘다. 아직 묻지 않은 예전 가입자(null)는 예로 본다
 */
export function showsStoreMenu({ wantsStore, hasStore, hasCode }: { wantsStore: boolean | null | undefined; hasStore: boolean; hasCode: boolean }): boolean {
  return hasStore || hasCode || wantsStore !== false;
}
