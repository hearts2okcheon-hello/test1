-- 휴대폰 알림 4) 제보한 이웃: 사장님(또는 옥천신문)이 내 제보에 답했어요 (ADR-013 보완)
-- 제보가 '확인 대기'에서 맞다/아니다로 정리되면, 제보한 사람과 "나도 봤어요"를 누른 사람에게 알린다.
-- 즐겨찾기를 안 했어도 받는다. 같은 가게 즐겨찾기 알림과 겹치면 답장 알림 하나로 바꾼다.
create function _okc_push_on_report_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_kind notice_kind;
  v_memo text;
  v_what text;
  v_targets uuid[];
begin
  if old.status <> 'pending' or new.status not in ('confirmed', 'rejected') or new.kind = 'seen_long_line' then
    return null;
  end if;

  select name into v_name from stores where id = new.store_id;
  -- 답하면서 같은 순간(같은 트랜잭션)에 올린, 지금 걸려 있는 공지
  select n.kind, n.memo into v_kind, v_memo from notices n
   where n.store_id = new.store_id and n.created_at = now() and n.ended_at is null
   order by n.created_at desc limit 1;

  v_what := case v_kind
    when 'open' then '오늘 문 열었어요'
    when 'closed_today' then '오늘 쉬어요'
    when 'sold_out' then '재료가 다 떨어졌어요'
    when 'early_close' then '일찍 닫았어요'
    when 'late_open' then '늦게 열어요'
    else case when new.status = 'confirmed' then '제보가 맞대요' else '제보와 다르대요' end
  end;

  select array_agg(distinct w.user_id) into v_targets from (
    select new.reporter_id as user_id
    union
    select a.user_id from report_agrees a where a.report_id = new.id
  ) w where w.user_id is distinct from new.resolved_by;
  if v_targets is null then
    return null;
  end if;

  -- 같은 순간 나간 즐겨찾기 알림과 겹치면 지운다 (답장 알림이 더 자세하다)
  delete from push_outbox o using unnest(v_targets) as t(user_id)
   where o.user_id = t.user_id and o.tag = 'store-' || new.store_id and o.created_at = now()
     and o.sent_at is null and o.title not like '💬%';

  insert into push_outbox (user_id, title, body, url, tag)
  select t.user_id,
         '💬 ' || case when new.resolved_source = 'okcheon' then '옥천신문이 확인했어요' else '사장님이 답했어요' end,
         v_name || ': "' || v_what || '"' || coalesce(' · ' || v_memo, ''),
         '/stores/' || new.store_id, 'store-' || new.store_id
    from unnest(v_targets) as t(user_id)
   -- 한 사람이 같은 가게 제보 여러 건에 걸려 있어도 한 번만
   where not exists (select 1 from push_outbox o
                      where o.user_id = t.user_id and o.tag = 'store-' || new.store_id
                        and o.created_at = now() and o.title like '💬%');
  return null;
end;
$$;
revoke execute on function _okc_push_on_report_reply() from public, anon, authenticated;

create trigger reports_reply_push after update of status on reports
  for each row when (old.status = 'pending' and new.status in ('confirmed', 'rejected'))
  execute function _okc_push_on_report_reply();
