import { z } from 'zod';

/**
 * Máy chủ sẽ POST tới `endpoint` này, nên nó là đầu vào SSRF: chỉ nhận HTTPS tới
 * dịch vụ push của các trình duyệt lớn (Chrome/Edge/Firefox/Safari).
 */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /\.notify\.windows\.com$/,
];

export function isPushEndpoint(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && !u.port && PUSH_HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

const endpointSchema = z.string().max(1000).refine(isPushEndpoint, 'Dịch vụ push không hỗ trợ');

export const pushSubscribeSchema = z.object({
  endpoint: endpointSchema,
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});
export type PushSubscribeInput = z.infer<typeof pushSubscribeSchema>;

export const pushUnsubscribeSchema = z.object({ endpoint: endpointSchema });
