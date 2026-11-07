import { redirect } from "next/navigation";
import { StoreEditor } from "@/components/StoreEditor";
import { manageableStore } from "@/lib/owner";

export const dynamic = "force-dynamic";

export default async function EditStorePage({ searchParams }: { searchParams: Promise<{ store?: string }> }) {
  const { store } = await searchParams;
  const detail = await manageableStore(store);
  if (!detail) redirect("/owner");

  return (
    <main className="flex flex-1 flex-col px-[18px] pt-4">
      <StoreEditor
        initial={{
          storeId: detail.store.store_id,
          name: detail.store.name,
          phone: detail.profile.phone ?? "",
          category: detail.store.category,
          neighborhood: detail.store.neighborhood,
          intro: detail.profile.intro,
          address: detail.store.address,
          hours: detail.store.regular_hours,
          menus: detail.menus,
          photos: detail.photos,
        }}
      />
    </main>
  );
}
