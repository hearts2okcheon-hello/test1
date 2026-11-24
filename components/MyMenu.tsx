import Link from "next/link";
import { GEAR_ICON, MENU_ROW, MENU_TITLE, MenuChevron, MenuIcon } from "./MenuParts";
import { StoreGate } from "./StoreGate";

const ICONS = {
  person: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4.5 20a7.5 7.5 0 0 1 15 0"],
  pen: ["M4 20h4L19 9l-4-4L4 16z", "M13.5 6.5l4 4"],
  calendar: ["M5 6h14v14H5z", "M5 10h14", "M9 3.5v4", "M15 3.5v4"],
  gear: GEAR_ICON,
  bell: ["M6 10.5a6 6 0 0 1 12 0v3.7l1.6 2.6H4.4L6 14.2z", "M10 19.5a2 2 0 0 0 4 0"],
  star: ["M12 3.2l2.7 5.5 6 .9-4.35 4.25 1 6L12 17l-5.35 2.85 1-6L3.3 9.6l6-.9z"],
} as const;

function MenuRow({ href, icon, title }: { href: string; icon: keyof typeof ICONS; title: string }) {
  return (
    <Link href={href} className={MENU_ROW}>
      <MenuIcon paths={ICONS[icon]} />
      <span className={MENU_TITLE}>{title}</span>
      <MenuChevron />
    </Link>
  );
}

/**
 * 내 공간의 메뉴 목록. 아이콘과 이름만 보여 주고, 누르면 그 화면에서 고친다.
 * 가게가 있는 사장님에게만 가게 메뉴 세 줄이 보인다.
 * 가입할 때 가게를 등록하지 않겠다고 답한 사람(showStore = false)에게는 가게 줄(가게 등록하기)도 보이지 않는다 (ADR-019)
 */
export function MyMenu({ registered, storeName, storeAck, showStore }: { registered: boolean; storeName: string | null; storeAck: boolean; showStore: boolean }) {
  return (
    <nav aria-label="내 공간 메뉴" className="flex flex-col gap-1">
      <MenuRow href="/owner/profile" icon="person" title={registered ? "내 정보" : "내 정보 등록하기"} />
      {showStore && <StoreGate storeName={storeName} acked={storeAck} canRegister={registered} />}
      {storeName && (
        <>
          <MenuRow href="/owner/news" icon="pen" title="소식·공지 올리기" />
          <MenuRow href="/owner/calendar" icon="calendar" title="가게 캘린더" />
          <MenuRow href="/owner/edit" icon="gear" title="가게 정보 고치기" />
        </>
      )}
      <MenuRow href="/owner/favorites" icon="star" title="즐겨찾는 가게" />
      <MenuRow href="/alerts" icon="bell" title="알림" />
    </nav>
  );
}
