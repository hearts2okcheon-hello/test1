import Link from "next/link";
import { notFound } from "next/navigation";
import { PageView } from "@/components/PageView";
import { SignBoard } from "@/components/SignBoard";
import { createClient } from "@/lib/supabase/server";
import type { StoreDetail } from "@/lib/types";
import { StoreClient } from "./StoreClient";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reported?: string }>;
}) {
  const { id } = await params;
  const { reported } = await searchParams;
  if (!UUID.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_store_detail", { p_store_id: id });
  if (!data) notFound();
  const detail = data as StoreDetail;

  return (
    <>
      <header className="flex items-center gap-2.5 px-[18px] pt-3.5 pb-1">
        <Link href="/" aria-label="뒤로" className="flex size-[46px] items-center justify-center rounded-full border-2 border-line bg-card">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </Link>
        <h1 className="flex-1 truncate font-display text-[23px] font-normal">{detail.store.name}</h1>
      </header>

      <main className="flex flex-1 flex-col gap-3.5 px-[18px] pt-1 pb-4">
        <SignBoard store={detail.store} />
        <StoreClient detail={detail} reported={reported} />
      </main>

      <PageView name="store_view" storeId={id} />
    </>
  );
}
