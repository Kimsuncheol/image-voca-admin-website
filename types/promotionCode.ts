import type { Timestamp } from 'firebase/firestore';

export type PlanType = 'voca_unlimited' | 'voca_speaking';
export type PromotionCodeStatus = 'active' | 'inactive' | 'expired';

export interface PromotionBenefit {
  type: string;
  planId: PlanType;
  isPermanent: boolean;
  durationDays?: number;
}

export interface EventPeriod {
  startDate: string;
  endDate: string;
}

export interface PromotionCode {
  id: string;
  code: string;
  codeHash: string;
  eventPeriod: EventPeriod;
  benefit: PromotionBenefit;
  maxUses: number;
  maxUsesPerUser: number;
  currentUses: number;
  createdAt: Timestamp;
  createdBy: string;
  status: PromotionCodeStatus;
  description: string;
}

export interface CodeGenerationRequest {
  eventPeriod: EventPeriod;
  benefit: PromotionBenefit;
  maxUses: number;
  maxUsesPerUser: number;
  description: string;
  count: number;
}

export interface CodeGenerationResponse {
  codes: string[];
  codeIds: string[];
}
