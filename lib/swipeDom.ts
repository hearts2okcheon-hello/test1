/**
 * 이 자리에서 시작한 옆 밀기는 화면 넘기기가 아니다:
 * 입력칸, 창(dialog), data-no-swipe 로 표시한 곳, 그리고 스스로 옆으로 넘어가는 목록(탭 줄 등) 안
 */
export function blocksSwipe(el: Element | null): boolean {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.matches("input, textarea, select, [role=dialog], [data-no-swipe]")) return true;
    const ox = getComputedStyle(n).overflowX;
    if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 2) return true;
  }
  return false;
}

/**
 * 옆으로 넘기는 줄의 onFocus 에 건다: 글쇠(Tab)로 옮겨 간 칸이 화면 끝에 걸려 잘려 보이면 그 칸이 다 보이게 줄을 옮긴다.
 * (브라우저는 조금이라도 보이는 칸에는 줄을 옮겨 주지 않는다.) 손가락·마우스로 누른 것은 건드리지 않는다
 */
export function revealFocused(e: { target: EventTarget | null }): void {
  const el = e.target;
  if (el instanceof HTMLElement && el.matches(":focus-visible")) el.scrollIntoView({ inline: "nearest", block: "nearest" });
}
