// RPC 응답 타입 (supabase/migrations/20261103000100_functions.sql 과 맞춘다)

export type NoticeKind = "open" | "closed_today" | "late_open" | "sold_out" | "early_close";
export type SignKind = NoticeKind | "checking" | "none";
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

export type StoreDetail = {
  store: StoreSign;
  reports: StoreReport[];
};

export type FeedItem = {
  notice_id: string;
  store_id: string;
  store_name: string;
  kind: NoticeKind;
  at_time: string | null;
  memo: string | null;
  source: "owner" | "okcheon";
  created_at: string;
  is_current: boolean;
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

/** no_store = 아직 가게 코드를 넣지 않은 기기 (ADR-006) */
export type OwnerHome =
  | { state: "no_store"; is_admin: boolean }
  | {
      state: "owner";
      is_admin: boolean;
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

export type StoreCodeItem = {
  store_id: string;
  store_name: string;
  code: string | null;
  code_created_at: string | null;
  member_count: number;
};

export type RedeemResult =
  | { ok: true; store_id: string; store_name: string }
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
