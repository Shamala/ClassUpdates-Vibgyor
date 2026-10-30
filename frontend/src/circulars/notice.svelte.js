/**
 * Which circular the notice pop-up is showing, if any. The cards on the
 * Circulars tab open it; the pop-up itself closes it.
 */
export const notice = $state({ id: null });

export function openNotice(id) {
  notice.id = id;
}

export function closeNotice() {
  notice.id = null;
}
