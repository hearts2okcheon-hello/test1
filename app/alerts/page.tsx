import { AlertList } from "@/components/AlertList";
import { BackButton } from "@/components/BackButton";
import type { AlertItem } from "@/lib/alerts";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** 받은 알림 목록. 홈 오른쪽 위 벨에서 들어온다 */
export default async function AlertsPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_alerts", { p_limit: 60 });

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-4 pb-8">
      <header className="flex items-center gap-2.5">
        <BackButton />
        <h1 className="font-display text-[23px] font-normal">알림</h1>
      </header>
      <AlertList alerts={(data ?? []) as AlertItem[]} />
    </main>
  );
}
