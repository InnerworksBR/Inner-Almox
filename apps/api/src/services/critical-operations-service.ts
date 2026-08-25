import { AppError } from "../errors/app-error";
import type { ResourcePayload } from "./tenant-resource-service";

export type CriticalOperation =
  | "record_asset_movement" | "record_stock_movement" | "checkout_vehicle" | "return_vehicle"
  | "issue_asset_term" | "accept_asset_term" | "start_inventory_campaign"
  | "scan_inventory_asset" | "scan_inventory_stock" | "complete_inventory_campaign"
  | "transition_stock_requisition" | "create_stock_requisition" | "fulfill_stock_requisition"
  | "record_vehicle_checklist" | "refresh_tenant_alerts" | "transfer_stock";

export interface CriticalOperationsService {
  execute(operation: CriticalOperation, tenantId: string, actorUserId: string, payload: ResourcePayload): Promise<unknown>;
  validateTerm(code: string): Promise<unknown>;
}

export class SupabaseCriticalOperationsService implements CriticalOperationsService {
  private readonly restUrl: string;
  private readonly headers: Record<string,string>;
  constructor(url:string,serviceRoleKey:string){ this.restUrl=`${url.replace(/\/$/,"")}/rest/v1`; this.headers={apikey:serviceRoleKey,Authorization:`Bearer ${serviceRoleKey}`,"Content-Type":"application/json"}; }

  async execute(operation:CriticalOperation,tenantId:string,actorUserId:string,payload:ResourcePayload):Promise<unknown>{
    const response=await fetch(`${this.restUrl}/rpc/${operation}`,{method:"POST",headers:this.headers,body:JSON.stringify({target_tenant_id:tenantId,actor_user_id:actorUserId,...payload})});
    if(!response.ok){
      if(response.status===404) throw new AppError("Registro relacionado não encontrado.",404,"RELATED_RESOURCE_NOT_FOUND");
      if(response.status===400) throw new AppError("A operação viola uma regra de negócio.",422,"BUSINESS_RULE_VIOLATION");
      if(response.status===403) throw new AppError("Operação não permitida para este usuário.",403,"OPERATION_NOT_ALLOWED");
      throw new AppError("Não foi possível concluir a operação.",500,"CRITICAL_OPERATION_FAILED");
    }
    const result:unknown=await response.json();
    await this.audit(tenantId,actorUserId,operation,result,payload);
    return result;
  }

  async validateTerm(code:string):Promise<unknown>{
    const response=await fetch(`${this.restUrl}/rpc/validate_asset_term`,{method:"POST",headers:this.headers,body:JSON.stringify({validation_code_value:code})});
    if(!response.ok) throw new AppError("Não foi possível validar o documento.",500,"DOCUMENT_VALIDATION_FAILED");
    const result:unknown=await response.json();
    if(result===null) throw new AppError("Termo ou documento não encontrado.",404,"DOCUMENT_NOT_FOUND");
    return result;
  }

  private async audit(tenantId:string,userId:string,operation:string,result:unknown,payload:ResourcePayload):Promise<void>{
    const response=await fetch(`${this.restUrl}/audit_logs`,{method:"POST",headers:this.headers,body:JSON.stringify({tenant_id:tenantId,user_id:userId,action:operation,entity_type:"critical_operation",entity_id:typeof result==="string"?result:null,new_values:payload})});
    if(!response.ok) throw new AppError("A operação foi concluída, mas a auditoria falhou.",500,"AUDIT_WRITE_FAILED");
  }
}

export class UnconfiguredCriticalOperationsService implements CriticalOperationsService {
  execute():Promise<unknown>{ throw new AppError("Operações críticas não configuradas.",503,"CRITICAL_OPERATIONS_UNCONFIGURED"); }
  validateTerm():Promise<unknown>{ throw new AppError("Validação de documentos não configurada.",503,"VALIDATION_UNCONFIGURED"); }
}
