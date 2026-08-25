export const FOUNDATION_QUEUE = "foundation-validation";

export interface ValidationJobInput {
  tenantId: string;
  requestedBy: string;
  message: string;
}
