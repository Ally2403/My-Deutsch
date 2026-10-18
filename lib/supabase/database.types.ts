// Generado con generate_typescript_types (Supabase). Regenerar tras cada migración; no editar a mano.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      annotations: {
        Row: {
          book_id: string;
          id: string;
          kind: string;
          page: number;
          text: string;
          updated_at: string;
          user_id: string;
          w: number | null;
          x: number;
          y: number;
        };
        Insert: {
          book_id: string;
          id?: string;
          kind?: string;
          page: number;
          text: string;
          updated_at?: string;
          user_id: string;
          w?: number | null;
          x: number;
          y: number;
        };
        Update: {
          book_id?: string;
          id?: string;
          kind?: string;
          page?: number;
          text?: string;
          updated_at?: string;
          user_id?: string;
          w?: number | null;
          x?: number;
          y?: number;
        };
        Relationships: [];
      };
      book_submissions: {
        Row: {
          book_id: string | null;
          created_at: string;
          error: string | null;
          group_id: string;
          id: string;
          status: string;
          title: string;
          upload_path: string;
          user_id: string;
        };
        Insert: {
          book_id?: string | null;
          created_at?: string;
          error?: string | null;
          group_id: string;
          id?: string;
          status?: string;
          title: string;
          upload_path: string;
          user_id: string;
        };
        Update: {
          book_id?: string | null;
          created_at?: string;
          error?: string | null;
          group_id?: string;
          id?: string;
          status?: string;
          title?: string;
          upload_path?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "book_submissions_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "book_submissions_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      books: {
        Row: {
          created_at: string;
          delete_after: string | null;
          id: string;
          ocr_confidence: number | null;
          page_count: number | null;
          sha256: string;
          status: string;
          title: string;
          upload_path: string | null;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          delete_after?: string | null;
          id?: string;
          ocr_confidence?: number | null;
          page_count?: number | null;
          sha256: string;
          status?: string;
          title: string;
          upload_path?: string | null;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          delete_after?: string | null;
          id?: string;
          ocr_confidence?: number | null;
          page_count?: number | null;
          sha256?: string;
          status?: string;
          title?: string;
          upload_path?: string | null;
          uploaded_by?: string | null;
        };
        Relationships: [];
      };
      group_books: {
        Row: {
          added_at: string;
          added_by: string | null;
          book_id: string;
          group_id: string;
        };
        Insert: {
          added_at?: string;
          added_by?: string | null;
          book_id: string;
          group_id: string;
        };
        Update: {
          added_at?: string;
          added_by?: string | null;
          book_id?: string;
          group_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_books_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "group_books_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      group_members: {
        Row: {
          group_id: string;
          joined_at: string;
          role: string;
          user_id: string;
        };
        Insert: {
          group_id: string;
          joined_at?: string;
          role?: string;
          user_id: string;
        };
        Update: {
          group_id?: string;
          joined_at?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey";
            columns: ["group_id"];
            isOneToOne: false;
            referencedRelation: "groups";
            referencedColumns: ["id"];
          },
        ];
      };
      groups: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          invite_code: string;
          name: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invite_code: string;
          name: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          invite_code?: string;
          name?: string;
        };
        Relationships: [];
      };
      join_attempts: {
        Row: { attempted_at: string; id: number; user_id: string };
        Insert: { attempted_at?: string; id?: never; user_id: string };
        Update: { attempted_at?: string; id?: never; user_id?: string };
        Relationships: [];
      };
      jobs: {
        Row: {
          book_id: string;
          created_at: string;
          error: string | null;
          finished_at: string | null;
          id: string;
          pages_done: number;
          pages_total: number | null;
          requested_by: string | null;
          started_at: string | null;
          status: string;
        };
        Insert: {
          book_id: string;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          pages_done?: number;
          pages_total?: number | null;
          requested_by?: string | null;
          started_at?: string | null;
          status?: string;
        };
        Update: {
          book_id?: string;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          pages_done?: number;
          pages_total?: number | null;
          requested_by?: string | null;
          started_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      lexicon: {
        Row: {
          genders: string[];
          id: number;
          lemma: string;
          plural: string | null;
          pos: string;
          senses: Json;
          source: string | null;
        };
        Insert: {
          genders?: string[];
          id?: never;
          lemma: string;
          plural?: string | null;
          pos: string;
          senses?: Json;
          source?: string | null;
        };
        Update: {
          genders?: string[];
          id?: never;
          lemma?: string;
          plural?: string | null;
          pos?: string;
          senses?: Json;
          source?: string | null;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          book_id: string;
          height: number;
          image_path: string;
          number: number;
          ocr_confidence: number | null;
          printed_number: number | null;
          tokens_path: string;
          width: number;
        };
        Insert: {
          book_id: string;
          height: number;
          image_path: string;
          number: number;
          ocr_confidence?: number | null;
          printed_number?: number | null;
          tokens_path: string;
          width: number;
        };
        Update: {
          book_id?: string;
          height?: number;
          image_path?: string;
          number?: number;
          ocr_confidence?: number | null;
          printed_number?: number | null;
          tokens_path?: string;
          width?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pages_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          level: string | null;
          prefs: Json;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id: string;
          level?: string | null;
          prefs?: Json;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          level?: string | null;
          prefs?: Json;
        };
        Relationships: [];
      };
      reading_progress: {
        Row: {
          book_id: string;
          last_page: number;
          pages_read: number[];
          updated_at: string;
          user_id: string;
        };
        Insert: {
          book_id: string;
          last_page?: number;
          pages_read?: number[];
          updated_at?: string;
          user_id: string;
        };
        Update: {
          book_id?: string;
          last_page?: number;
          pages_read?: number[];
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      user_words: {
        Row: {
          first_book_id: string | null;
          first_page: number | null;
          first_seen_at: string;
          first_sentence: string | null;
          last_seen_at: string;
          lexicon_id: number;
          lookups: number;
          status: string;
          user_id: string;
        };
        Insert: {
          first_book_id?: string | null;
          first_page?: number | null;
          first_seen_at?: string;
          first_sentence?: string | null;
          last_seen_at?: string;
          lexicon_id: number;
          lookups?: number;
          status?: string;
          user_id: string;
        };
        Update: {
          first_book_id?: string | null;
          first_page?: number | null;
          first_seen_at?: string;
          first_sentence?: string | null;
          last_seen_at?: string;
          lexicon_id?: number;
          lookups?: number;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_words_first_book_id_fkey";
            columns: ["first_book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_words_lexicon_id_fkey";
            columns: ["lexicon_id"];
            isOneToOne: false;
            referencedRelation: "lexicon";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_read_book: { Args: { bid: string }; Returns: boolean };
      create_group: { Args: { p_name: string }; Returns: string };
      finalize_submission: {
        Args: { p_sha256: string; p_submission: string };
        Returns: Json;
      };
      is_group_admin: { Args: { gid: string }; Returns: boolean };
      is_group_member: { Args: { gid: string }; Returns: boolean };
      join_group: { Args: { p_code: string }; Returns: string };
      leave_group: { Args: { p_group: string }; Returns: undefined };
      regenerate_invite: { Args: { p_group: string }; Returns: string };
      reject_submission: {
        Args: { p_reason: string; p_submission: string };
        Returns: undefined;
      };
      request_retry: { Args: { p_book: string }; Returns: Json };
      shares_group_with: { Args: { uid: string }; Returns: boolean };
      storage_book_readable: {
        Args: { object_name: string };
        Returns: boolean;
      };
      submit_book: {
        Args: { p_group: string; p_title: string; p_upload_path: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
