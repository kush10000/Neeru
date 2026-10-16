
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "alerts_sent": {
                  Row: {
                    "route_id": string,"sent_at": string,"subject_id": string,"subject_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "route_id": string,"sent_at"?: string,"subject_id": string,"subject_type": string
                  }
                  Update: {
                    "route_id"?: string,"sent_at"?: string,"subject_id"?: string,"subject_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "alerts_sent_route_id_fkey"
      columns: ["route_id"]
isOneToOne: false
      referencedRelation: "routes"
      referencedColumns: ["id"]
    }
                  ]
                },"config": {
                  Row: {
                    "key": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"p256dh": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"p256dh": string,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"p256dh"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"rain_cells": {
                  Row: {
                    "geom": unknown,"id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "geom": unknown,"id": number
                  }
                  Update: {
                    "geom"?: unknown,"id"?: number
                  }
                  Relationships: [
                    
                  ]
                },"rain_obs": {
                  Row: {
                    "cell_id": number,"precip_mm": number,"ts": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cell_id": number,"precip_mm": number,"ts": string
                  }
                  Update: {
                    "cell_id"?: number,"precip_mm"?: number,"ts"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rain_obs_cell_id_fkey"
      columns: ["cell_id"]
isOneToOne: false
      referencedRelation: "rain_cells"
      referencedColumns: ["id"]
    }
                  ]
                },"report_votes": {
                  Row: {
                    "created_at": string,"report_id": string,"user_id": string,"vote": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"report_id": string,"user_id": string,"vote": number
                  }
                  Update: {
                    "created_at"?: string,"report_id"?: string,"user_id"?: string,"vote"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "report_votes_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "active_reports"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "report_votes_report_id_fkey"
      columns: ["report_id"]
isOneToOne: false
      referencedRelation: "reports"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"geom": unknown,"hidden": boolean,"id": string,"last_confirmed_at": string,"note": string | null,"photo_path": string | null,"place_name": string | null,"severity": Database["public"]['Enums']["severity"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"geom": unknown,"hidden"?: boolean,"id"?: string,"last_confirmed_at"?: string,"note"?: string | null,"photo_path"?: string | null,"place_name"?: string | null,"severity": Database["public"]['Enums']["severity"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"geom"?: unknown,"hidden"?: boolean,"id"?: string,"last_confirmed_at"?: string,"note"?: string | null,"photo_path"?: string | null,"place_name"?: string | null,"severity"?: Database["public"]['Enums']["severity"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"routes": {
                  Row: {
                    "active_days": (number)[],"buffer_m": number,"created_at": string,"geom": unknown,"id": string,"name": string,"user_id": string,"windows": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "active_days"?: (number)[],"buffer_m"?: number,"created_at"?: string,"geom": unknown,"id"?: string,"name": string,"user_id": string,"windows"?: NonNullable<Json>
                  }
                  Update: {
                    "active_days"?: (number)[],"buffer_m"?: number,"created_at"?: string,"geom"?: unknown,"id"?: string,"name"?: string,"user_id"?: string,"windows"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"spot_risk": {
                  Row: {
                    "computed_at": string,"level": string,"rain_1h_mm": number | null,"rain_3h_mm": number | null,"spot_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "computed_at"?: string,"level": string,"rain_1h_mm"?: number | null,"rain_3h_mm"?: number | null,"spot_id": number
                  }
                  Update: {
                    "computed_at"?: string,"level"?: string,"rain_1h_mm"?: number | null,"rain_3h_mm"?: number | null,"spot_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "spot_risk_spot_id_fkey"
      columns: ["spot_id"]
isOneToOne: true
      referencedRelation: "spot_points"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "spot_risk_spot_id_fkey"
      columns: ["spot_id"]
isOneToOne: true
      referencedRelation: "spots"
      referencedColumns: ["id"]
    }
                  ]
                },"spots": {
                  Row: {
                    "created_at": string,"geom": unknown,"id": number,"name": string,"notes": string | null,"source": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"geom": unknown,"id"?: never,"name": string,"notes"?: string | null,"source"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"geom"?: unknown,"id"?: never,"name"?: string,"notes"?: string | null,"source"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "active_reports": {
                  Row: {
                    "cleared_votes": number | null,"created_at": string | null,"id": string | null,"last_confirmed_at": string | null,"lat": number | null,"lon": number | null,"note": string | null,"photo_path": string | null,"place_name": string | null,"severity": Database["public"]['Enums']["severity"] | null,"still_votes": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"spot_points": {
                  Row: {
                    "id": number | null,"lat": number | null,"lon": number | null,"name": string | null,"risk_level": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "cast_vote":
{ Args: { "p_report_id": string,"p_user_id": string,"p_vote": number }; Returns: {
              "cleared_votes": number,"still_votes": number
            }[]
                           },
"cfg_num":
{ Args: { "k": string }; Returns: number
                           },
"submit_report":
{ Args: { "p_gps_lat": number,"p_gps_lon": number,"p_lat": number,"p_lon": number,"p_note"?: string,"p_photo_path"?: string,"p_severity": Database["public"]['Enums']["severity"],"p_user_id": string }; Returns: {
              "outcome": string,"report_id": string
            }[]
                           }
          }
          Enums: {
            "severity": "ankle"|"knee"|"impassable"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "severity": ["ankle", "knee", "impassable"]
          }
        }
} as const
