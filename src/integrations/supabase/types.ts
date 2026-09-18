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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ao_comments: {
        Row: {
          ao_id: string
          author_user_id: string
          body: string
          created_at: string
          deleted_at: string | null
          id: string
          updated_at: string
        }
        Insert: {
          ao_id: string
          author_user_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          ao_id?: string
          author_user_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ao_comments_ao_id_fkey"
            columns: ["ao_id"]
            isOneToOne: false
            referencedRelation: "appels_offres"
            referencedColumns: ["id"]
          },
        ]
      }
      ao_documents: {
        Row: {
          ao_id: string
          created_at: string
          fichier_url: string | null
          id: string
          mime_type: string | null
          nom_fichier: string
          notes: string | null
          storage_path: string | null
          taille_octets: number | null
          type: string
          updated_at: string
          uploaded_by: string | null
          uploaded_by_email: string | null
          version: number
        }
        Insert: {
          ao_id: string
          created_at?: string
          fichier_url?: string | null
          id?: string
          mime_type?: string | null
          nom_fichier: string
          notes?: string | null
          storage_path?: string | null
          taille_octets?: number | null
          type?: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_email?: string | null
          version?: number
        }
        Update: {
          ao_id?: string
          created_at?: string
          fichier_url?: string | null
          id?: string
          mime_type?: string | null
          nom_fichier?: string
          notes?: string | null
          storage_path?: string | null
          taille_octets?: number | null
          type?: string
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_email?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ao_documents_ao_id_fkey"
            columns: ["ao_id"]
            isOneToOne: false
            referencedRelation: "appels_offres"
            referencedColumns: ["id"]
          },
        ]
      }
      ao_lots: {
        Row: {
          ao_id: string
          created_at: string
          designation: string
          id: string
          montant_estime: number | null
          numero_lot: string
          ordre: number
          updated_at: string
        }
        Insert: {
          ao_id: string
          created_at?: string
          designation?: string
          id?: string
          montant_estime?: number | null
          numero_lot: string
          ordre?: number
          updated_at?: string
        }
        Update: {
          ao_id?: string
          created_at?: string
          designation?: string
          id?: string
          montant_estime?: number | null
          numero_lot?: string
          ordre?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ao_lots_ao_id_fkey"
            columns: ["ao_id"]
            isOneToOne: false
            referencedRelation: "appels_offres"
            referencedColumns: ["id"]
          },
        ]
      }
      ao_reponse_lignes: {
        Row: {
          bpu_ligne_id: string | null
          created_at: string
          designation: string
          id: string
          montant: number
          numero_prix: string
          ordre: number
          pu_ht: number
          quantite: number
          reponse_id: string
          unite: string | null
          updated_at: string
        }
        Insert: {
          bpu_ligne_id?: string | null
          created_at?: string
          designation?: string
          id?: string
          montant?: number
          numero_prix?: string
          ordre?: number
          pu_ht?: number
          quantite?: number
          reponse_id: string
          unite?: string | null
          updated_at?: string
        }
        Update: {
          bpu_ligne_id?: string | null
          created_at?: string
          designation?: string
          id?: string
          montant?: number
          numero_prix?: string
          ordre?: number
          pu_ht?: number
          quantite?: number
          reponse_id?: string
          unite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ao_reponse_lignes_bpu_ligne_id_fkey"
            columns: ["bpu_ligne_id"]
            isOneToOne: false
            referencedRelation: "bpu_lignes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ao_reponse_lignes_reponse_id_fkey"
            columns: ["reponse_id"]
            isOneToOne: false
            referencedRelation: "ao_reponses"
            referencedColumns: ["id"]
          },
        ]
      }
      ao_reponses: {
        Row: {
          ao_id: string
          catalogue_id: string | null
          created_at: string
          id: string
          libelle: string
          lot_id: string | null
          montant_retenu: number | null
          notes: string | null
          source_fichier: string | null
          statut: string
          updated_at: string
          version: number
        }
        Insert: {
          ao_id: string
          catalogue_id?: string | null
          created_at?: string
          id?: string
          libelle?: string
          lot_id?: string | null
          montant_retenu?: number | null
          notes?: string | null
          source_fichier?: string | null
          statut?: string
          updated_at?: string
          version?: number
        }
        Update: {
          ao_id?: string
          catalogue_id?: string | null
          created_at?: string
          id?: string
          libelle?: string
          lot_id?: string | null
          montant_retenu?: number | null
          notes?: string | null
          source_fichier?: string | null
          statut?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ao_reponses_ao_id_fkey"
            columns: ["ao_id"]
            isOneToOne: false
            referencedRelation: "appels_offres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ao_reponses_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "bpu_catalogues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ao_reponses_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "ao_lots"
            referencedColumns: ["id"]
          },
        ]
      }
      ao_secteurs: {
        Row: {
          ao_id: string
          bail_date_debut: string | null
          bail_date_fin: string | null
          bail_duree_mois: number | null
          created_at: string
          id: string
          nature_marche: string
          prestations: string[]
          secteur: string
          updated_at: string
        }
        Insert: {
          ao_id: string
          bail_date_debut?: string | null
          bail_date_fin?: string | null
          bail_duree_mois?: number | null
          created_at?: string
          id?: string
          nature_marche: string
          prestations?: string[]
          secteur: string
          updated_at?: string
        }
        Update: {
          ao_id?: string
          bail_date_debut?: string | null
          bail_date_fin?: string | null
          bail_duree_mois?: number | null
          created_at?: string
          id?: string
          nature_marche?: string
          prestations?: string[]
          secteur?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ao_secteurs_ao_id_fkey"
            columns: ["ao_id"]
            isOneToOne: false
            referencedRelation: "appels_offres"
            referencedColumns: ["id"]
          },
        ]
      }
      ce_dossiers: {
        Row: {
          activite: string | null
          ca_estime: number | null
          created_at: string
          created_by: string | null
          date_closing_cible: string | null
          date_detection: string | null
          date_echeance_offre: string | null
          ebitda_estime: number | null
          effectif: number | null
          id: string
          interlocuteur: string | null
          lieu: string | null
          nom_cible: string
          notes: string | null
          reference: string
          situation_juridique: string
          societe_acheteuse_id: string | null
          statut: string
          titre: string
          updated_at: string
          valorisation_estimee: number | null
        }
        Insert: {
          activite?: string | null
          ca_estime?: number | null
          created_at?: string
          created_by?: string | null
          date_closing_cible?: string | null
          date_detection?: string | null
          date_echeance_offre?: string | null
          ebitda_estime?: number | null
          effectif?: number | null
          id?: string
          interlocuteur?: string | null
          lieu?: string | null
          nom_cible: string
          notes?: string | null
          reference: string
          situation_juridique?: string
          societe_acheteuse_id?: string | null
          statut?: string
          titre: string
          updated_at?: string
          valorisation_estimee?: number | null
        }
        Update: {
          activite?: string | null
          ca_estime?: number | null
          created_at?: string
          created_by?: string | null
          date_closing_cible?: string | null
          date_detection?: string | null
          date_echeance_offre?: string | null
          ebitda_estime?: number | null
          effectif?: number | null
          id?: string
          interlocuteur?: string | null
          lieu?: string | null
          nom_cible?: string
          notes?: string | null
          reference?: string
          situation_juridique?: string
          societe_acheteuse_id?: string | null
          statut?: string
          titre?: string
          updated_at?: string
          valorisation_estimee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ce_dossiers_societe_acheteuse_id_fkey"
            columns: ["societe_acheteuse_id"]
            isOneToOne: false
            referencedRelation: "societes_exploitation"
            referencedColumns: ["id"]
          },
        ]
      }
      appels_offres: {
        Row: {
          chantier_erp_id: string | null
          created_at: string
          created_by: string | null
          date_limite_depot: string | null
          date_publication: string | null
          donneur_ordre_id: string | null
          donneur_ordre_libre: string | null
          handoff_at: string | null
          id: string
          lieu: string | null
          marche_pluriannuel: boolean
          montant_estime: number | null
          notes: string | null
          reference: string
          societe_attribuee_id: string | null
          statut: string
          titre: string
          type_marche: string | null
          updated_at: string
        }
        Insert: {
          chantier_erp_id?: string | null
          created_at?: string
          created_by?: string | null
          date_limite_depot?: string | null
          date_publication?: string | null
          donneur_ordre_id?: string | null
          donneur_ordre_libre?: string | null
          handoff_at?: string | null
          id?: string
          lieu?: string | null
          marche_pluriannuel?: boolean
          montant_estime?: number | null
          notes?: string | null
          reference: string
          societe_attribuee_id?: string | null
          statut?: string
          titre: string
          type_marche?: string | null
          updated_at?: string
        }
        Update: {
          chantier_erp_id?: string | null
          created_at?: string
          created_by?: string | null
          date_limite_depot?: string | null
          date_publication?: string | null
          donneur_ordre_id?: string | null
          donneur_ordre_libre?: string | null
          handoff_at?: string | null
          id?: string
          lieu?: string | null
          marche_pluriannuel?: boolean
          montant_estime?: number | null
          notes?: string | null
          reference?: string
          societe_attribuee_id?: string | null
          statut?: string
          titre?: string
          type_marche?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appels_offres_donneur_ordre_id_fkey"
            columns: ["donneur_ordre_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appels_offres_societe_attribuee_id_fkey"
            columns: ["societe_attribuee_id"]
            isOneToOne: false
            referencedRelation: "societes_exploitation"
            referencedColumns: ["id"]
          },
        ]
      }
      bpu_catalogues: {
        Row: {
          actif: boolean
          client_id: string | null
          created_at: string
          id: string
          nom: string
          notes: string | null
          poste_code: string | null
          secteur: string | null
          source_fichier: string | null
          type: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          client_id?: string | null
          created_at?: string
          id?: string
          nom: string
          notes?: string | null
          poste_code?: string | null
          secteur?: string | null
          source_fichier?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          client_id?: string | null
          created_at?: string
          id?: string
          nom?: string
          notes?: string | null
          poste_code?: string | null
          secteur?: string | null
          source_fichier?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bpu_catalogues_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      bpu_lignes: {
        Row: {
          catalogue_id: string
          created_at: string
          designation: string
          id: string
          niveau: string
          numero_prix: string
          ordre: number
          parent_numero: string | null
          poste_code: string | null
          pu_ht: number | null
          unite: string | null
          updated_at: string
        }
        Insert: {
          catalogue_id: string
          created_at?: string
          designation: string
          id?: string
          niveau?: string
          numero_prix: string
          ordre?: number
          parent_numero?: string | null
          poste_code?: string | null
          pu_ht?: number | null
          unite?: string | null
          updated_at?: string
        }
        Update: {
          catalogue_id?: string
          created_at?: string
          designation?: string
          id?: string
          niveau?: string
          numero_prix?: string
          ordre?: number
          parent_numero?: string | null
          poste_code?: string | null
          pu_ht?: number | null
          unite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bpu_lignes_catalogue_id_fkey"
            columns: ["catalogue_id"]
            isOneToOne: false
            referencedRelation: "bpu_catalogues"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          adresse: string | null
          agence: string | null
          code_entreprise: string | null
          contact: string | null
          created_at: string
          email: string | null
          erp_client_id: string | null
          fonction: string | null
          id: string
          nom_entreprise: string
          secteur: string | null
          telephone: string | null
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          agence?: string | null
          code_entreprise?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          erp_client_id?: string | null
          fonction?: string | null
          id?: string
          nom_entreprise: string
          secteur?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          agence?: string | null
          code_entreprise?: string | null
          contact?: string | null
          created_at?: string
          email?: string | null
          erp_client_id?: string | null
          fonction?: string | null
          id?: string
          nom_entreprise?: string
          secteur?: string | null
          telephone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commerce_allowed_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      commerce_account_manager_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      commerce_user_module_access: {
        Row: {
          created_at: string
          id: string
          module: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          module: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          module?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      commerce_profiles: {
        Row: {
          created_at: string
          nom: string | null
          prenom: string | null
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          nom?: string | null
          prenom?: string | null
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          nom?: string | null
          prenom?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commerce_settings: {
        Row: {
          id: number
          last_erp_sync_at: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          last_erp_sync_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          last_erp_sync_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cron_config: {
        Row: {
          created_at: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      erp_cache_clients: {
        Row: {
          id: number
          refreshed_at: string | null
          rows: Json
          updated_at: string
        }
        Insert: {
          id?: number
          refreshed_at?: string | null
          rows?: Json
          updated_at?: string
        }
        Update: {
          id?: number
          refreshed_at?: string | null
          rows?: Json
          updated_at?: string
        }
        Relationships: []
      }
      erp_cache_employes: {
        Row: {
          id: number
          refreshed_at: string | null
          rows: Json
          updated_at: string
        }
        Insert: {
          id?: number
          refreshed_at?: string | null
          rows?: Json
          updated_at?: string
        }
        Update: {
          id?: number
          refreshed_at?: string | null
          rows?: Json
          updated_at?: string
        }
        Relationships: []
      }
      erp_cache_fournisseurs: {
        Row: {
          id: number
          refreshed_at: string | null
          rows: Json
          updated_at: string
        }
        Insert: {
          id?: number
          refreshed_at?: string | null
          rows?: Json
          updated_at?: string
        }
        Update: {
          id?: number
          refreshed_at?: string | null
          rows?: Json
          updated_at?: string
        }
        Relationships: []
      }
      erp_cache_sync_runs: {
        Row: {
          created_at: string
          details: Json
          id: string
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          source: string
          status: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      fournisseurs_commerciaux: {
        Row: {
          actif: boolean
          contacts_json: Json
          created_at: string
          erp_fournisseur_id: string | null
          id: string
          nom: string
          notes: string | null
          siret: string | null
          specialites: string[]
          updated_at: string
        }
        Insert: {
          actif?: boolean
          contacts_json?: Json
          created_at?: string
          erp_fournisseur_id?: string | null
          id?: string
          nom: string
          notes?: string | null
          siret?: string | null
          specialites?: string[]
          updated_at?: string
        }
        Update: {
          actif?: boolean
          contacts_json?: Json
          created_at?: string
          erp_fournisseur_id?: string | null
          id?: string
          nom?: string
          notes?: string | null
          siret?: string | null
          specialites?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      memoires_techniques: {
        Row: {
          ao_id: string
          contenu_json: Json
          created_at: string
          id: string
          statut: string
          titre: string
          updated_at: string
          version: number
        }
        Insert: {
          ao_id: string
          contenu_json?: Json
          created_at?: string
          id?: string
          statut?: string
          titre?: string
          updated_at?: string
          version?: number
        }
        Update: {
          ao_id?: string
          contenu_json?: Json
          created_at?: string
          id?: string
          statut?: string
          titre?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "memoires_techniques_ao_id_fkey"
            columns: ["ao_id"]
            isOneToOne: false
            referencedRelation: "appels_offres"
            referencedColumns: ["id"]
          },
        ]
      }
      prospection_commune_suivi: {
        Row: {
          commune_key: string
          contact: string
          contacts_json: Json
          gestion: string | null
          notes: string
          prestataire: string
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commune_key: string
          contact?: string
          contacts_json?: Json
          gestion?: string | null
          notes?: string
          prestataire?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commune_key?: string
          contact?: string
          contacts_json?: Json
          gestion?: string | null
          notes?: string
          prestataire?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      prospection_suivi: {
        Row: {
          commune_key: string
          created_at: string
          departement: string | null
          id: string
          notes: string
          prochaine_action: string | null
          qui_cible: string
          statut: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commune_key: string
          created_at?: string
          departement?: string | null
          id?: string
          notes?: string
          prochaine_action?: string | null
          qui_cible?: string
          statut?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commune_key?: string
          created_at?: string
          departement?: string | null
          id?: string
          notes?: string
          prochaine_action?: string | null
          qui_cible?: string
          statut?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      societes_exploitation: {
        Row: {
          actif: boolean
          code: string
          created_at: string
          erp_bridge_key_env: string | null
          erp_bridge_url: string | null
          groupe: string
          id: string
          nom: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          code: string
          created_at?: string
          erp_bridge_key_env?: string | null
          erp_bridge_url?: string | null
          groupe?: string
          id?: string
          nom: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          code?: string
          created_at?: string
          erp_bridge_key_env?: string | null
          erp_bridge_url?: string | null
          groupe?: string
          id?: string
          nom?: string
          updated_at?: string
        }
        Relationships: []
      }
      veille_annonces: {
        Row: {
          acheteur: string | null
          ao_id: string | null
          cpv: string | null
          created_at: string
          date_limite: string | null
          date_parution: string | null
          departement: string | null
          domaines: string[]
          id: string
          intitule: string
          lien: string | null
          raw: Json
          secteurs: string[]
          source: string
          source_id: string
          statut: string
          updated_at: string
        }
        Insert: {
          acheteur?: string | null
          ao_id?: string | null
          cpv?: string | null
          created_at?: string
          date_limite?: string | null
          date_parution?: string | null
          departement?: string | null
          domaines?: string[]
          id?: string
          intitule?: string
          lien?: string | null
          raw?: Json
          secteurs?: string[]
          source?: string
          source_id: string
          statut?: string
          updated_at?: string
        }
        Update: {
          acheteur?: string | null
          ao_id?: string | null
          cpv?: string | null
          created_at?: string
          date_limite?: string | null
          date_parution?: string | null
          departement?: string | null
          domaines?: string[]
          id?: string
          intitule?: string
          lien?: string | null
          raw?: Json
          secteurs?: string[]
          source?: string
          source_id?: string
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "veille_annonces_ao_id_fkey"
            columns: ["ao_id"]
            isOneToOne: false
            referencedRelation: "appels_offres"
            referencedColumns: ["id"]
          },
        ]
      }
      veille_digest_runs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          inserted_count: number
          new_count: number
          recipients_count: number
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          inserted_count?: number
          new_count?: number
          recipients_count?: number
          status?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          inserted_count?: number
          new_count?: number
          recipients_count?: number
          status?: string
        }
        Relationships: []
      }
      veille_email_recipients: {
        Row: {
          actif: boolean
          created_at: string
          email: string
          id: string
          nom: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          email: string
          id?: string
          nom?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          email?: string
          id?: string
          nom?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      commerce_can_edit_module: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      commerce_can_manage_accounts: {
        Args: { _user_id?: string }
        Returns: boolean
      }
      commerce_can_read_module: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      commerce_get_my_editor_modules: { Args: never; Returns: string[] }
      commerce_get_my_modules: { Args: never; Returns: string[] }
      commerce_get_my_session: { Args: never; Returns: Json }
      commerce_has_access: { Args: never; Returns: boolean }
      commerce_has_module_access: {
        Args: { _module: string; _user_id: string }
        Returns: boolean
      }
      commerce_has_module_restriction: {
        Args: { _user_id: string }
        Returns: boolean
      }
      commerce_is_account_manager: {
        Args: { _user_id: string }
        Returns: boolean
      }
      commerce_list_accounts: {
        Args: never
        Returns: {
          allowed_at: string
          email: string
          has_auth_user: boolean
          last_sign_in_at: string | null
          module_roles: Json
          nom: string | null
          prenom: string | null
          telephone: string | null
          user_id: string | null
        }[]
      }
      commerce_set_user_module_roles: {
        Args: { p_module_roles: Json; p_user_id: string }
        Returns: undefined
      }
      get_ao_comments: {
        Args: { p_ao_id: string; p_limit?: number }
        Returns: {
          ao_id: string
          author_nom: string
          author_prenom: string
          author_user_id: string
          body: string
          created_at: string
          id: string
        }[]
      }
      import_ao_reponse_lignes: {
        Args: { p_lignes: Json; p_replace?: boolean; p_reponse_id: string }
        Returns: number
      }
      import_bpu_lignes: {
        Args: { p_catalogue_id: string; p_lignes: Json }
        Returns: number
      }
      post_ao_comment: {
        Args: { p_ao_id: string; p_body: string }
        Returns: string
      }
      recalc_ao_reponse_montant: {
        Args: { p_reponse_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
