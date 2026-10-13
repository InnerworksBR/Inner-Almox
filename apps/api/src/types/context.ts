export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  membershipId: string;
  roles: string[];
}

export interface ResolveContextInput {
  accessToken: string;
  hostname: string;
}

export interface ContextResolver {
  resolve(input: ResolveContextInput): Promise<TenantContext>;
}

export interface ValidationJobInput {
  tenantId: string;
  requestedBy: string;
  message: string;
}

export interface QueuePublisher {
  publishValidation(input: ValidationJobInput): Promise<string>;
  ping?(): Promise<void>;
  close(): Promise<void>;
}
