import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import { AppError } from "../../errors/app-error";
import { requireTenantContext } from "../../middleware/require-tenant-context";
import { requireTenantRole } from "../../middleware/require-role";
import type { CriticalOperationsService } from "../../services/critical-operations-service";
import type { ContextResolver, TenantContext } from "../../types/context";

interface OperationRouteOptions {
  contextResolver: ContextResolver;
  operationsService: CriticalOperationsService;
}

const uuid = z.uuid();
const optionalUuid = uuid.nullable().optional();
const idParams = z.object({ id: uuid });
const assetMovement = z.object({
  target_asset_id: uuid,
  movement_type: z.enum(["delivery", "return", "loan", "department_transfer", "branch_transfer", "reservation", "maintenance_out", "maintenance_return", "disposal", "sale", "donation", "loss"]),
  movement_reason: z.string().trim().max(3000).optional(),
  destination_data: z.record(z.string(), z.unknown()).optional(),
  new_responsible_id: optionalUuid,
  new_condition_value: z.enum(["new", "good", "fair", "poor", "damaged"]).optional(),
});
const stockMovement = z.object({
  target_product_id: uuid,
  target_stock_location_id: uuid,
  movement_type: z.enum(["purchase_in", "return_in", "positive_adjustment", "consumption_out", "requisition_out", "loss_out", "negative_adjustment", "transfer_in", "transfer_out", "reservation", "inventory"]),
  movement_quantity: z.number().positive(),
  target_batch_id: optionalUuid,
  movement_unit_cost: z.number().min(0).optional(),
  movement_document: z.string().trim().max(160).optional(),
  movement_reason: z.string().trim().max(3000).optional(),
  target_department_id: optionalUuid,
  target_cost_center_id: optionalUuid,
});
const checkout = z.object({
  target_vehicle_id: uuid,
  target_driver_id: uuid,
  initial_mileage_value: z.number().min(0),
  destination_value: z.string().trim().min(2).max(500),
  purpose_value: z.string().trim().min(2).max(1000),
  target_cost_center_id: optionalUuid,
  fuel_level_value: z.number().int().min(0).max(100).optional(),
  target_reservation_id: optionalUuid,
});
const vehicleReturn = z.object({
  final_mileage_value: z.number().min(0),
  fuel_level_value: z.number().int().min(0).max(100).optional(),
  damages_value: z.string().trim().max(3000).optional(),
  notes_value: z.string().trim().max(3000).optional(),
});

function parse(schema: z.ZodType, body: unknown): Record<string, unknown> {
  const result = schema.safeParse(body);
  if (!result.success) throw new AppError("Dados da operação são inválidos.", 422, "VALIDATION_ERROR");
  return result.data as Record<string, unknown>;
}

function contextOf(requestContext: TenantContext | null): TenantContext {
  if (!requestContext) throw new AppError("Contexto ausente.", 401, "TENANT_CONTEXT_REQUIRED");
  return requestContext;
}

function identifierOf(params: unknown): string {
  const result = idParams.safeParse(params);
  if (!result.success) throw new AppError("Identificador inválido.", 422, "INVALID_IDENTIFIER");
  return result.data.id;
}

export const operationRoutes: FastifyPluginAsync<OperationRouteOptions> = async (app, { contextResolver, operationsService }) => {
  const auth = requireTenantContext(contextResolver);

  app.get("/v1/public/documents/:code", async (request) => {
    const params = z.object({ code: z.string().trim().min(8).max(80) }).safeParse(request.params);
    if (!params.success) throw new AppError("Código de validação inválido.", 422, "INVALID_VALIDATION_CODE");
    return { data: await operationsService.validateTerm(params.data.code) };
  });

  app.post("/v1/asset-movements", { preHandler: [auth, requireTenantRole(["tenant_admin", "asset_manager"])] }, async (request, reply) => {
    const context = contextOf(request.tenantContext);
    const data = await operationsService.execute("record_asset_movement", context.tenantId, context.userId, parse(assetMovement, request.body));
    return reply.status(201).send({ data });
  });

  app.post("/v1/asset-movements/:id/terms", { preHandler: [auth, requireTenantRole(["tenant_admin", "asset_manager"])] }, async (request, reply) => {
    const context = contextOf(request.tenantContext);
    const payload = parse(z.object({ term_type: z.enum(["delivery", "loan", "return", "transfer", "damage", "vehicle_checkout", "vehicle_return"]) }), request.body);
    const data = await operationsService.execute("issue_asset_term", context.tenantId, context.userId, { target_movement_id: identifierOf(request.params), ...payload });
    return reply.status(201).send({ data });
  });

  app.post("/v1/asset-terms/:id/accept", { preHandler: auth }, async (request) => {
    const context = contextOf(request.tenantContext);
    return { data: await operationsService.execute("accept_asset_term", context.tenantId, context.userId, { target_term_id: identifierOf(request.params) }) };
  });

  app.post("/v1/stock/movements", { preHandler: [auth, requireTenantRole(["tenant_admin", "warehouse_manager"])] }, async (request, reply) => {
    const context = contextOf(request.tenantContext);
    const data = await operationsService.execute("record_stock_movement", context.tenantId, context.userId, parse(stockMovement, request.body));
    return reply.status(201).send({ data });
  });

  app.post("/v1/stock/transfers", { preHandler: [auth, requireTenantRole(["tenant_admin", "warehouse_manager"])] }, async (request, reply) => {
    const context=contextOf(request.tenantContext);
    const payload=parse(z.object({target_product_id:uuid,source_stock_location_id:uuid,destination_stock_location_id:uuid,movement_quantity:z.number().positive(),source_batch_id:optionalUuid,destination_batch_id:optionalUuid,movement_reason:z.string().trim().max(3000).optional()}),request.body);
    const data=await operationsService.execute("transfer_stock",context.tenantId,context.userId,payload);
    return reply.status(201).send({data});
  });

  app.post("/v1/stock/requisitions/:id/status", { preHandler: auth }, async (request) => {
    const context = contextOf(request.tenantContext);
    const payload = parse(z.object({ target_status: z.enum(["requested", "awaiting_approval", "approved", "rejected", "separating", "ready", "delivered", "partially_fulfilled", "cancelled"]) }), request.body);
    const targetStatus = payload.target_status;
    const canManage = context.roles.some((role) => ["tenant_admin", "warehouse_manager", "department_manager"].includes(role));
    if (!canManage && targetStatus !== "requested" && targetStatus !== "cancelled") throw new AppError("Aprovação restrita aos gestores.", 403, "ROLE_REQUIRED");
    return { data: await operationsService.execute("transition_stock_requisition", context.tenantId, context.userId, { target_requisition_id: identifierOf(request.params), ...payload }) };
  });

  app.post("/v1/stock/requisitions/with-items", { preHandler: [auth, requireTenantRole(["tenant_admin", "warehouse_manager", "department_manager", "employee"])] }, async (request, reply) => {
    const context=contextOf(request.tenantContext);
    const payload=parse(z.object({requisition_number:z.string().trim().min(1).max(80),purpose_value:z.string().trim().min(2).max(2000),target_department_id:optionalUuid,target_cost_center_id:optionalUuid,items_value:z.array(z.object({product_id:uuid,quantity:z.number().positive(),notes:z.string().trim().max(1000).optional()})).min(1).max(100)}),request.body);
    const data=await operationsService.execute("create_stock_requisition",context.tenantId,context.userId,payload);
    return reply.status(201).send({data});
  });

  app.post("/v1/stock/requisitions/:id/fulfill", { preHandler: [auth, requireTenantRole(["tenant_admin", "warehouse_manager"])] }, async (request) => {
    const context=contextOf(request.tenantContext);
    const payload=parse(z.object({target_stock_location_id:uuid,deliveries_value:z.array(z.object({product_id:uuid,quantity:z.number().positive(),batch_id:uuid.optional()})).min(1).max(100)}),request.body);
    return{data:await operationsService.execute("fulfill_stock_requisition",context.tenantId,context.userId,{target_requisition_id:identifierOf(request.params),...payload})};
  });

  app.post("/v1/fleet/usages/checkout", { preHandler: [auth, requireTenantRole(["tenant_admin", "fleet_manager", "employee"])] }, async (request, reply) => {
    const context = contextOf(request.tenantContext);
    const data = await operationsService.execute("checkout_vehicle", context.tenantId, context.userId, parse(checkout, request.body));
    return reply.status(201).send({ data });
  });

  app.post("/v1/fleet/usages/:id/return", { preHandler: [auth, requireTenantRole(["tenant_admin", "fleet_manager", "employee"])] }, async (request) => {
    const context = contextOf(request.tenantContext);
    return { data: await operationsService.execute("return_vehicle", context.tenantId, context.userId, { target_usage_id: identifierOf(request.params), ...parse(vehicleReturn, request.body) }) };
  });

  app.post("/v1/fleet/usages/:id/checklists", { preHandler: [auth, requireTenantRole(["tenant_admin", "fleet_manager", "employee"])] }, async (request, reply) => {
    const context = contextOf(request.tenantContext);
    const payload = parse(z.object({ phase_value: z.enum(["checkout", "return"]), answers_value: z.record(z.string(), z.union([z.boolean(), z.string(), z.number()])), notes_value: z.string().trim().max(3000).optional() }), request.body);
    const data = await operationsService.execute("record_vehicle_checklist", context.tenantId, context.userId, { target_usage_id: identifierOf(request.params), ...payload });
    return reply.status(201).send({ data });
  });

  app.post("/v1/inventories/:id/start", { preHandler: [auth, requireTenantRole(["tenant_admin", "asset_manager", "warehouse_manager"])] }, async (request) => {
    const context = contextOf(request.tenantContext);
    return { data: await operationsService.execute("start_inventory_campaign", context.tenantId, context.userId, { target_campaign_id: identifierOf(request.params) }) };
  });

  app.post("/v1/inventories/:id/scans/assets", { preHandler: [auth, requireTenantRole(["tenant_admin", "asset_manager"])] }, async (request, reply) => {
    const context = contextOf(request.tenantContext);
    const payload = parse(z.object({ asset_qr_token: uuid, target_location_id: optionalUuid, condition_value: z.enum(["new", "good", "fair", "poor", "damaged"]).optional(), notes_value: z.string().trim().max(3000).optional() }), request.body);
    const data = await operationsService.execute("scan_inventory_asset", context.tenantId, context.userId, { target_campaign_id: identifierOf(request.params), ...payload });
    return reply.status(201).send({ data });
  });

  app.post("/v1/inventories/:id/scans/stock", { preHandler: [auth, requireTenantRole(["tenant_admin", "warehouse_manager"])] }, async (request, reply) => {
    const context = contextOf(request.tenantContext);
    const payload = parse(z.object({ target_product_id: uuid, counted_quantity: z.number().nonnegative() }), request.body);
    const data = await operationsService.execute("scan_inventory_stock", context.tenantId, context.userId, { target_campaign_id: identifierOf(request.params), ...payload });
    return reply.status(201).send({ data });
  });

  app.post("/v1/inventories/:id/complete", { preHandler: [auth, requireTenantRole(["tenant_admin", "asset_manager", "warehouse_manager"])] }, async (request) => {
    const context = contextOf(request.tenantContext);
    return { data: await operationsService.execute("complete_inventory_campaign", context.tenantId, context.userId, { target_campaign_id: identifierOf(request.params) }) };
  });

  app.post("/v1/notifications/refresh", { preHandler: [auth, requireTenantRole(["tenant_admin"])] }, async (request) => {
    const context = contextOf(request.tenantContext);
    return { data: await operationsService.execute("refresh_tenant_alerts", context.tenantId, context.userId, {}) };
  });
};
