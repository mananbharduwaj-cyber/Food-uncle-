export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      addresses: {
        Row: {
          city: string
          created_at: string
          house: string
          id: string
          landmark: string | null
          lat: number | null
          lng: number | null
          name: string
          phone: string
          pincode: string
          street: string
          user_id: string
        }
        Insert: {
          city: string
          created_at?: string
          house: string
          id?: string
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          phone: string
          pincode: string
          street: string
          user_id: string
        }
        Update: {
          city?: string
          created_at?: string
          house?: string
          id?: string
          landmark?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string
          pincode?: string
          street?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          is_active: boolean
          name: string
          sort_order: number
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string
          description: string | null
          discount_type: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          value: number
        }
        Insert: {
          code: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          value: number
        }
        Update: {
          code?: string
          description?: string | null
          discount_type?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          value?: number
        }
        Relationships: []
      }
      dining_tables: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          table_number: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          table_number: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          table_number?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          addons: Json
          category_id: string | null
          created_at: string
          description: string | null
          discount_price: number | null
          id: string
          image_url: string | null
          is_available: boolean
          is_bestseller: boolean
          is_recommended: boolean
          is_spicy: boolean
          is_veg: boolean
          keywords: string | null
          name: string
          prep_time_minutes: number | null
          price: number
        }
        Insert: {
          addons?: Json
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_bestseller?: boolean
          is_recommended?: boolean
          is_spicy?: boolean
          is_veg?: boolean
          keywords?: string | null
          name: string
          prep_time_minutes?: number | null
          price: number
        }
        Update: {
          addons?: Json
          category_id?: string | null
          created_at?: string
          description?: string | null
          discount_price?: number | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_bestseller?: boolean
          is_recommended?: boolean
          is_spicy?: boolean
          is_veg?: boolean
          keywords?: string | null
          name?: string
          prep_time_minutes?: number | null
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          addons: Json
          id: string
          line_total: number
          menu_item_id: string | null
          name: string
          notes: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Insert: {
          addons?: Json
          id?: string
          line_total: number
          menu_item_id?: string | null
          name: string
          notes?: string | null
          order_id: string
          quantity: number
          unit_price: number
        }
        Update: {
          addons?: Json
          id?: string
          line_total?: number
          menu_item_id?: string | null
          name?: string
          notes?: string | null
          order_id?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: Json | null
          coupon_code: string | null
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          delivery_partner_id: string | null
          delivery_payment_received: boolean
          delivered_at: string | null
          delivery_fee: number
          discount: number
          distance_km: number | null
          id: string
          instructions: string | null
          order_number: number
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_id: string | null
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: Json | null
          coupon_code?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_partner_id?: string | null
          delivery_payment_received?: boolean
          delivered_at?: string | null
          delivery_fee?: number
          discount?: number
          distance_km?: number | null
          id?: string
          instructions?: string | null
          order_number?: number
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          table_id?: string | null
          tax?: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: Json | null
          coupon_code?: string | null
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          delivery_partner_id?: string | null
          delivery_payment_received?: boolean
          delivered_at?: string | null
          delivery_fee?: number
          discount?: number
          distance_km?: number | null
          id?: string
          instructions?: string | null
          order_number?: number
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          table_id?: string | null
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dining_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      restaurant_settings: {
        Row: {
          address: string | null
          allow_outside_radius: boolean
          announcement: string | null
          delivery_enabled: boolean
          delivery_radius_km: number
          distance_fee_slabs: Json
          flat_delivery_fee: number
          free_delivery_above: number
          id: number
          is_open: boolean
          lat: number
          lng: number
          min_order_value: number
          name: string
          online_payments_enabled: boolean
          phone: string | null
          prep_time_minutes: number
          tagline: string | null
          tax_percent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          allow_outside_radius?: boolean
          announcement?: string | null
          delivery_enabled?: boolean
          delivery_radius_km?: number
          distance_fee_slabs?: Json
          flat_delivery_fee?: number
          free_delivery_above?: number
          id?: number
          is_open?: boolean
          lat?: number
          lng?: number
          min_order_value?: number
          name?: string
          online_payments_enabled?: boolean
          phone?: string | null
          prep_time_minutes?: number
          tagline?: string | null
          tax_percent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          allow_outside_radius?: boolean
          announcement?: string | null
          delivery_enabled?: boolean
          delivery_radius_km?: number
          distance_fee_slabs?: Json
          flat_delivery_fee?: number
          free_delivery_above?: number
          id?: number
          is_open?: boolean
          lat?: number
          lng?: number
          min_order_value?: number
          name?: string
          online_payments_enabled?: boolean
          phone?: string | null
          prep_time_minutes?: number
          tagline?: string | null
          tax_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      admin_list_users: {
        Args: Record<PropertyKey, never>
        Returns: { user_id: string; email: string | null; full_name: string | null; phone: string | null; roles: Database["public"]["Enums"]["app_role"][] }[]
      }
      admin_set_user_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "owner" | "manager" | "delivery_partner"
      order_status:
        | "placed"
        | "accepted"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "served"
        | "delivered"
        | "completed"
        | "cancelled"
        | "rejected"
      order_type: "delivery" | "dine_in" | "takeaway"
      payment_method: "cod" | "pay_at_counter" | "online"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["customer", "owner", "manager", "delivery_partner"],
      order_status: [
        "placed",
        "accepted",
        "preparing",
        "ready",
        "out_for_delivery",
        "served",
        "delivered",
        "completed",
        "cancelled",
        "rejected",
      ],
      order_type: ["delivery", "dine_in", "takeaway"],
      payment_method: ["cod", "pay_at_counter", "online"],
    },
  },
} as const
