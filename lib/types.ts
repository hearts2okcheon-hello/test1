// RPC 응답 타입 (supabase/migrations/20261103000100_functions.sql 과 맞춘다)

export type NoticeKind = "open" | "closed_today" | "late_open" | "sold_out" | "early_close" | "out";
export type SignKind = NoticeKind | "temp_closed" | "checking" | "none";
/** 영업 상태. 계산은 DB okc_schedule_status 한 곳에서만 (ADR-007) */
export type ScheduleStatus = "open" | "closed" | "regular_holiday" | "temp_closed" | "unknown";
export type PhotoCategory = "store" | "food" | "daily";
export type Source = "owner" | "okcheon" | "neighbor";
export type ReportKind = "seen_closed" | "seen_open" | "seen_sold_out" | "seen_long_line";
export type ReportStatus = "pending" | "confirmed" | "rejected" | "expired";

/** { mon: [["11:00","21:00"]], sun: null } — null 은 정기 휴무 */
export type RegularHours = Partial<Record<Weekday, [string, string][] | null>>;
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type StoreSign = {
  store_id: string;
  name: string;
  category: string | null;
  address: string | null;
  regular_hours: RegularHours | null;
  sign: SignKind;
  source: Source | null;
  at_time: string | null;
  memo: string | null;
  signed_at: string | null;
  notice_id: string | null;
  report_kind: ReportKind | null;
  agree_count: number;
  neighborhood: string | null;
  schedule_status: ScheduleStatus;
  schedule_basis: "notice" | "hours";
  /** 마을방송 "오늘 우리 동네 가게"에 뜨는가 */
  listed: boolean;
  cover_url: string | null;
  /** 가게 프로필 사진 (이름 앞 동그라미). 없으면 첫 글자 */
  logo_url: string | null;
  /** 목록 카드에 보일 사진: 갤러리 먼저, 그다음 메뉴 사진 (4장까지) */
  card_photos: string[];
};

export type StoreReport = {
  id: string;
  kind: ReportKind;
  status: ReportStatus;
  created_at: string;
  resolved_source: "owner" | "okcheon" | null;
  resolved_at: string | null;
  agree_count: number;
  agreed_by_me: boolean;
  is_mine: boolean;
};

export type StoreMenu = { id: string; name: string; price: number | null; photo_url: string | null };
export type StorePhoto = { id: string; category: PhotoCategory; url: string };
export type StorePost = {
  id: string;
  kind: "news" | "notice";
  body: string;
  image_url: string | null;
  source: "owner" | "okcheon";
  created_at: string;
  updated_at: string | null;
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
  comments: StoreComment[];
};
export type StoreComment = { id: string; body: string; created_at: string; is_mine: boolean };
export type TempClosure = { id: string; start_date: string; end_date: string; reason: string | null };
/** 사장님 캘린더의 날짜별 일정. 그날 휴무는 TempClosure 로 들어간다 */
export type DayPlanKind = "late_open" | "early_close" | "out";
export type DayPlan = { id: string; day: string; kind: DayPlanKind; start_time: string | null; end_time: string | null; note: string | null };
/** 내 정보 (ADR-014) */
export type MyProfile = { name: string | null; area: string | null; phone: string | null; avatar_url: string | null; registered: boolean; store_ack: boolean };

export type StoreDetail = {
  store: StoreSign;
  /** phone: 공개한 번호만. manage_phone: 관리할 수 있는 사람에게만 */
  profile: {
    phone: string | null;
    intro: string | null;
    phone_public: boolean;
    manage_phone: string | null;
    /** 가게 번호(선택). 공개한 것만 */
    store_phone: string | null;
    store_phone_public: boolean;
    manage_store_phone: string | null;
  };
  can_manage: boolean;
  reports: StoreReport[];
  menus: StoreMenu[];
  photos: StorePhoto[];
  posts: StorePost[];
  comment_count: number;
  comments: StoreComment[];
  closures: TempClosure[];
  plans: DayPlan[];
};

export type FeedItem = {
  notice_id: string | null;
  store_id: string;
  store_name: string;
  /** notice: 공지 종류 · post: news/notice · closure: temp_closed */
  kind: string;
  at_time: string | null;
  memo: string | null;
  source: "owner" | "okcheon";
  created_at: string;
  is_current: boolean;
  item_type: "notice" | "post" | "closure";
  item_id: string;
  image_url: string | null;
  closure_start: string | null;
  closure_end: string | null;
};

export type OwnerNotice = {
  id: string;
  kind: NoticeKind;
  at_time: string | null;
  memo: string | null;
  source: "owner" | "okcheon";
  created_at: string;
  created_by_me: boolean;
  from_report: boolean;
};

export type OwnerQuestion = {
  id: string;
  kind: ReportKind;
  created_at: string;
  agree_count: number;
};

/** no_store = 코드를 넣지 않은 기기 · needs_store = 코드는 넣었고 가게 등록 전 (ADR-007) */
export type OwnerHome =
  | { state: "no_store"; is_admin: boolean; signed_in?: boolean }
  | { state: "needs_store"; is_admin: boolean; code: string | null; phone: string | null; profile: MyProfile }
  | {
      state: "owner";
      is_admin: boolean;
      profile: MyProfile;
      code: string | null;
      store: StoreSign;
      notice: OwnerNotice | null;
      questions: OwnerQuestion[];
    };

export type QueueItem = {
  store_id: string;
  store_name: string;
  report_id: string;
  report_kind: ReportKind;
  report_created_at: string;
  agree_count: number;
  reason: "conflict" | "no_answer";
  notice_kind: NoticeKind | null;
};

export type StoreInfoItem = { store_id: string; name: string; phone: string | null; category: string | null; created_at: string };

export type CommunityAdminPost = { id: string; anon_name: string; body: string; created_at: string };

export type AdminContent = {
  posts: { id: string; store_id: string; store_name: string; kind: "news" | "notice"; body: string; image_url: string | null; created_at: string }[];
  comments: { id: string; store_id: string; store_name: string; body: string; created_at: string }[];
};

export type RedeemResult =
  | { ok: true; store_id: string | null; store_name: string | null; needs_store: boolean }
  | { ok: false; error: "INVALID_CODE" | "TOO_MANY_ATTEMPTS" };

export type Metrics = {
  pilot_stores: number;
  verified_pilot_stores: number;
  stores_with_owner_notice: number;
  owner_notice_store_days: number;
  questions_asked: number;
  questions_answered_by_owner: number;
  visitors: number;
  returning_visitors: number;
};
