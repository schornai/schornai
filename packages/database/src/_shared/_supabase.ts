export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      activities: {
        Row: {
          content: NonNullable<Json>;
          created_at: string;
          id: string;
          label: string;
          pinned: boolean;
          type: Database["public"]["Enums"]["activity_type"];
          user_id: string;
          worker_state:
            Database["public"]["Enums"]["activity_worker_state"] | null;
        };
        ComputedFields: never;
        Insert: {
          content: NonNullable<Json>;
          created_at?: string;
          id?: string;
          label: string;
          pinned: boolean;
          type: Database["public"]["Enums"]["activity_type"];
          user_id: string;
          worker_state?:
            Database["public"]["Enums"]["activity_worker_state"] | null;
        };
        Update: {
          content?: NonNullable<Json>;
          created_at?: string;
          id?: string;
          label?: string;
          pinned?: boolean;
          type?: Database["public"]["Enums"]["activity_type"];
          user_id?: string;
          worker_state?:
            Database["public"]["Enums"]["activity_worker_state"] | null;
        };
        Relationships: [];
      };
      agent_mcp_credentials: {
        Row: {
          agent_id: string;
          headers: NonNullable<Json>;
          mcp_id: string;
          role_id: string;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          agent_id: string;
          headers: NonNullable<Json>;
          mcp_id: string;
          role_id: string;
          url: string;
        };
        Update: {
          agent_id?: string;
          headers?: NonNullable<Json>;
          mcp_id?: string;
          role_id?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_mcp_credentials_agent_id_fkey";
            columns: ["agent_id"];
            isOneToOne: false;
            referencedRelation: "chatbots";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_model_credentials: {
        Row: {
          api_key: string;
          model_id: string;
        };
        ComputedFields: never;
        Insert: {
          api_key: string;
          model_id: string;
        };
        Update: {
          api_key?: string;
          model_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_model_credentials_model_id_fkey";
            columns: ["model_id"];
            isOneToOne: true;
            referencedRelation: "ai_models";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_models: {
        Row: {
          config: NonNullable<Json>;
          created_at: string;
          description: string | null;
          id: string;
          identifier: string;
          image: Json | null;
          name: string;
          type: Database["public"]["Enums"]["ai_model_type"];
        };
        ComputedFields: never;
        Insert: {
          config: NonNullable<Json>;
          created_at?: string;
          description?: string | null;
          id?: string;
          identifier: string;
          image?: Json | null;
          name: string;
          type: Database["public"]["Enums"]["ai_model_type"];
        };
        Update: {
          config?: NonNullable<Json>;
          created_at?: string;
          description?: string | null;
          id?: string;
          identifier?: string;
          image?: Json | null;
          name?: string;
          type?: Database["public"]["Enums"]["ai_model_type"];
        };
        Relationships: [];
      };
      box_runtime_states: {
        Row: {
          box_id: string;
          created_at: string;
          current_streams: number;
          expires_at: string;
          id: string;
          model_identifier: string;
        };
        ComputedFields: never;
        Insert: {
          box_id: string;
          created_at?: string;
          current_streams: number;
          expires_at: string;
          id?: string;
          model_identifier: string;
        };
        Update: {
          box_id?: string;
          created_at?: string;
          current_streams?: number;
          expires_at?: string;
          id?: string;
          model_identifier?: string;
        };
        Relationships: [
          {
            foreignKeyName: "box_runtime_states_box_id_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "boxes";
            referencedColumns: ["id"];
          },
        ];
      };
      box_xrag_actions: {
        Row: {
          box_id: string;
          created_at: string;
          id: string;
          state: Database["public"]["Enums"]["box_xrag_action_state"];
          xrag_file_name: string;
        };
        ComputedFields: never;
        Insert: {
          box_id: string;
          created_at?: string;
          id?: string;
          state: Database["public"]["Enums"]["box_xrag_action_state"];
          xrag_file_name: string;
        };
        Update: {
          box_id?: string;
          created_at?: string;
          id?: string;
          state?: Database["public"]["Enums"]["box_xrag_action_state"];
          xrag_file_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "box_xrag_actions_box_fkey";
            columns: ["box_id"];
            isOneToOne: false;
            referencedRelation: "boxes";
            referencedColumns: ["id"];
          },
        ];
      };
      boxes: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          location: string | null;
          name: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          description?: string | null;
          id: string;
          location?: string | null;
          name?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          location?: string | null;
          name?: string | null;
        };
        Relationships: [];
      };
      chat_states: {
        Row: {
          chat_id: string;
          created_at: string;
          id: string;
          messages: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          chat_id: string;
          created_at?: string;
          id?: string;
          messages: NonNullable<Json>;
        };
        Update: {
          chat_id?: string;
          created_at?: string;
          id?: string;
          messages?: NonNullable<Json>;
        };
        Relationships: [
          {
            foreignKeyName: "chat_states_chat_id_fkey";
            columns: ["chat_id"];
            isOneToOne: false;
            referencedRelation: "chats";
            referencedColumns: ["id"];
          },
        ];
      };
      chatbot_favorites: {
        Row: {
          chatbot_id: string;
          created_at: string;
          id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          chatbot_id: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Update: {
          chatbot_id?: string;
          created_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "chatbot_favorites_chatbot_id_fkey";
            columns: ["chatbot_id"];
            isOneToOne: false;
            referencedRelation: "chatbots";
            referencedColumns: ["id"];
          },
        ];
      };
      chatbots: {
        Row: {
          config: NonNullable<Json>;
          created_at: string;
          description: string;
          id: string;
          name: string;
          organization_id: string;
          roles: NonNullable<Json>;
          visibility: Database["public"]["Enums"]["chatbot_visibility"];
        };
        ComputedFields: never;
        Insert: {
          config: NonNullable<Json>;
          created_at?: string;
          description: string;
          id?: string;
          name: string;
          organization_id: string;
          roles: NonNullable<Json>;
          visibility?: Database["public"]["Enums"]["chatbot_visibility"];
        };
        Update: {
          config?: NonNullable<Json>;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          organization_id?: string;
          roles?: NonNullable<Json>;
          visibility?: Database["public"]["Enums"]["chatbot_visibility"];
        };
        Relationships: [
          {
            foreignKeyName: "chatbots_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      chats: {
        Row: {
          chatbot_id: string | null;
          created_at: string;
          id: string;
          label: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          chatbot_id?: string | null;
          created_at?: string;
          id?: string;
          label: string;
          user_id?: string | null;
        };
        Update: {
          chatbot_id?: string | null;
          created_at?: string;
          id?: string;
          label?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "chats_chatbot_id_fkey";
            columns: ["chatbot_id"];
            isOneToOne: false;
            referencedRelation: "chatbots";
            referencedColumns: ["id"];
          },
        ];
      };
      databases: {
        Row: {
          config: NonNullable<Json>;
          created_at: string;
          description: string;
          id: string;
          name: string;
          organization_id: string | null;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          config: NonNullable<Json>;
          created_at?: string;
          description: string;
          id?: string;
          name: string;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Update: {
          config?: NonNullable<Json>;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          organization_id?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "databases_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      embeddings_1024: {
        Row: {
          created_at: string;
          database_id: string;
          embedding: string | null;
          id: string;
          object_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          database_id: string;
          embedding?: string | null;
          id?: string;
          object_id: string;
        };
        Update: {
          created_at?: string;
          database_id?: string;
          embedding?: string | null;
          id?: string;
          object_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "embeddings_1024_database_id_fkey";
            columns: ["database_id"];
            isOneToOne: false;
            referencedRelation: "databases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "embeddings_1024_object_id_fkey";
            columns: ["object_id"];
            isOneToOne: false;
            referencedRelation: "source_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      embeddings_1536: {
        Row: {
          created_at: string;
          database_id: string;
          embedding: string | null;
          id: string;
          object_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          database_id: string;
          embedding?: string | null;
          id?: string;
          object_id: string;
        };
        Update: {
          created_at?: string;
          database_id?: string;
          embedding?: string | null;
          id?: string;
          object_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "embeddings_1536_database_id_fkey";
            columns: ["database_id"];
            isOneToOne: false;
            referencedRelation: "databases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "embeddings_1536_object_id_fkey";
            columns: ["object_id"];
            isOneToOne: false;
            referencedRelation: "source_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      embeddings_384: {
        Row: {
          created_at: string;
          database_id: string;
          embedding: string | null;
          id: string;
          object_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          database_id: string;
          embedding?: string | null;
          id?: string;
          object_id: string;
        };
        Update: {
          created_at?: string;
          database_id?: string;
          embedding?: string | null;
          id?: string;
          object_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "embeddings_384_database_id_fkey";
            columns: ["database_id"];
            isOneToOne: false;
            referencedRelation: "databases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "embeddings_384_object_id_fkey";
            columns: ["object_id"];
            isOneToOne: false;
            referencedRelation: "source_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      embeddings_768: {
        Row: {
          created_at: string;
          database_id: string;
          embedding: string | null;
          id: string;
          object_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          database_id: string;
          embedding?: string | null;
          id?: string;
          object_id: string;
        };
        Update: {
          created_at?: string;
          database_id?: string;
          embedding?: string | null;
          id?: string;
          object_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "embeddings_768_database_id_fkey";
            columns: ["database_id"];
            isOneToOne: false;
            referencedRelation: "databases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "embeddings_768_object_id_fkey";
            columns: ["object_id"];
            isOneToOne: false;
            referencedRelation: "source_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      mcp_oauth_sessions: {
        Row: {
          data: NonNullable<Json>;
          server_url: string;
          state: string | null;
          state_expires_at: string | null;
          user_id: string;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          data?: NonNullable<Json>;
          server_url: string;
          state?: string | null;
          state_expires_at?: string | null;
          user_id: string;
          version: string;
        };
        Update: {
          data?: NonNullable<Json>;
          server_url?: string;
          state?: string | null;
          state_expires_at?: string | null;
          user_id?: string;
          version?: string;
        };
        Relationships: [];
      };
      ollama_models: {
        Row: {
          context_size: number;
          created_at: string;
          description: string;
          embedding_vector_size: number | null;
          feature_embedding: boolean;
          feature_tools: boolean;
          feature_vision: boolean;
          id: string;
          identifier: string;
          image: Json | null;
          name: string;
        };
        ComputedFields: never;
        Insert: {
          context_size?: number;
          created_at?: string;
          description?: string;
          embedding_vector_size?: number | null;
          feature_embedding?: boolean;
          feature_tools?: boolean;
          feature_vision?: boolean;
          id?: string;
          identifier: string;
          image?: Json | null;
          name: string;
        };
        Update: {
          context_size?: number;
          created_at?: string;
          description?: string;
          embedding_vector_size?: number | null;
          feature_embedding?: boolean;
          feature_tools?: boolean;
          feature_vision?: boolean;
          id?: string;
          identifier?: string;
          image?: Json | null;
          name?: string;
        };
        Relationships: [];
      };
      organizations: {
        Row: {
          auto_join: boolean | null;
          created_at: string;
          description: string;
          id: string;
          name: string;
          saml_mapping_editor: string | null;
          saml_mapping_user: string | null;
        };
        ComputedFields: never;
        Insert: {
          auto_join?: boolean | null;
          created_at?: string;
          description: string;
          id?: string;
          name: string;
          saml_mapping_editor?: string | null;
          saml_mapping_user?: string | null;
        };
        Update: {
          auto_join?: boolean | null;
          created_at?: string;
          description?: string;
          id?: string;
          name?: string;
          saml_mapping_editor?: string | null;
          saml_mapping_user?: string | null;
        };
        Relationships: [];
      };
      provider_connections: {
        Row: {
          client_id: string | null;
          id: string;
          kind: string;
          market: string | null;
          name: string;
          secret: string | null;
          version: string;
        };
        ComputedFields: never;
        Insert: {
          client_id?: string | null;
          id?: string;
          kind: string;
          market?: string | null;
          name: string;
          secret?: string | null;
          version?: string;
        };
        Update: {
          client_id?: string | null;
          id?: string;
          kind?: string;
          market?: string | null;
          name?: string;
          secret?: string | null;
          version?: string;
        };
        Relationships: [];
      };
      realtime_document_access: {
        Row: {
          document_id: string;
          id: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          document_id: string;
          id?: string;
          user_id: string;
        };
        Update: {
          document_id?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "realtime_document_access_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "realtime_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      realtime_documents: {
        Row: {
          created_at: string;
          document_data: string | null;
          document_name: string;
          id: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          document_data?: string | null;
          document_name: string;
          id?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          document_data?: string | null;
          document_name?: string;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      settings_user: {
        Row: {
          created_at: string;
          id: string;
          key: string;
          user_id: string;
          value: NonNullable<Json>;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          key: string;
          user_id?: string;
          value: NonNullable<Json>;
        };
        Update: {
          created_at?: string;
          id?: string;
          key?: string;
          user_id?: string;
          value?: NonNullable<Json>;
        };
        Relationships: [];
      };
      source_folders: {
        Row: {
          created_at: string;
          database_id: string;
          id: string;
          name: string;
          parent_folder_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          database_id: string;
          id?: string;
          name: string;
          parent_folder_id?: string | null;
        };
        Update: {
          created_at?: string;
          database_id?: string;
          id?: string;
          name?: string;
          parent_folder_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "source_folders_database_id_fkey";
            columns: ["database_id"];
            isOneToOne: false;
            referencedRelation: "databases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "source_folders_parent_folder_id_fkey";
            columns: ["parent_folder_id"];
            isOneToOne: false;
            referencedRelation: "source_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      source_objects: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          page: number | null;
          source_id: string;
        };
        ComputedFields: never;
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          page?: number | null;
          source_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          page?: number | null;
          source_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "source_objects_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          created_at: string;
          database_id: string;
          id: string;
          mime_type: string;
          name: string;
          source_folder_id: string | null;
          url: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          database_id: string;
          id?: string;
          mime_type: string;
          name: string;
          source_folder_id?: string | null;
          url: string;
        };
        Update: {
          created_at?: string;
          database_id?: string;
          id?: string;
          mime_type?: string;
          name?: string;
          source_folder_id?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sources_database_id_fkey";
            columns: ["database_id"];
            isOneToOne: false;
            referencedRelation: "databases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sources_source_folder_id_fkey";
            columns: ["source_folder_id"];
            isOneToOne: false;
            referencedRelation: "source_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      storage_file_locks: {
        Row: {
          bucket: string;
          expires_at: string;
          path: string;
          token: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          bucket: string;
          expires_at: string;
          path: string;
          token: string;
          user_id: string;
        };
        Update: {
          bucket?: string;
          expires_at?: string;
          path?: string;
          token?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          created_at: string;
          id: string;
          key: string;
          value: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          key: string;
          value: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          key?: string;
          value?: string;
        };
        Relationships: [];
      };
      task_claims: {
        Row: {
          completed_at: string | null;
          expires_at: string;
          owner_token: string;
          recovery_pending: boolean;
          snapshot: string | null;
          state: string;
          task_id: string;
        };
        ComputedFields: never;
        Insert: {
          completed_at?: string | null;
          expires_at: string;
          owner_token: string;
          recovery_pending?: boolean;
          snapshot?: string | null;
          state: string;
          task_id: string;
        };
        Update: {
          completed_at?: string | null;
          expires_at?: string;
          owner_token?: string;
          recovery_pending?: boolean;
          snapshot?: string | null;
          state?: string;
          task_id?: string;
        };
        Relationships: [];
      };
      text_searches: {
        Row: {
          created_at: string;
          database_id: string;
          id: string;
          object_id: string;
          text_search_vector: unknown;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          database_id: string;
          id?: string;
          object_id: string;
          text_search_vector: unknown;
        };
        Update: {
          created_at?: string;
          database_id?: string;
          id?: string;
          object_id?: string;
          text_search_vector?: unknown;
        };
        Relationships: [
          {
            foreignKeyName: "text_searches_database_id_fkey";
            columns: ["database_id"];
            isOneToOne: false;
            referencedRelation: "databases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "text_searches_object_id_fkey";
            columns: ["object_id"];
            isOneToOne: false;
            referencedRelation: "source_objects";
            referencedColumns: ["id"];
          },
        ];
      };
      transcribers: {
        Row: {
          ai_model_id: string | null;
          config: Json | null;
          created_at: string;
          description: string | null;
          id: string;
          name: string | null;
          organization_id: string;
          prompt: string | null;
        };
        ComputedFields: never;
        Insert: {
          ai_model_id?: string | null;
          config?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string | null;
          organization_id: string;
          prompt?: string | null;
        };
        Update: {
          ai_model_id?: string | null;
          config?: Json | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string | null;
          organization_id?: string;
          prompt?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "transcribers_ai_model_id_fkey";
            columns: ["ai_model_id"];
            isOneToOne: false;
            referencedRelation: "ai_models";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transcribers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      transcriptions: {
        Row: {
          content: Json | null;
          created_at: string;
          file_full_path: string | null;
          id: string;
          summary: string | null;
          transcriber_id: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          content?: Json | null;
          created_at?: string;
          file_full_path?: string | null;
          id?: string;
          summary?: string | null;
          transcriber_id?: string | null;
          user_id: string;
        };
        Update: {
          content?: Json | null;
          created_at?: string;
          file_full_path?: string | null;
          id?: string;
          summary?: string | null;
          transcriber_id?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transcriptions_transcriber_id_fkey";
            columns: ["transcriber_id"];
            isOneToOne: false;
            referencedRelation: "transcribers";
            referencedColumns: ["id"];
          },
        ];
      };
      user_password_reset_key: {
        Row: {
          created_at: string;
          expires: string;
          for_user_id: string;
          id: string;
          reset_key: string;
          used: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          expires: string;
          for_user_id: string;
          id?: string;
          reset_key: string;
          used?: string | null;
        };
        Update: {
          created_at?: string;
          expires?: string;
          for_user_id?: string;
          id?: string;
          reset_key?: string;
          used?: string | null;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          avatar_url: string | null;
          first_name: string | null;
          id: string;
          last_name: string | null;
        };
        ComputedFields: never;
        Insert: {
          avatar_url?: string | null;
          first_name?: string | null;
          id: string;
          last_name?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          first_name?: string | null;
          id?: string;
          last_name?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string | null;
          role: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          organization_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "public_user_roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      text_searches_with_sources: {
        Row: {
          created_at: string | null;
          database_id: string | null;
          id: string | null;
          object_id: string | null;
          source_id: string | null;
          text_search_vector: unknown;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "source_objects_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "text_searches_database_id_fkey";
            columns: ["database_id"];
            isOneToOne: false;
            referencedRelation: "databases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "text_searches_object_id_fkey";
            columns: ["object_id"];
            isOneToOne: false;
            referencedRelation: "source_objects";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      acquire_storage_file_lock: {
        Args: { p_bucket: string; p_path: string; p_token: string };
        Returns: boolean;
      };
      agent_config_has_no_credentials: {
        Args: { p_config: Json };
        Returns: boolean;
      };
      authorize:
        | {
            Args: { p_role: Database["public"]["Enums"]["user_role"] };
            Returns: boolean;
          }
        | {
            Args: {
              p_organization_id: string;
              p_role: Database["public"]["Enums"]["user_role"];
            };
            Returns: boolean;
          };
      can_access: {
        Args: {
          minimum_role: string;
          owner_id: string;
          user_id: string;
          user_role: string;
        };
        Returns: boolean;
      };
      can_view_endpoint: {
        Args: { user_role: string; visibility: string };
        Returns: boolean;
      };
      claim_background_task: {
        Args: { p_owner_token: string; p_snapshot: string; p_task_id: string };
        Returns: {
          completed_at: string | null;
          expires_at: string;
          owner_token: string;
          recovery_pending: boolean;
          snapshot: string | null;
          state: string;
          task_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "task_claims";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      create_external_ai_model: {
        Args: {
          api_key: string;
          base_url: string;
          external_model_id: string;
          model_name: string;
          provider?: string;
          region?: string;
        };
        Returns: string;
      };
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
      decrement_current_streams: {
        Args: { p_box_id: string; p_model_identifier: string };
        Returns: undefined;
      };
      ensure_realtime_document: {
        Args: { p_document_name: string; p_user_ids: string[] };
        Returns: string;
      };
      expire_background_tasks: {
        Args: Record<PropertyKey, never>;
        Returns: {
          completed_at: string | null;
          expires_at: string;
          owner_token: string;
          recovery_pending: boolean;
          snapshot: string | null;
          state: string;
          task_id: string;
        }[];
        SetofOptions: {
          from: "*";
          to: "task_claims";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      finish_background_task: {
        Args: {
          p_owner_token: string;
          p_snapshot: string;
          p_state: string;
          p_task_id: string;
        };
        Returns: boolean;
      };
      generate_custom_id: { Args: Record<PropertyKey, never>; Returns: string };
      get_parent_folders: {
        Args: { folder_id: string };
        Returns: {
          created_at: string;
          database_id: string;
          id: string;
          name: string;
          parent_folder_id: string | null;
        }[];
        SetofOptions: {
          from: "*";
          to: "source_folders";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      match_embeddings_1024: {
        Args: {
          match_count: number;
          match_threshold: number;
          param_database_id: string;
          query_embedding_1024: string;
        };
        Returns: Record<string, unknown>[];
      };
      match_embeddings_1024_v2: {
        Args: {
          param_database_id: string;
          param_embedding: string;
          param_limit: number;
          param_offset: number;
          param_threshold: number;
        };
        Returns: Record<string, unknown>[];
      };
      match_embeddings_1536: {
        Args: {
          match_count: number;
          match_threshold: number;
          param_database_id: string;
          query_embedding_1536: string;
        };
        Returns: Record<string, unknown>[];
      };
      match_embeddings_1536_v2: {
        Args: {
          param_database_id: string;
          param_embedding: string;
          param_limit: number;
          param_offset: number;
          param_threshold: number;
        };
        Returns: Record<string, unknown>[];
      };
      match_embeddings_384: {
        Args: {
          match_count: number;
          match_threshold: number;
          param_database_id: string;
          query_embedding_384: string;
        };
        Returns: Record<string, unknown>[];
      };
      match_embeddings_384_v2: {
        Args: {
          param_database_id: string;
          param_embedding: string;
          param_limit: number;
          param_offset: number;
          param_threshold: number;
        };
        Returns: Record<string, unknown>[];
      };
      match_embeddings_768: {
        Args: {
          match_count: number;
          match_threshold: number;
          param_database_id: string;
          query_embedding_768: string;
        };
        Returns: Record<string, unknown>[];
      };
      match_embeddings_768_v2: {
        Args: {
          param_database_id: string;
          param_embedding: string;
          param_limit: number;
          param_offset: number;
          param_threshold: number;
        };
        Returns: Record<string, unknown>[];
      };
      reissue_password_reset_key: {
        Args: { new_reset_key: string; target_user_id: string };
        Returns: string;
      };
      release_storage_file_lock: {
        Args: { p_bucket: string; p_path: string; p_token: string };
        Returns: undefined;
      };
      renew_background_task: {
        Args: { p_owner_token: string; p_task_id: string };
        Returns: boolean;
      };
      replace_file_index: {
        Args: {
          p_chunks: Json;
          p_embedding_dimension: number;
          p_keyword: boolean;
          p_mime_type: string;
          p_name: string;
          p_repository_id: string;
          p_url: string;
        };
        Returns: undefined;
      };
      save_agent_with_mcp_credentials: {
        Args: {
          p_agent_id: string;
          p_config: Json;
          p_copy_agent_id?: string;
          p_copy_workspace_id?: string;
          p_description: string;
          p_expected_workspace_id?: string;
          p_name: string;
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      supabase_url: { Args: Record<PropertyKey, never>; Returns: string };
      update_external_ai_model: {
        Args: {
          api_key: string;
          base_url: string;
          external_model_id: string;
          provider: string;
          region?: string;
          target_model_id: string;
        };
        Returns: undefined;
      };
      upsert_current_streams: {
        Args: { p_box_id: string; p_model_identifier: string };
        Returns: undefined;
      };
    };
    Enums: {
      activity_type: "chat" | "transcribe";
      activity_worker_state: "pending" | "running" | "success" | "error";
      ai_model_type:
        | "ollama_llm_v1"
        | "ollama_embedding_v1"
        | "mlx_whisper_v1"
        | "external_llm_v1";
      box_xrag_action_state: "pending" | "running" | "success" | "error";
      chatbot_endpoint_visibility: "draft" | "internal" | "public";
      chatbot_visibility: "public" | "users" | "editors";
      user_role: "admin" | "editor" | "user" | "workspace-admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      activity_type: ["chat", "transcribe"],
      activity_worker_state: ["pending", "running", "success", "error"],
      ai_model_type: [
        "ollama_llm_v1",
        "ollama_embedding_v1",
        "mlx_whisper_v1",
        "external_llm_v1",
      ],
      box_xrag_action_state: ["pending", "running", "success", "error"],
      chatbot_endpoint_visibility: ["draft", "internal", "public"],
      chatbot_visibility: ["public", "users", "editors"],
      user_role: ["admin", "editor", "user", "workspace-admin"],
    },
  },
} as const;
