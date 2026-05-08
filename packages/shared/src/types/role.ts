export const USER_ROLES = ['user', 'business', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];
