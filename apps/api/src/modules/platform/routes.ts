import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";

import { AppError } from "../../errors/app-error";
import type { PlatformAdminService } from "../../services/platform-admin-service";

interface Options { platformService:PlatformAdminService }
const uuid=z.uuid();
const tenantInput=z.object({slug:z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),legal_name:z.string().trim().min(2).max(200),product_name:z.string().trim().min(2).max(120),hostname:z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),plan:z.string().trim().regex(/^[a-z][a-z0-9_-]*$/).default("starter"),user_limit:z.number().int().positive().optional(),asset_limit:z.number().int().positive().optional(),vehicle_limit:z.number().int().positive().optional(),storage_limit_bytes:z.number().int().positive().optional(),primary_color:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),secondary_color:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),modules:z.array(z.string().regex(/^[a-z][a-z0-9_-]*$/)).min(1),domain_verified:z.boolean().optional()});
const tenantUpdate=z.object({legal_name:z.string().trim().min(2).max(200).optional(),product_name:z.string().trim().min(2).max(120).nullable().optional(),status:z.enum(["active","suspended","inactive"]).optional(),plan:z.string().trim().regex(/^[a-z][a-z0-9_-]*$/).optional(),user_limit:z.number().int().positive().nullable().optional(),asset_limit:z.number().int().positive().nullable().optional(),vehicle_limit:z.number().int().positive().nullable().optional(),storage_limit_bytes:z.number().int().positive().nullable().optional()}).refine(value=>Object.keys(value).length>0);
const planInput=z.object({code:z.string().trim().regex(/^[a-z][a-z0-9_-]*$/),name:z.string().trim().min(2).max(120),description:z.string().trim().max(1000).optional(),user_limit:z.number().int().positive().nullable().optional(),asset_limit:z.number().int().positive().nullable().optional(),vehicle_limit:z.number().int().positive().nullable().optional(),storage_limit_bytes:z.number().int().positive().nullable().optional(),module_keys:z.array(z.string().regex(/^[a-z][a-z0-9_-]*$/)),status:z.enum(["active","inactive"]).optional()});

function tokenOf(request:FastifyRequest){const authorization=request.headers.authorization;if(!authorization?.startsWith("Bearer "))throw new AppError("Autenticação da plataforma necessária.",401,"PLATFORM_AUTH_REQUIRED");return authorization.slice(7).trim()}
function parsed<T>(schema:z.ZodType<T>,value:unknown):T{const result=schema.safeParse(value);if(!result.success)throw new AppError("Dados administrativos inválidos.",422,"VALIDATION_ERROR");return result.data}

export const platformRoutes:FastifyPluginAsync<Options>=async(app,{platformService})=>{
  async function admin(request:FastifyRequest){return platformService.authorize(tokenOf(request))}
  const collections={tenants:"tenants",domains:"tenant_domains",plans:"platform_plans",modules:"tenant_modules",jobs:"background_jobs",logs:"platform_audit_logs"} as const;
  for(const [path,collection] of Object.entries(collections))app.get(`/v1/platform/${path}`,async request=>{await admin(request);return{data:await platformService.list(collection)}});
  app.get("/v1/platform/health",async request=>{await admin(request);return{data:{api:"healthy",database:"healthy",checked_at:new Date().toISOString()}}});
  app.post("/v1/platform/tenants",async(request,reply)=>{const userId=await admin(request);const input=parsed(tenantInput,request.body);const data=await platformService.provision(userId,input);return reply.status(201).send({data})});
  app.patch("/v1/platform/tenants/:id",async request=>{const userId=await admin(request);const id=parsed(z.object({id:uuid}),request.params).id;return{data:await platformService.updateTenant(userId,id,parsed(tenantUpdate,request.body))}});
  app.post("/v1/platform/domains",async(request,reply)=>{const userId=await admin(request);const body=parsed(z.object({tenant_id:uuid,hostname:z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),is_primary:z.boolean().optional(),verified:z.boolean().optional()}),request.body);const data=await platformService.addDomain(userId,body.tenant_id,body.hostname,body.is_primary??false,body.verified??false);return reply.status(201).send({data})});
  app.post("/v1/platform/domains/:id/verify",async request=>{const userId=await admin(request);const id=parsed(z.object({id:uuid}),request.params).id;return{data:await platformService.verifyDomain(userId,id)}});
  app.post("/v1/platform/plans",async(request,reply)=>{const userId=await admin(request);const data=await platformService.savePlan(userId,parsed(planInput,request.body));return reply.status(201).send({data})});
  app.put("/v1/platform/tenants/:id/modules",async request=>{const userId=await admin(request);const id=parsed(z.object({id:uuid}),request.params).id;const body=parsed(z.object({modules:z.array(z.object({module_key:z.string().regex(/^[a-z][a-z0-9_-]*$/),enabled:z.boolean()})).max(50)}),request.body);await platformService.setModules(userId,id,body.modules);return{data:{updated:true}}});
};
