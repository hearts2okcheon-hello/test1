export const CONFIRM_DELETE = "ok:confirm-delete";

export type ConfirmDeleteRequest = {
  detail?: string;
  /** 보호된 항목: 비밀번호를 넣어야 "예"를 누를 수 있다 */
  password?: boolean;
  resolve: (result: { password: string } | null) => void;
};

/** "삭제하시겠습니까?" 창을 띄운다. 모든 삭제는 이것을 거친다. 아니오면 null */
export function askDelete(options: { detail?: string; password?: boolean } = {}): Promise<{ password: string } | null> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<ConfirmDeleteRequest>(CONFIRM_DELETE, { detail: { ...options, resolve } }));
  });
}
