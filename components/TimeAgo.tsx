"use client";

import { useEffect, useState } from "react";
import { timeAgo } from "@/lib/time";

/** "12분 전". 1분마다 갱신 */
export function TimeAgo({ iso, suffix = "" }: { iso: string; suffix?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {timeAgo(iso, now)}
      {suffix}
    </time>
  );
}
