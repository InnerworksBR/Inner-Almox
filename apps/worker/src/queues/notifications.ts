export const NOTIFICATION_QUEUE="inner-almox-notifications";
export interface NotificationJobInput{tenantId:string;userId?:string;recipientEmail?:string;type:string;title:string;message:string;entityType?:string;entityId?:string;channel:"internal"|"email"}
