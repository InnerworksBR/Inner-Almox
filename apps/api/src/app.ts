import Fastify, { type FastifyInstance } from "fastify";
import { loadEnv, type ApiEnv } from "./config/env";
import { configurarValidacao } from "./config/validation";
import { healthRoutes } from "./modules/health/routes";
import { contextRoutes } from "./modules/context/routes";
import { queueRoutes } from "./modules/queues/routes";
import { organizationRoutes } from "./modules/organization/routes";
import { userRoutes } from "./modules/users/routes";
import { businessRoutes } from "./modules/business/routes";
import { operationRoutes } from "./modules/operations/routes";
import { reportRoutes } from "./modules/reports/routes";
import { dashboardRoutes } from "./modules/dashboard/routes";
import { assetQrRoutes } from "./modules/assets/qr-routes";
import { storageRoutes } from "./modules/storage/routes";
import { tenantRoutes } from "./modules/tenant/routes";
import { platformRoutes } from "./modules/platform/routes";
import { documentRoutes } from "./modules/documents/routes";
import errorHandlerPlugin from "./plugins/error-handler";
import securityPlugin from "./plugins/security";
import { RedisQueuePublisher } from "./services/redis-queue-publisher";
import {
  SupabaseContextResolver,
  UnconfiguredContextResolver
} from "./services/supabase-context-resolver";
import type { ContextResolver, QueuePublisher } from "./types/context";
import { SupabaseTenantResourceService, UnconfiguredTenantResourceService, type TenantResourceService } from "./services/tenant-resource-service";
import { SupabaseUserAdminService, UnconfiguredUserAdminService, type UserAdminService } from "./services/user-admin-service";
import { SupabaseCriticalOperationsService, UnconfiguredCriticalOperationsService, type CriticalOperationsService } from "./services/critical-operations-service";
import { SupabaseReportService,UnconfiguredReportService,type ReportService } from "./services/report-service";
import { SupabaseDashboardService,UnconfiguredDashboardService,type DashboardService } from "./services/dashboard-service";
import { SupabaseAssetQrService,UnconfiguredAssetQrService,type AssetQrService } from "./services/asset-qr-service";
import { SupabaseStorageService,UnconfiguredStorageService,type StorageService } from "./services/storage-service";
import { SupabaseTenantConfigurationService, UnconfiguredTenantConfigurationService, type TenantConfigurationService } from "./services/tenant-configuration-service";
import { SupabasePlatformAdminService, UnconfiguredPlatformAdminService, type PlatformAdminService } from "./services/platform-admin-service";
import { SupabaseDocumentService, UnconfiguredDocumentService, type DocumentService } from "./services/document-service";

export interface BuildAppOptions {
  env?: ApiEnv;
  logger?: boolean;
  contextResolver?: ContextResolver;
  queuePublisher?: QueuePublisher;
  resourceService?: TenantResourceService;
  userAdminService?: UserAdminService;
  operationsService?: CriticalOperationsService;
  reportService?:ReportService;
  dashboardService?:DashboardService;
  assetQrService?:AssetQrService;
  storageService?:StorageService;
  configurationService?:TenantConfigurationService;
  platformService?:PlatformAdminService;
  documentService?:DocumentService;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  configurarValidacao();
  const env = options.env ?? loadEnv();
  const app = Fastify({ logger: options.logger ?? env.NODE_ENV !== "test", trustProxy: env.TRUST_PROXY });
  const contextResolver = options.contextResolver ?? (
    env.SUPABASE_URL && env.SUPABASE_ANON_KEY
      ? new SupabaseContextResolver(env.SUPABASE_URL, env.SUPABASE_ANON_KEY)
      : new UnconfiguredContextResolver()
  );
  const queuePublisher = options.queuePublisher ?? new RedisQueuePublisher(env.REDIS_URL);
  const resourceService = options.resourceService ?? (
    env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? new SupabaseTenantResourceService(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
      : new UnconfiguredTenantResourceService()
  );
  const userAdminService = options.userAdminService ?? (
    env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? new SupabaseUserAdminService(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, `${env.WEB_ORIGINS.split(",")[0] ?? "http://localhost:3000"}/auth/callback?next=/accept-invite`)
      : new UnconfiguredUserAdminService()
  );
  const operationsService=options.operationsService??(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY?new SupabaseCriticalOperationsService(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY):new UnconfiguredCriticalOperationsService());
  const reportService=options.reportService??(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY?new SupabaseReportService(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY):new UnconfiguredReportService());
  const dashboardService=options.dashboardService??(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY?new SupabaseDashboardService(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY):new UnconfiguredDashboardService());
  const assetQrService=options.assetQrService??(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY?new SupabaseAssetQrService(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,env.QR_CODE_BASE_URL??env.WEB_ORIGINS.split(",")[0]??"http://localhost:3000"):new UnconfiguredAssetQrService());
  const storageService=options.storageService??(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY?new SupabaseStorageService(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY):new UnconfiguredStorageService());
  const configurationService=options.configurationService??(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY?new SupabaseTenantConfigurationService(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY):new UnconfiguredTenantConfigurationService());
  const platformService=options.platformService??(env.SUPABASE_URL&&env.SUPABASE_ANON_KEY&&env.SUPABASE_SERVICE_ROLE_KEY?new SupabasePlatformAdminService(env.SUPABASE_URL,env.SUPABASE_ANON_KEY,env.SUPABASE_SERVICE_ROLE_KEY,env.PLATFORM_ADMIN_EMAILS.split(",")):new UnconfiguredPlatformAdminService());
  const documentService=options.documentService??(env.SUPABASE_URL&&env.SUPABASE_SERVICE_ROLE_KEY?new SupabaseDocumentService(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,env.DOCUMENT_PUBLIC_URL??env.WEB_ORIGINS.split(",")[0]??"http://localhost:3000",env.QR_CODE_BASE_URL??env.WEB_ORIGINS.split(",")[0]??"http://localhost:3000"):new UnconfiguredDocumentService());

  app.decorateRequest("tenantContext", null);
  await app.register(securityPlugin, { env });
  await app.register(errorHandlerPlugin);
  await app.register(healthRoutes);
  await app.register(contextRoutes, { contextResolver });
  await app.register(queueRoutes, {
    contextResolver,
    queuePublisher,
    enabled: env.QUEUE_VALIDATION_ENABLED
  });
  await app.register(organizationRoutes, { contextResolver, resourceService });
  await app.register(userRoutes, { contextResolver, userAdminService });
  await app.register(businessRoutes, { contextResolver, resourceService });
  await app.register(operationRoutes,{contextResolver,operationsService});
  await app.register(reportRoutes,{contextResolver,reportService});
  await app.register(dashboardRoutes,{contextResolver,dashboardService});
  await app.register(assetQrRoutes,{contextResolver,assetQrService});
  await app.register(storageRoutes,{contextResolver,storageService});
  await app.register(tenantRoutes,{contextResolver,configurationService});
  await app.register(platformRoutes,{platformService});
  await app.register(documentRoutes,{contextResolver,documentService});
  app.addHook("onClose", async () => queuePublisher.close());
  return app;
}
