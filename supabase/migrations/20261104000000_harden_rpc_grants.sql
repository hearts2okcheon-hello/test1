-- Supabase 보안 점검(advisor) 반영
-- 1) 로그인하지 않은 방문자(anon)는 읽기 RPC 와 log_event 만 부를 수 있게 한다.
--    쓰기·관리자 RPC 는 함수 안에서도 권한을 확인하지만, 굳이 열어 둘 이유가 없다.
--    CREATE FUNCTION 은 PUBLIC 에 EXECUTE 를 주므로 PUBLIC 에서 회수한 뒤 필요한 역할에만 준다.
--    이웃 제보의 익명 로그인 사용자는 authenticated 역할이라 영향 없다 (ADR-003).
-- 2) search_path 가 고정되지 않은 도우미 함수 6개를 고정한다.

do $$
declare
  f text;
  write_fns text[] := array[
    'post_notice(uuid, notice_kind, time, text)',
    'set_notice_memo(uuid, text)',
    'undo_notice(uuid)',
    'end_notice(uuid)',
    'post_report(uuid, report_kind)',
    'agree_report(uuid, boolean)',
    'answer_report(uuid, boolean)',
    'request_claim(uuid, text)',
    'review_claim(uuid, boolean)',
    'admin_upsert_store(text, text, text, jsonb, boolean, uuid)',
    'admin_get_queue()',
    'admin_list_claims()',
    'admin_metrics(timestamptz, timestamptz)'
  ];
begin
  foreach f in array write_fns loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated, service_role', f);
  end loop;
end;
$$;

alter function okc_today_start() set search_path = public;
alter function okc_next_midnight() set search_path = public;
alter function okc_notice_valid(timestamptz, timestamptz) set search_path = public;
alter function okc_is_anonymous() set search_path = public;
alter function okc_report_to_notice(report_kind) set search_path = public;
alter function okc_report_to_notice_no(report_kind) set search_path = public;
