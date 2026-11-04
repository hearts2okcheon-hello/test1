import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClaimForm } from "./ClaimForm";

export const dynamic = "force-dynamic";

export default async function ClaimPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.is_anonymous) redirect("/owner/login");

  const { data } = await supabase.from("stores").select("id, name, category, address, owner_id").order("name");
  const stores = (data ?? []).filter((s) => !s.owner_id);

  return (
    <main className="flex flex-1 flex-col gap-4 px-[18px] pt-4 pb-6">
      <header className="flex items-center gap-2.5">
        <Link href="/owner" aria-label="뒤로" className="flex size-[46px] items-center justify-center rounded-full border-2 border-line bg-card">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="font-display text-[23px] font-normal">내 가게 찾기</h1>
      </header>
      <ClaimForm stores={stores.map((s) => ({ id: s.id, name: s.name, category: s.category, address: s.address }))} />
    </main>
  );
}
