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
