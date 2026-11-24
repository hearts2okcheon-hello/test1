"use server";

import { getArticle } from "@/lib/okinews";
import { articleIdFrom } from "@/lib/storeArticles";
import { createClient } from "@/lib/supabase/server";

export type LinkArticleResult = { ok: true; title: string } | { ok: false; error: string };

/**
 * 가게에 옥천신문 기사를 붙인다 (관리자, ADR-020).
 * 붙여 넣은 주소에서 기사 번호를 읽고, 제목·사진·올라온 시각은 옥천신문 기사 화면에서 가져와 저장한다.
 * 관리자인지는 여기서 한 번 보고, DB 함수(admin_link_store_article)가 다시 확인한다
 */
export async function linkStoreArticle(storeId: string, input: string): Promise<LinkArticleResult> {
  if (!/^[0-9a-f-]{36}$/i.test(String(storeId ?? ""))) return { ok: false, error: "NOT_FOUND" };
  const id = articleIdFrom(String(input ?? ""));
  if (!id) return { ok: false, error: "BAD_ARTICLE_URL" };

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("okc_is_admin");
  if (!isAdmin) return { ok: false, error: "NOT_ADMIN" };

  const article = await getArticle(id);
  if (!article) return { ok: false, error: "NO_SUCH_ARTICLE" };

  const { error } = await supabase.rpc("admin_link_store_article", {
    p_store_id: storeId,
    p_article_id: id,
    p_title: article.title,
    p_image_url: article.image,
    p_published_at: article.publishedAt,
  });
  return error ? { ok: false, error: error.message } : { ok: true, title: article.title };
}
