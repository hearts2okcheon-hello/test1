import type { createClient } from "./supabase/client";

const BUCKET = "store-media";
const MAX_SIDE = 1280;

/** 휴대폰 사진은 크다. 올리기 전에 줄인다 (무료 저장 용량·시골 데이터 환경) */
async function shrink(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("IMAGE_READ");
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("IMAGE_READ");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) throw new Error("IMAGE_READ");
  return blob;
}

/** 내 프로필 사진을 올리고 공개 주소를 돌려준다 (avatars/<내 id>/) */
export async function uploadAvatar(supabase: ReturnType<typeof createClient>, userId: string, file: File): Promise<string> {
  const blob = await shrink(file, 480);
  const path = `avatars/${userId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** 가게 폴더에 사진을 올리고 공개 주소를 돌려준다 */
export async function uploadStoreImage(supabase: ReturnType<typeof createClient>, storeId: string, file: File): Promise<string> {
  const blob = await shrink(file);
  const path = `${storeId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
