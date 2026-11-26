import Link from "next/link";
import { Avatar } from "./Avatar";
import { MenuChevron } from "./MenuParts";

/**
 * 내 공간 맨 위의 프로필 카드 (ADR-029). 카드 어디를 눌러도 내 정보 화면으로 간다 (오른쪽 가운데의 › 가 들어갈 수 있음을 알린다).
 * 사진 · 이름 · 닉네임 아래에 "내 정보 관리"를 적는다. 사는 곳과 전화번호는 여기 적지 않고, 내 정보 화면에서 보고 고친다
 */
export function ProfileCard({ avatarUrl, name, nickname, registered }: { avatarUrl: string | null; name: string | null; nickname: string | null; registered: boolean }) {
  return (
    <Link href="/owner/profile" className="flex items-center gap-3.5 rounded-[22px] border-2 border-line bg-card px-4 py-4 hover:bg-cream active:bg-cream">
      <Avatar url={avatarUrl} size={68} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {registered ? (
          <>
            <span className="truncate font-display text-[20px] leading-tight">{name}</span>
            {nickname && <span className="truncate text-[15px] font-bold text-sage-deep">{nickname}</span>}
          </>
        ) : (
          <span className="font-display text-lg leading-snug">내 정보를 등록해 주세요</span>
        )}
        <span className="text-[15px] font-medium text-muted">{registered ? "내 정보 관리" : "내 정보 등록하기"}</span>
      </span>
      <MenuChevron />
    </Link>
  );
}
