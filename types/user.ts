export type UserRole = 'super-admin' | 'admin' | 'user';

export type UserPlan = 'free' | 'voca_unlimited' | 'voca_speaking';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  plan?: UserPlan;
  createdAt?: Date;
}
