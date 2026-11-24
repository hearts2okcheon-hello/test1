// 소통광장 맨 위의 광고 배너 (ADR-023). 옆으로 넘겨 본다.
// 지금은 옥!소리 안내 배너를 넣어 두었다. 옥천신문 광고가 정해지면 이 목록만 바꾸면 된다:
//   image 를 넣으면 그림 배너가 되고(public/banners/ 아래에 두고 "/banners/파일이름"), title 은 그림 설명으로 쓰인다

export type Banner = {
  id: string;
  title: string;
  body: string;
  /** 누르면 가는 곳. 앱 안이면 "/…", 바깥이면 "https://…" (바깥은 새 창으로 연다) */
  href: string;
  /** 바탕색 (그림이 없을 때) */
  tone: "sage" | "yellow" | "cream";
  /** 오른쪽에 서는 오소리 표정 (그림이 없을 때) */
  mood: "talk" | "proud" | "find";
  /** 그림 배너의 주소. 있으면 글 대신 그림을 꽉 채워 보여 준다 */
  image?: string;
};

export const BANNERS: Banner[] = [
  { id: "okinews", title: "옥천의 오늘을 더 깊이", body: "옥천신문에서 더 많은 기사를 볼 수 있어요", href: "https://www.okinews.com", tone: "cream", mood: "talk" },
  { id: "owner", title: "우리 가게 소식, 이웃에게 알려요", body: "사장님은 내 공간에서 가게를 등록해 주세요", href: "/owner", tone: "sage", mood: "proud" },
  { id: "favorite", title: "자주 가는 가게는 ☆ 즐겨찾기", body: "문 열었는지, 새 소식이 있는지 바로 볼 수 있어요", href: "/", tone: "yellow", mood: "find" },
];
