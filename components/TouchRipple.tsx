"use client";

import { useEffect } from "react";

/** 누른 자리에 동그라미가 퍼져서 눌렸다는 것을 알려 준다 */
export function TouchRipple() {
  useEffect(() => {
    function onDown(e: PointerEvent) {
      const dot = document.createElement("span");
      dot.className = "ok-ripple";
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      dot.addEventListener("animationend", () => dot.remove());
      document.body.appendChild(dot);
    }
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, []);
  return null;
}
