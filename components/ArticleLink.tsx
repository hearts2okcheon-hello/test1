import type { AnchorHTMLAttributes } from "react";
import { articleUrl } from "@/lib/storeArticles";

/**
 * 옥천신문 원문으로 가는 링크는 모두 여기를 거친다 (ADR-023).
 * 기사 번호(articleId)만 받고, 주소는 lib/storeArticles 의 articleUrl 한 곳에서 만든다.
 *
 * 새 창으로 연다. 홈 화면에 설치한 앱에서는 앱 안 브라우저가 뜨고, 닫으면 보던 화면(스크롤 위치와 고른 줄)으로 그대로 돌아온다.
 * 옥천신문 화면을 이 앱 안에 끼워 넣지(iframe) 않는 까닭: 그렇게 하면 구독자의 옥천신문 로그인이 풀려 유료 기사를 볼 수 없다.
 *
 * 누른 횟수를 세는 일(트래킹)은 지금 범위 밖이다. 옥천신문과 정해지면 여기 한 곳(onClick)에 붙인다
 */
export function ArticleLink({
  articleId,
  hash,
  children,
  ...rest
}: { articleId: string; /** 기사 안의 자리 (예: 댓글은 "comment") */ hash?: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "target" | "rel">) {
  return (
    <a {...rest} href={`${articleUrl(articleId)}${hash ? `#${hash}` : ""}`} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
