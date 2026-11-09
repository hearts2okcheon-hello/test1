import { createClient } from "@/lib/supabase/client";

/** 가게를 지운다. 가게가 지워지면 사진 폴더 권한도 사라지므로 사진부터 지운다 */
export async function deleteStoreWithPhotos(storeId: string) {
  const supabase = createClient();
  const bucket = supabase.storage.from("store-media");
  const { data: files } = await bucket.list(storeId, { limit: 1000 });
  if (files?.length) await bucket.remove(files.map((f) => `${storeId}/${f.name}`));
  const { error } = await supabase.rpc("admin_delete_store", { p_store_id: storeId });
  if (error) throw error;
}
