import { createClient } from "./supabase/server";
import type { OwnerHome, StoreDetail } from "./types";

/**
 * 고칠 수 있는 가게의 상세. 권한이 없으면 null.
 * 관리자는 ?store= 로 다른 가게를, 사장님은 자기 가게를 연다. 최종 권한 검사는 RPC 가 다시 한다.
 */
export async function manageableStore(storeId?: string): Promise<StoreDetail | null> {
  const supabase = await createClient();
  let id = storeId;
  if (!id) {
    const { data } = await supabase.rpc("get_owner_home");
    const home = data as OwnerHome | null;
    if (home?.state !== "owner") return null;
    id = home.store.store_id;
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase.rpc("get_store_detail", { p_store_id: id });
  const detail = data as StoreDetail | null;
  return detail?.can_manage ? detail : null;
}
