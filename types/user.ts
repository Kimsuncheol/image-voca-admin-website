export type UserRole = 'super-admin' | 'admin' | 'user';

export type UserPlan = 'free' | 'voca_unlimited';

export interface AdminAIPermissions {
  imageGeneration: boolean;
  exampleTranslationGeneration: boolean;
}

export interface AdminPermissions extends AdminAIPermissions {
  planModification: boolean;
  roleModification: boolean;
}

export interface AdminNotificationChangeEntry {
  before: boolean;
  after: boolean;
}

export type AdminNotificationChange = Partial<
  Record<keyof AdminAIPermissions, AdminNotificationChangeEntry>
>;

export interface AppNotification {
  id: string;
  type: 'admin_ai_permissions_changed';
  createdAt?: Date;
  readAt?: Date | null;
  actorUid: string;
  actorEmail: string;
  actorDisplayName: string;
  targetUid: string;
  changes: AdminNotificationChange;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  plan?: UserPlan;
  createdAt?: Date;
  adminPermissions?: AdminPermissions;
}
