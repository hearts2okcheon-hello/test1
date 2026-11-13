-- 원탭 공지에 "외출 중" 추가. enum 값은 쓰기 전에 먼저 커밋돼야 해서 파일을 따로 둔다
alter type notice_kind add value if not exists 'out';
