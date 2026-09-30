import { api } from './api';

/** Trình duyệt có Web Push không (Safari iOS chỉ có khi đã "Thêm vào MH chính"). */
export const pushSupported =
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

async function currentSubscription(): Promise<PushSubscription | null> {
  const reg = await navigator.serviceWorker.getRegistration();
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function isPushOn(): Promise<boolean> {
  return pushSupported && Notification.permission === 'granted' && !!(await currentSubscription());
}

/** Xin quyền, đăng ký với trình duyệt rồi gửi đăng ký lên máy chủ (FR-009.6). */
export async function enablePush(publicKey: string): Promise<void> {
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Bạn đã chặn thông báo cho trang này — mở lại trong cài đặt trình duyệt.');
  }
  const reg = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKey,
  });
  await api.post('/notifications/push/subscribe', sub.toJSON());
}

/**
 * Tắt đẩy trên trình duyệt này. Gọi cả lúc đăng xuất — máy dùng chung mà quên
 * gỡ thì người sau vẫn thấy thông báo của người trước. Không cần đăng nhập nên
 * gọi được cả khi phiên đã hết hạn.
 */
export async function disablePush(): Promise<void> {
  if (!pushSupported) return;
  const sub = await currentSubscription();
  if (!sub) return;
  await api.post('/notifications/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}

/**
 * Người khác đăng nhập trên trình duyệt đã bật đẩy (phiên trước hết hạn, không
 * ai bấm đăng xuất): chuyển đăng ký sang người mới, để họ không nhận thông báo
 * của người trước. Quyền thông báo là của trình duyệt, không của tài khoản.
 */
export async function claimPush(): Promise<void> {
  const sub = pushSupported ? await currentSubscription() : null;
  if (sub) await api.post('/notifications/push/subscribe', sub.toJSON());
}
