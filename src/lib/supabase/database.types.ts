export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'student' | 'moderator';
export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair' | 'well_used';
export type ListingStatus = 'draft' | 'published' | 'sold' | 'archived' | 'removed';
export type ImageUploadStatus = 'pending' | 'uploaded' | 'failed';
export type ModerationAction = 'listing_removed';

export type Profile = {
  id: string;
  full_name: string | null;
  avatar_path: string | null;
  email: string;
  program: string | null;
  academic_year: string | null;
  residence_area: string | null;
  university: string;
  email_verified: boolean;
  role: UserRole;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: number;
  slug: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type PickupArea = {
  id: number;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Listing = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price_cents: number | null;
  category_id: number | null;
  condition: ListingCondition | null;
  open_to_offers: boolean;
  pickup_area: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  status: ListingStatus;
  featured_at: string | null;
  published_at: string | null;
  removed_at: string | null;
  removed_by: string | null;
  removal_reason: string | null;
  version: number;
  search_vector: string;
  created_at: string;
  updated_at: string;
};

export type ListingImage = {
  id: string;
  listing_id: string;
  storage_path: string;
  position: number;
  upload_status: ImageUploadStatus;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
  updated_at: string;
};

export type ModerationEvent = {
  id: number;
  moderator_id: string | null;
  listing_id: string | null;
  seller_id: string | null;
  listing_title: string;
  action: ModerationAction;
  reason: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  listing_id: string | null;
  listing_title_snapshot: string;
  listing_cover_path_snapshot: string | null;
  buyer_id: string;
  seller_id: string;
  buyer_last_read_at: string;
  seller_last_read_at: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      notification_preferences: {
        Row: { user_id: string; message_emails_enabled: boolean };
        Insert: { user_id: string; message_emails_enabled?: boolean };
        Update: { message_emails_enabled?: boolean };
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_path?: string | null;
          email: string;
          program?: string | null;
          academic_year?: string | null;
          residence_area?: string | null;
          university?: string;
          email_verified?: boolean;
          role?: UserRole;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_path?: string | null;
          email?: string;
          program?: string | null;
          academic_year?: string | null;
          residence_area?: string | null;
          university?: string;
          email_verified?: boolean;
          role?: UserRole;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: Category;
        Insert: {
          id?: never;
          slug: string;
          name: string;
          icon: string;
          sort_order: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: never;
          slug?: string;
          name?: string;
          icon?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      pickup_areas: {
        Row: PickupArea;
        Insert: {
          id?: never;
          slug: string;
          name: string;
          sort_order: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: never;
          slug?: string;
          name?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      listings: {
        Row: Listing;
        Insert: {
          id?: string;
          seller_id: string;
          title?: string;
          description?: string;
          price_cents?: number | null;
          category_id?: number | null;
          condition?: ListingCondition | null;
          open_to_offers?: boolean;
          pickup_area?: string;
          pickup_latitude?: number | null;
          pickup_longitude?: number | null;
          status?: ListingStatus;
          featured_at?: string | null;
          published_at?: string | null;
          removed_at?: string | null;
          removed_by?: string | null;
          removal_reason?: string | null;
          version?: number;
          search_vector?: never;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          seller_id?: string;
          title?: string;
          description?: string;
          price_cents?: number | null;
          category_id?: number | null;
          condition?: ListingCondition | null;
          open_to_offers?: boolean;
          pickup_area?: string;
          pickup_latitude?: number | null;
          pickup_longitude?: number | null;
          status?: ListingStatus;
          featured_at?: string | null;
          published_at?: string | null;
          removed_at?: string | null;
          removed_by?: string | null;
          removal_reason?: string | null;
          version?: number;
          search_vector?: never;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'listings_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'listings_removed_by_fkey';
            columns: ['removed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'listings_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      listing_images: {
        Row: ListingImage;
        Insert: {
          id?: string;
          listing_id: string;
          storage_path: string;
          position: number;
          upload_status?: ImageUploadStatus;
          mime_type: string;
          size_bytes: number;
          width?: number | null;
          height?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          storage_path?: string;
          position?: number;
          upload_status?: ImageUploadStatus;
          mime_type?: string;
          size_bytes?: number;
          width?: number | null;
          height?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'listing_images_listing_id_fkey';
            columns: ['listing_id'];
            isOneToOne: false;
            referencedRelation: 'listings';
            referencedColumns: ['id'];
          },
        ];
      };
      conversations: {
        Row: Conversation;
        Insert: {
          id?: string;
          listing_id?: string | null;
          listing_title_snapshot: string;
          listing_cover_path_snapshot?: string | null;
          buyer_id: string;
          seller_id: string;
          buyer_last_read_at?: string;
          seller_last_read_at?: string;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string | null;
          listing_title_snapshot?: string;
          listing_cover_path_snapshot?: string | null;
          buyer_id?: string;
          seller_id?: string;
          buyer_last_read_at?: string;
          seller_last_read_at?: string;
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'conversations_buyer_id_fkey';
            columns: ['buyer_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_listing_id_fkey';
            columns: ['listing_id'];
            isOneToOne: false;
            referencedRelation: 'listings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'conversations_seller_id_fkey';
            columns: ['seller_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: Message;
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey';
            columns: ['conversation_id'];
            isOneToOne: false;
            referencedRelation: 'conversations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      seller_ratings: {
        Row: {
          id: string;
          listing_id: string;
          conversation_id: string;
          buyer_id: string;
          seller_id: string;
          rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          listing_id: string;
          conversation_id: string;
          buyer_id: string;
          seller_id: string;
          rating: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          listing_id?: string;
          conversation_id?: string;
          buyer_id?: string;
          seller_id?: string;
          rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      moderation_events: {
        Row: ModerationEvent;
        Insert: {
          id?: never;
          moderator_id?: string | null;
          listing_id?: string | null;
          seller_id?: string | null;
          listing_title: string;
          action: ModerationAction;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: never;
          moderator_id?: string | null;
          listing_id?: string | null;
          seller_id?: string | null;
          listing_title?: string;
          action?: ModerationAction;
          reason?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'moderation_events_listing_id_fkey';
            columns: ['listing_id'];
            isOneToOne: false;
            referencedRelation: 'listings';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'moderation_events_moderator_id_fkey';
            columns: ['moderator_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      seller_profiles: {
        Row: {
          id: string;
          display_name: string;
          program: string | null;
          academic_year: string | null;
          university: string;
          created_at: string;
          avatar_path: string | null;
          rating_average: number | null;
          rating_count: number;
        };
        Relationships: [];
      };
      marketplace_listings: {
        Row: {
          id: string;
          title: string;
          description: string;
          price_cents: number | null;
          condition: ListingCondition | null;
          open_to_offers: boolean;
          pickup_area: string;
          featured_at: string | null;
          published_at: string | null;
          created_at: string;
          updated_at: string;
          category_id: number;
          category_slug: string;
          category_name: string;
          category_icon: string;
          seller_id: string;
          seller_name: string;
          seller_program: string | null;
          seller_academic_year: string | null;
          seller_joined_at: string;
          seller_university: string;
          cover_image_path: string | null;
          pickup_latitude: number | null;
          pickup_longitude: number | null;
        };
        Relationships: [];
      };
      inbox_conversations: {
        Row: {
          id: string;
          listing_id: string | null;
          listing_title: string;
          cover_image_path: string | null;
          listing_status: ListingStatus | null;
          buyer_id: string;
          seller_id: string;
          counterpart_id: string;
          counterpart_name: string;
          last_message_id: string | null;
          last_message_sender_id: string | null;
          last_message_body: string | null;
          last_message_created_at: string | null;
          unread_count: number;
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
          seller_rating: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      claim_message_emails: {
        Args: Record<string, never>;
        Returns: Array<{ id: string; conversation_id: string; recipient_email: string; lease: string | null }>;
      };
      message_email_is_eligible: { Args: { job_id: string }; Returns: boolean };
      finish_message_email: { Args: { job_id: string; job_lease: string; outcome: string }; Returns: undefined };

      complete_onboarding: {
        Args: {
          p_full_name: string;
          p_program: string;
          p_academic_year: string;
          p_residence_area?: string | null;
        };
        Returns: Profile;
      };
      hook_restrict_signup: {
        Args: { event: Json };
        Returns: Json;
      };
      get_unread_message_count: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      mark_conversation_read: {
        Args: { p_conversation_id: string };
        Returns: string;
      };
      rate_seller: {
        Args: { p_conversation_id: string; p_rating: number };
        Returns: number;
      };
      publish_listing: {
        Args: { p_listing_id: string };
        Returns: Listing;
      };
      reserve_listing_image: {
        Args: {
          p_listing_id: string;
          p_image_id: string;
          p_mime_type: string;
          p_size_bytes: number;
          p_width?: number | null;
          p_height?: number | null;
        };
        Returns: ListingImage;
      };
      save_listing_draft: {
        Args: {
          p_listing_id?: string | null;
          p_title?: string;
          p_description?: string;
          p_price_cents?: number | null;
          p_category_id?: number | null;
          p_condition?: ListingCondition | null;
          p_open_to_offers?: boolean;
          p_pickup_area?: string;
          p_pickup_latitude?: number | null;
          p_pickup_longitude?: number | null;
        };
        Returns: Listing;
      };
      reorder_listing_images: {
        Args: { p_listing_id: string; p_image_ids: string[] };
        Returns: ListingImage[];
      };
      remove_listing: {
        Args: { p_listing_id: string; p_reason: string };
        Returns: Listing;
      };
      send_conversation_message: {
        Args: { p_conversation_id: string; p_body: string };
        Returns: Message;
      };
      start_listing_conversation: {
        Args: { p_listing_id: string };
        Returns: Conversation;
      };
      search_marketplace: {
        Args: {
          p_query: string;
          p_related_terms?: string[];
          p_category_slug?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: Json;
      };
      search_listings: {
        Args: {
          p_query?: string | null;
          p_category_slug?: string | null;
          p_limit?: number;
          p_before_published_at?: string | null;
          p_before_id?: string | null;
        };
        Returns: Listing[];
      };
    };
    Enums: {
      user_role: UserRole;
      listing_condition: ListingCondition;
      listing_status: ListingStatus;
      image_upload_status: ImageUploadStatus;
      moderation_action: ModerationAction;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    keyof (PublicSchema['Tables'] & PublicSchema['Views']) | { schema: keyof Database },
  TableName extends (PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema['Enums'] | { schema: keyof Database },
  EnumName extends (PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;
