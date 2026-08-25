import { AppError } from "../errors/app-error";

type Row = Record<string, unknown>;
type PlatformCollection = "tenants" | "tenant_domains" | "platform_plans" | "tenant_modules" | "background_jobs" | "platform_audit_logs";

export interface TenantProvisionInput {
  slug:string; legal_name:string; product_name:string; hostname:string; plan:string;
  user_limit?:number; asset_limit?:number; vehicle_limit?:number; storage_limit_bytes?:number;
  primary_color?:string; secondary_color?:string; modules:string[]; domain_verified?:boolean;
}

export interface PlatformAdminService {
  authorize(accessToken:string):Promise<string>;
  list(collection:PlatformCollection):Promise<Row[]>;
  provision(userId:string,input:TenantProvisionInput):Promise<unknown>;
  updateTenant(userId:string,tenantId:string,input:Row):Promise<Row>;
  addDomain(userId:string,tenantId:string,hostname:string,isPrimary:boolean,verified:boolean):Promise<Row>;
  verifyDomain(userId:string,domainId:string):Promise<Row>;
  savePlan(userId:string,input:Row):Promise<Row>;
  setModules(userId:string,tenantId:string,modules:Array<{module_key:string;enabled:boolean}>):Promise<void>;
}

function objectOf(value:unknown):Row{return typeof value==="object"&&value!==null&&!Array.isArray(value)?value as Row:{}}
function rowsOf(value:unknown):Row[]{if(!Array.isArray(value)||!value.every(item=>typeof item==="object"&&item!==null&&!Array.isArray(item)))throw new AppError("Resposta inválida da plataforma.",500,"INVALID_PLATFORM_RESPONSE");return value as Row[]}

export class SupabasePlatformAdminService implements PlatformAdminService {
  private readonly authUrl:string; private readonly restUrl:string;
  private readonly authHeaders:Record<string,string>; private readonly headers:Record<string,string>;
  private readonly bootstrapEmails:Set<string>;
  constructor(url:string,anonKey:string,serviceRoleKey:string,bootstrapEmails:string[]){const base=url.replace(/\/$/,"");this.authUrl=`${base}/auth/v1`;this.restUrl=`${base}/rest/v1`;this.authHeaders={apikey:anonKey};this.headers={apikey:serviceRoleKey,authorization:`Bearer ${serviceRoleKey}`,"content-type":"application/json"};this.bootstrapEmails=new Set(bootstrapEmails.map(email=>email.trim().toLowerCase()).filter(Boolean));}
  async authorize(accessToken:string){const userResponse=await fetch(`${this.authUrl}/user`,{headers:{...this.authHeaders,authorization:`Bearer ${accessToken}`}});if(!userResponse.ok)throw new AppError("Autenticação da plataforma necessária.",401,"PLATFORM_AUTH_REQUIRED");const user=objectOf(await userResponse.json());const userId=typeof user.id==="string"?user.id:null;const email=typeof user.email==="string"?user.email.toLowerCase():"";if(!userId)throw new AppError("Usuário inválido.",401,"PLATFORM_AUTH_REQUIRED");let admins=await this.query(`platform_admins?user_id=eq.${userId}&status=eq.active&select=user_id`);if(admins.length===0&&this.bootstrapEmails.has(email)){await this.mutate("platform_admins?on_conflict=user_id","POST",{user_id:userId,status:"active"},"resolution=merge-duplicates");admins=await this.query(`platform_admins?user_id=eq.${userId}&status=eq.active&select=user_id`);}if(admins.length===0)throw new AppError("Acesso restrito à administração InnerWorks.",403,"PLATFORM_ADMIN_REQUIRED");return userId;}
  list(collection:PlatformCollection){const order=collection==="platform_audit_logs"||collection==="background_jobs"?"created_at.desc":"created_at.desc";return this.query(`${collection}?select=*&order=${order}&limit=200`);}
  async provision(userId:string,input:TenantProvisionInput){const result=await this.rpc("provision_tenant",{tenant_slug:input.slug,tenant_legal_name:input.legal_name,tenant_product_name:input.product_name,tenant_hostname:input.hostname,tenant_plan:input.plan,limit_users:input.user_limit??null,limit_assets:input.asset_limit??null,limit_vehicles:input.vehicle_limit??null,limit_storage_bytes:input.storage_limit_bytes??null,primary_color_value:input.primary_color??null,secondary_color_value:input.secondary_color??null,enabled_modules:input.modules,domain_verified:input.domain_verified??false});await this.audit(userId,"create.tenant","tenant",String(result),input);return result;}
  async updateTenant(userId:string,tenantId:string,input:Row){const rows=await this.mutate(`tenants?id=eq.${tenantId}`,"PATCH",input,"return=representation");const row=rows[0];if(!row)throw new AppError("Tenant não encontrado.",404,"TENANT_NOT_FOUND");await this.audit(userId,"update.tenant","tenant",tenantId,input);return row;}
  async addDomain(userId:string,tenantId:string,hostname:string,isPrimary:boolean,verified:boolean){if(isPrimary)await this.mutate(`tenant_domains?tenant_id=eq.${tenantId}&is_primary=eq.true`,"PATCH",{is_primary:false});const rows=await this.mutate("tenant_domains","POST",{tenant_id:tenantId,hostname:hostname.toLowerCase(),is_primary:isPrimary,verified_at:verified?new Date().toISOString():null},"return=representation");const row=rows[0];if(!row)throw new AppError("Domínio não criado.",500,"DOMAIN_CREATE_FAILED");await this.audit(userId,"create.domain","tenant_domain",String(row.id),{tenant_id:tenantId,hostname});return row;}
  async verifyDomain(userId:string,domainId:string){const rows=await this.mutate(`tenant_domains?id=eq.${domainId}`,"PATCH",{verified_at:new Date().toISOString()},"return=representation");const row=rows[0];if(!row)throw new AppError("Domínio não encontrado.",404,"DOMAIN_NOT_FOUND");await this.audit(userId,"verify.domain","tenant_domain",domainId,{});return row;}
  async savePlan(userId:string,input:Row){const rows=await this.mutate("platform_plans?on_conflict=code","POST",input,"resolution=merge-duplicates,return=representation");const row=rows[0];if(!row)throw new AppError("Plano não salvo.",500,"PLAN_SAVE_FAILED");await this.audit(userId,"save.plan","platform_plan",String(row.id),input);return row;}
  async setModules(userId:string,tenantId:string,modules:Array<{module_key:string;enabled:boolean}>){for(const module of modules)await this.mutate("tenant_modules?on_conflict=tenant_id,module_key","POST",{tenant_id:tenantId,...module},"resolution=merge-duplicates");await this.audit(userId,"update.modules","tenant",tenantId,{modules});}
  private async query(path:string){const response=await fetch(`${this.restUrl}/${path}`,{headers:this.headers});if(!response.ok)throw new AppError("Consulta administrativa falhou.",500,"PLATFORM_QUERY_FAILED");return rowsOf(await response.json());}
  private async mutate(path:string,method:"POST"|"PATCH",body:Row,prefer?:string){const response=await fetch(`${this.restUrl}/${path}`,{method,headers:{...this.headers,...(prefer?{prefer}:{})},body:JSON.stringify(body)});if(response.status===409)throw new AppError("Já existe um registro com esses dados.",409,"PLATFORM_CONFLICT");if(!response.ok)throw new AppError("Operação administrativa falhou.",422,"PLATFORM_MUTATION_FAILED");if(!prefer?.includes("return=representation"))return[];return rowsOf(await response.json());}
  private async rpc(name:string,body:Row):Promise<unknown>{const response=await fetch(`${this.restUrl}/rpc/${name}`,{method:"POST",headers:this.headers,body:JSON.stringify(body)});if(!response.ok)throw new AppError("Provisionamento do tenant falhou.",422,"TENANT_PROVISION_FAILED");const result:unknown=await response.json();return result;}
  private async audit(userId:string,action:string,entityType:string,entityId:string,metadata:unknown){await this.mutate("platform_audit_logs","POST",{user_id:userId,action,entity_type:entityType,entity_id:entityId,metadata});}
}

export class UnconfiguredPlatformAdminService implements PlatformAdminService {
  private unavailable():never{throw new AppError("Administração da plataforma não configurada.",503,"PLATFORM_UNCONFIGURED")}
  authorize():Promise<string>{return this.unavailable()} list():Promise<Row[]>{return this.unavailable()} provision():Promise<unknown>{return this.unavailable()} updateTenant():Promise<Row>{return this.unavailable()} addDomain():Promise<Row>{return this.unavailable()} verifyDomain():Promise<Row>{return this.unavailable()} savePlan():Promise<Row>{return this.unavailable()} setModules():Promise<void>{return this.unavailable()}
}
