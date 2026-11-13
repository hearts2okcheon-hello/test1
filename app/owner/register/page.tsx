import { redirect } from "next/navigation";
import { StoreEditor } from "@/components/StoreEditor";
import { createClient } from "@/lib/supabase/server";
import type { OwnerHome } from "@/lib/types";

export const dynamic = "force-dynamic";

/** 가게 등록 (ADR-009, ADR-014). 내 정보를 등록하고 연락 안내를 확인한 사람만 들어온다 */
export default async function RegisterPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_owner_home");
  const home = (data ?? { state: "no_store", is_admin: false }) as OwnerHome;
  if (home.state !== "needs_store") redirect("/owner");
  if (!home.profile.registered) redirect("/owner/profile");
  if (!home.profile.store_ack) redirect("/owner");

  return (
    <main className="flex flex-1 flex-col px-[18px] pt-4">
      <StoreEditor
        initial={{
          storeId: null,
          name: "",
          // 내 정보에 적은 번호를 먼저 채워 둔다
          phone: home.phone ?? home.profile.phone ?? "",
          phonePublic: false,
          storePhone: "",
          storePhonePublic: false,
          logoUrl: null,
          category: null,
          neighborhood: null,
          intro: null,
          address: null,
          hours: null,
          menus: [],
          photos: [],
        }}
      />
    </main>
  );
}
