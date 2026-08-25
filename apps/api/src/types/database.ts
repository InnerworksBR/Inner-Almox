export interface TenantContextRow {
  tenant_id: string;
  tenant_slug: string;
  legal_name: string;
  product_name: string;
  logo_path: string | null;
  favicon_path: string | null;
  primary_color: string | null;
  secondary_color: string | null;
}

export interface Database {
  public: {
    Tables: {
      tenant_memberships: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          status: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      membership_roles: {
        Row: { membership_id: string; role: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      resolve_tenant_context: {
        Args: { requested_hostname: string };
        Returns: TenantContextRow[];
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
