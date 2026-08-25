import type { Job } from "bullmq";
import nodemailer from "nodemailer";
import { z } from "zod";

import type { NotificationJobInput } from "../queues/notifications";

const schema=z.object({tenantId:z.uuid(),userId:z.uuid().optional(),recipientEmail:z.email().optional(),type:z.string().trim().min(1).max(100),title:z.string().trim().min(1).max(200),message:z.string().trim().min(1).max(3000),entityType:z.string().trim().max(100).optional(),entityId:z.string().trim().max(200).optional(),channel:z.enum(["internal","email"])}).strict();
export interface NotificationProcessorConfig{supabaseUrl?:string;serviceRoleKey?:string;smtp?:{host:string;port:number;user?:string;password?:string;from:string}}

export function createNotificationProcessor(config:NotificationProcessorConfig){
  const transporter=config.smtp?nodemailer.createTransport({host:config.smtp.host,port:config.smtp.port,secure:config.smtp.port===465,auth:config.smtp.user&&config.smtp.password?{user:config.smtp.user,pass:config.smtp.password}:undefined}):null;
  return async function processNotification(job:Pick<Job<NotificationJobInput>,"data">){
    const input=schema.parse(job.data);if(!config.supabaseUrl||!config.serviceRoleKey)throw new Error("Supabase do worker não configurado.");
    if(input.channel==="email"){if(!transporter||!config.smtp)throw new Error("SMTP do worker não configurado.");if(!input.recipientEmail)throw new Error("Destinatário do e-mail não informado.");await transporter.sendMail({from:config.smtp.from,to:input.recipientEmail,subject:input.title,text:input.message});}
    const url=`${config.supabaseUrl.replace(/\/$/,"")}/rest/v1/notifications`;const response=await fetch(url,{method:"POST",headers:{apikey:config.serviceRoleKey,Authorization:`Bearer ${config.serviceRoleKey}`,"Content-Type":"application/json",Prefer:"return=representation"},body:JSON.stringify({tenant_id:input.tenantId,user_id:input.userId??null,type:input.type,title:input.title,message:input.message,entity_type:input.entityType??null,entity_id:input.entityId??null,channel:input.channel,sent_at:new Date().toISOString()})});if(!response.ok)throw new Error(`Falha ao persistir notificação (${response.status}).`);const data:unknown=await response.json();return{created:true,channel:input.channel,records:Array.isArray(data)?data.length:0};
  };
}
