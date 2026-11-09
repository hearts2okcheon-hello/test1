import { redirect } from "next/navigation";
import { StoreEditor } from "@/components/StoreEditor";
import { createClient } from "@/lib/supabase/server";
import type { OwnerHome } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 코드를 넣은 뒤 처음 한 번 가게를 등록한다 (ADR-007) */
export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_owner_home");
  const home = (data ?? { state: "no_store", is_admin: false }) as OwnerHome;
  if (home.state !== "needs_store") redirect("/owner");

  return (
    <main className="flex flex-1 flex-col px-[18px] pt-4">
      <StoreEditor
        initial={{ storeId: null, name: "", phone: home.phone ?? "", phonePublic: false, category: null, neighborhood: null, intro: null, address: null, hours: null, menus: [], photos: [] }}
      />
    </main>
  );
}
