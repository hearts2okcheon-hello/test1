// 시작 화면 (ADR-021): 앱·웹을 처음 열 때 가방 오소리가 달려가는 화면. 같은 창에서는 한 번만 보여 준다

export const SPLASH_ID = "ok-splash";
/** 같은 창(세션)에서 이미 보여 줬다는 표시 */
export const SPLASH_KEY = "ok-splash-seen";

/** 화면이 빨리 준비돼도 달려가는 모습이 보일 만큼은 띄워 둔다 (시작 화면이 처음 그려진 때부터) */
export const SPLASH_MIN_MS = 900;
/** 오소리가 오른쪽으로 달려 나가며 시작 화면이 사라지는 데 걸리는 시간 (globals.css 의 ok-splash 와 맞춘다) */
export const SPLASH_LEAVE_MS = 420;

/**
 * 화면이 준비된 뒤 시작 화면을 얼마나 더 보여 줄까.
 * elapsedMs 는 시작 화면이 처음 그려진 뒤 지난 시간. 이미 충분히 지났으면 0
 */
export function splashWait(elapsedMs: number, minMs: number = SPLASH_MIN_MS): number {
  if (!Number.isFinite(elapsedMs)) return 0;
  return Math.max(0, Math.min(minMs, minMs - elapsedMs));
}

/**
 * 시작 화면 바로 뒤에 넣는 글(스크립트). 화면을 그리기 전에 돈다.
 * 같은 창에서 두 번째로 여는 화면부터는 시작 화면을 감추고(data-state="off"), 처음이면 봤다고 적어 둔다
 */
export const SPLASH_ONCE_SCRIPT = `(function(){try{var e=document.getElementById("${SPLASH_ID}");if(sessionStorage.getItem("${SPLASH_KEY}")){if(e)e.setAttribute("data-state","off")}else{sessionStorage.setItem("${SPLASH_KEY}","1")}}catch(_){}})()`;
