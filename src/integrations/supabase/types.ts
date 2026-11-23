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
    PostgrestVersion: "14.17"
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
      appels_offres: {
        Row: {
          annonce_url: string | null
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
          sharepoint_url: string | null
          societe_attribuee_id: string | null
          statut: string
          titre: string
          type_marche: string | null
          updated_at: string
        }
        Insert: {
          annonce_url?: string | null
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
          sharepoint_url?: string | null
          societe_attribuee_id?: string | null
          statut?: string
          titre: string
          type_marche?: string | null
          updated_at?: string
        }
        Update: {
          annonce_url?: string | null
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
          sharepoint_url?: string | null
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
      chat_conversations: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          titre: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          titre?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          titre?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chiffrage_parametres: {
        Row: {
          activite: string
          cle: string
          created_at: string
          id: string
          libelle: string
          unite: string | null
          updated_at: string
          valeur: number
        }
        Insert: {
          activite: string
          cle: string
          created_at?: string
          id?: string
          libelle: string
          unite?: string | null
          updated_at?: string
          valeur: number
        }
        Update: {
          activite?: string
          cle?: string
          created_at?: string
          id?: string
          libelle?: string
          unite?: string | null
          updated_at?: string
          valeur?: number
        }
        Relationships: []
      }
      chiffrage_postes: {
        Row: {
          aleas_ht: number | null
          created_at: string
          decomposition_origine: string | null
          designation: string
          detail: string | null
          dimensions: Json
          famille: string | null
          feuille: string | null
          fichier: string | null
          fournisseur: string | null
          fourniture_ht: number | null
          frais_generaux_ht: number | null
          heures_mo: number | null
          id: string
          ligne: number | null
          marge_nette_ht: number | null
          mo_ht: number | null
          montant_ht: number | null
          numero: string | null
          ordre: number
          pu_brouillon_ht: number | null
          pu_ht: number | null
          quantite: number | null
          section: string | null
          source_id: string
          sous_traitance_ht: number | null
          sous_traitant: string | null
          unite: string | null
          updated_at: string
        }
        Insert: {
          aleas_ht?: number | null
          created_at?: string
          decomposition_origine?: string | null
          designation: string
          detail?: string | null
          dimensions?: Json
          famille?: string | null
          feuille?: string | null
          fichier?: string | null
          fournisseur?: string | null
          fourniture_ht?: number | null
          frais_generaux_ht?: number | null
          heures_mo?: number | null
          id?: string
          ligne?: number | null
          marge_nette_ht?: number | null
          mo_ht?: number | null
          montant_ht?: number | null
          numero?: string | null
          ordre?: number
          pu_brouillon_ht?: number | null
          pu_ht?: number | null
          quantite?: number | null
          section?: string | null
          source_id: string
          sous_traitance_ht?: number | null
          sous_traitant?: string | null
          unite?: string | null
          updated_at?: string
        }
        Update: {
          aleas_ht?: number | null
          created_at?: string
          decomposition_origine?: string | null
          designation?: string
          detail?: string | null
          dimensions?: Json
          famille?: string | null
          feuille?: string | null
          fichier?: string | null
          fournisseur?: string | null
          fourniture_ht?: number | null
          frais_generaux_ht?: number | null
          heures_mo?: number | null
          id?: string
          ligne?: number | null
          marge_nette_ht?: number | null
          mo_ht?: number | null
          montant_ht?: number | null
          numero?: string | null
          ordre?: number
          pu_brouillon_ht?: number | null
          pu_ht?: number | null
          quantite?: number | null
          section?: string | null
          source_id?: string
          sous_traitance_ht?: number | null
          sous_traitant?: string | null
          unite?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chiffrage_postes_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "chiffrage_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      chiffrage_sources: {
        Row: {
          activite: string
          annee: number | null
          ao_id: string | null
          client: string | null
          code: string
          created_at: string
          fichier_decomposition: string | null
          fichier_reponse: string | null
          id: string
          nom: string
          note: string | null
          updated_at: string
        }
        Insert: {
          activite?: string
          annee?: number | null
          ao_id?: string | null
          client?: string | null
          code: string
          created_at?: string
          fichier_decomposition?: string | null
          fichier_reponse?: string | null
          id?: string
          nom: string
          note?: string | null
          updated_at?: string
        }
        Update: {
          activite?: string
          annee?: number | null
          ao_id?: string | null
          client?: string | null
          code?: string
          created_at?: string
          fichier_decomposition?: string | null
          fichier_reponse?: string | null
          id?: string
          nom?: string
          note?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chiffrage_sources_ao_id_fkey"
            columns: ["ao_id"]
            isOneToOne: false
            referencedRelation: "appels_offres"
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
      daf_allowed_emails: {
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
      daf_cca_forecast: {
        Row: {
          account_label: string
          account_number: string
          amount: number
          created_at: string
          id: string
          kind: string
          month_key: string
          notes: string | null
          societe_id: string | null
          updated_at: string
        }
        Insert: {
          account_label: string
          account_number: string
          amount?: number
          created_at?: string
          id?: string
          kind: string
          month_key: string
          notes?: string | null
          societe_id?: string | null
          updated_at?: string
        }
        Update: {
          account_label?: string
          account_number?: string
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          month_key?: string
          notes?: string | null
          societe_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_cca_forecast_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_client_payment_terms: {
        Row: {
          active: boolean
          client_name: string
          created_at: string
          delay_days: number
          id: string
          payment_terms_label: string
          societe_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          client_name: string
          created_at?: string
          delay_days?: number
          id?: string
          payment_terms_label?: string
          societe_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          client_name?: string
          created_at?: string
          delay_days?: number
          id?: string
          payment_terms_label?: string
          societe_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_client_payment_terms_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_cost_killing_levers: {
        Row: {
          account_label: string | null
          account_number: string | null
          active: boolean
          created_at: string
          expected_monthly_saving: number
          id: string
          lever_name: string
          notes: string | null
          reduction_percent: number
          societe_id: string | null
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          account_number?: string | null
          active?: boolean
          created_at?: string
          expected_monthly_saving?: number
          id?: string
          lever_name: string
          notes?: string | null
          reduction_percent?: number
          societe_id?: string | null
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          account_number?: string | null
          active?: boolean
          created_at?: string
          expected_monthly_saving?: number
          id?: string
          lever_name?: string
          notes?: string | null
          reduction_percent?: number
          societe_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_cost_killing_levers_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_deals: {
        Row: {
          acquereur_entite_id: string | null
          cible_entite_id: string
          complement_prix: number
          created_at: string
          date_closing: string | null
          date_complement_prix: string | null
          dette_nette_reprise: number | null
          ebe_reference: number | null
          frais_acquisition: number
          id: string
          mode: string | null
          nom: string
          notes: string | null
          pct_capital_vise: number | null
          prix: number
          probabilite: number
          scenario_id: string | null
          statut: string
          updated_at: string
        }
        Insert: {
          acquereur_entite_id?: string | null
          cible_entite_id: string
          complement_prix?: number
          created_at?: string
          date_closing?: string | null
          date_complement_prix?: string | null
          dette_nette_reprise?: number | null
          ebe_reference?: number | null
          frais_acquisition?: number
          id?: string
          mode?: string | null
          nom: string
          notes?: string | null
          pct_capital_vise?: number | null
          prix?: number
          probabilite?: number
          scenario_id?: string | null
          statut?: string
          updated_at?: string
        }
        Update: {
          acquereur_entite_id?: string | null
          cible_entite_id?: string
          complement_prix?: number
          created_at?: string
          date_closing?: string | null
          date_complement_prix?: string | null
          dette_nette_reprise?: number | null
          ebe_reference?: number | null
          frais_acquisition?: number
          id?: string
          mode?: string | null
          nom?: string
          notes?: string | null
          pct_capital_vise?: number | null
          prix?: number
          probabilite?: number
          scenario_id?: string | null
          statut?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_deals_acquereur_entite_id_fkey"
            columns: ["acquereur_entite_id"]
            isOneToOne: false
            referencedRelation: "daf_entites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_deals_cible_entite_id_fkey"
            columns: ["cible_entite_id"]
            isOneToOne: false
            referencedRelation: "daf_entites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_deals_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "daf_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_entites: {
        Row: {
          code: string
          created_at: string
          daf_societe_id: string | null
          date_entree: string | null
          date_sortie: string | null
          forme_juridique: string | null
          id: string
          nom: string
          notes: string | null
          perimetre: string
          secteur: string | null
          siren: string | null
          type: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          daf_societe_id?: string | null
          date_entree?: string | null
          date_sortie?: string | null
          forme_juridique?: string | null
          id?: string
          nom: string
          notes?: string | null
          perimetre?: string
          secteur?: string | null
          siren?: string | null
          type?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          daf_societe_id?: string | null
          date_entree?: string | null
          date_sortie?: string | null
          forme_juridique?: string | null
          id?: string
          nom?: string
          notes?: string | null
          perimetre?: string
          secteur?: string | null
          siren?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_entites_daf_societe_id_fkey"
            columns: ["daf_societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_financements: {
        Row: {
          amortissement: string
          apporteur_entite_id: string | null
          created_at: string
          date_versement: string
          deal_id: string | null
          differe_mois: number
          duree_mois: number | null
          id: string
          montant: number
          notes: string | null
          porteur_entite_id: string
          preteur: string | null
          scenario_id: string | null
          taux_annuel: number
          type: string
          updated_at: string
        }
        Insert: {
          amortissement?: string
          apporteur_entite_id?: string | null
          created_at?: string
          date_versement: string
          deal_id?: string | null
          differe_mois?: number
          duree_mois?: number | null
          id?: string
          montant: number
          notes?: string | null
          porteur_entite_id: string
          preteur?: string | null
          scenario_id?: string | null
          taux_annuel?: number
          type: string
          updated_at?: string
        }
        Update: {
          amortissement?: string
          apporteur_entite_id?: string | null
          created_at?: string
          date_versement?: string
          deal_id?: string | null
          differe_mois?: number
          duree_mois?: number | null
          id?: string
          montant?: number
          notes?: string | null
          porteur_entite_id?: string
          preteur?: string | null
          scenario_id?: string | null
          taux_annuel?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_financements_apporteur_entite_id_fkey"
            columns: ["apporteur_entite_id"]
            isOneToOne: false
            referencedRelation: "daf_entites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_financements_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "daf_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_financements_porteur_entite_id_fkey"
            columns: ["porteur_entite_id"]
            isOneToOne: false
            referencedRelation: "daf_entites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_financements_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "daf_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_forecast_opex_lines: {
        Row: {
          account_label: string
          account_number: string
          amount: number
          created_at: string
          id: string
          month_key: string
          notes: string | null
          societe_id: string | null
          source: string
          updated_at: string
        }
        Insert: {
          account_label: string
          account_number: string
          amount?: number
          created_at?: string
          id?: string
          month_key: string
          notes?: string | null
          societe_id?: string | null
          source?: string
          updated_at?: string
        }
        Update: {
          account_label?: string
          account_number?: string
          amount?: number
          created_at?: string
          id?: string
          month_key?: string
          notes?: string | null
          societe_id?: string | null
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_forecast_opex_lines_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_participations: {
        Row: {
          created_at: string
          date_effet: string
          date_fin: string | null
          deal_id: string | null
          detenteur_entite_id: string
          detenue_entite_id: string
          id: string
          nature: string
          nb_titres: number | null
          notes: string | null
          pct_capital: number
          pct_dividendes: number | null
          pct_votes: number | null
          prix_revient: number | null
          scenario_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_effet: string
          date_fin?: string | null
          deal_id?: string | null
          detenteur_entite_id: string
          detenue_entite_id: string
          id?: string
          nature?: string
          nb_titres?: number | null
          notes?: string | null
          pct_capital: number
          pct_dividendes?: number | null
          pct_votes?: number | null
          prix_revient?: number | null
          scenario_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_effet?: string
          date_fin?: string | null
          deal_id?: string | null
          detenteur_entite_id?: string
          detenue_entite_id?: string
          id?: string
          nature?: string
          nb_titres?: number | null
          notes?: string | null
          pct_capital?: number
          pct_dividendes?: number | null
          pct_votes?: number | null
          prix_revient?: number | null
          scenario_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_participations_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "daf_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_participations_detenteur_entite_id_fkey"
            columns: ["detenteur_entite_id"]
            isOneToOne: false
            referencedRelation: "daf_entites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_participations_detenue_entite_id_fkey"
            columns: ["detenue_entite_id"]
            isOneToOne: false
            referencedRelation: "daf_entites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_participations_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "daf_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_payroll_assumptions: {
        Row: {
          mutuelle_rate: number
          retraite_rate: number
          societe_id: string
          updated_at: string
          urssaf_rate: number
        }
        Insert: {
          mutuelle_rate?: number
          retraite_rate?: number
          societe_id: string
          updated_at?: string
          urssaf_rate?: number
        }
        Update: {
          mutuelle_rate?: number
          retraite_rate?: number
          societe_id?: string
          updated_at?: string
          urssaf_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "daf_payroll_assumptions_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_payroll_lines: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          effective_from: string | null
          effective_to: string | null
          full_name: string
          id: string
          net_monthly: number
          sector: string | null
          societe_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          full_name: string
          id?: string
          net_monthly?: number
          sector?: string | null
          societe_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          full_name?: string
          id?: string
          net_monthly?: number
          sector?: string | null
          societe_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_payroll_lines_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_pnl_budget_lines: {
        Row: {
          account_label: string
          account_number: string
          category: string | null
          created_at: string
          id: string
          month_key: string
          notes: string | null
          planned_amount: number
          societe_id: string | null
          updated_at: string
        }
        Insert: {
          account_label: string
          account_number: string
          category?: string | null
          created_at?: string
          id?: string
          month_key: string
          notes?: string | null
          planned_amount?: number
          societe_id?: string | null
          updated_at?: string
        }
        Update: {
          account_label?: string
          account_number?: string
          category?: string | null
          created_at?: string
          id?: string
          month_key?: string
          notes?: string | null
          planned_amount?: number
          societe_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_pnl_budget_lines_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_politiques_remontee: {
        Row: {
          beneficiaire_fees_entite_id: string | null
          created_at: string
          entite_id: string
          id: string
          mois_distribution: number
          multiple_ebe: number
          notes: string | null
          scenario_id: string
          taux_distribution: number
          taux_is: number
          updated_at: string
        }
        Insert: {
          beneficiaire_fees_entite_id?: string | null
          created_at?: string
          entite_id: string
          id?: string
          mois_distribution?: number
          multiple_ebe?: number
          notes?: string | null
          scenario_id: string
          taux_distribution?: number
          taux_is?: number
          updated_at?: string
        }
        Update: {
          beneficiaire_fees_entite_id?: string | null
          created_at?: string
          entite_id?: string
          id?: string
          mois_distribution?: number
          multiple_ebe?: number
          notes?: string | null
          scenario_id?: string
          taux_distribution?: number
          taux_is?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_politiques_remontee_beneficiaire_fees_entite_id_fkey"
            columns: ["beneficiaire_fees_entite_id"]
            isOneToOne: false
            referencedRelation: "daf_entites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_politiques_remontee_entite_id_fkey"
            columns: ["entite_id"]
            isOneToOne: false
            referencedRelation: "daf_entites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_politiques_remontee_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "daf_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_previsions_entites: {
        Row: {
          achats_sous_traitance: number
          autres_charges: number
          ca: number
          capex: number
          created_at: string
          dotations: number
          entite_id: string
          id: string
          management_fees: number
          masse_salariale: number
          month_key: string
          notes: string | null
          scenario_id: string
          updated_at: string
          variation_bfr: number
        }
        Insert: {
          achats_sous_traitance?: number
          autres_charges?: number
          ca?: number
          capex?: number
          created_at?: string
          dotations?: number
          entite_id: string
          id?: string
          management_fees?: number
          masse_salariale?: number
          month_key: string
          notes?: string | null
          scenario_id: string
          updated_at?: string
          variation_bfr?: number
        }
        Update: {
          achats_sous_traitance?: number
          autres_charges?: number
          ca?: number
          capex?: number
          created_at?: string
          dotations?: number
          entite_id?: string
          id?: string
          management_fees?: number
          masse_salariale?: number
          month_key?: string
          notes?: string | null
          scenario_id?: string
          updated_at?: string
          variation_bfr?: number
        }
        Relationships: [
          {
            foreignKeyName: "daf_previsions_entites_entite_id_fkey"
            columns: ["entite_id"]
            isOneToOne: false
            referencedRelation: "daf_entites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daf_previsions_entites_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "daf_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_recurring_payments: {
        Row: {
          account_label: string
          account_number: string
          active: boolean
          amount_ht: number
          amount_ttc: number
          amount_tva: number
          created_at: string
          ends_on: string | null
          id: string
          notes: string | null
          periodicity: string
          provider_name: string
          societe_id: string | null
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          account_label: string
          account_number: string
          active?: boolean
          amount_ht?: number
          amount_ttc?: number
          amount_tva?: number
          created_at?: string
          ends_on?: string | null
          id?: string
          notes?: string | null
          periodicity: string
          provider_name: string
          societe_id?: string | null
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          account_label?: string
          account_number?: string
          active?: boolean
          amount_ht?: number
          amount_ttc?: number
          amount_tva?: number
          created_at?: string
          ends_on?: string | null
          id?: string
          notes?: string | null
          periodicity?: string
          provider_name?: string
          societe_id?: string | null
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_recurring_payments_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_scenarios: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          label: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          label: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      daf_settings: {
        Row: {
          alert_treso_threshold: number
          exercise_end: string | null
          exercise_start: string | null
          societe_id: string
          tva_credit_reported: number
          tva_standard_rate: number
          updated_at: string
        }
        Insert: {
          alert_treso_threshold?: number
          exercise_end?: string | null
          exercise_start?: string | null
          societe_id: string
          tva_credit_reported?: number
          tva_standard_rate?: number
          updated_at?: string
        }
        Update: {
          alert_treso_threshold?: number
          exercise_end?: string | null
          exercise_start?: string | null
          societe_id?: string
          tva_credit_reported?: number
          tva_standard_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_settings_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_societes: {
        Row: {
          actif: boolean
          code: string
          created_at: string
          groupe: string
          id: string
          nom: string
          pennylane_key_env: string
          siren: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          code: string
          created_at?: string
          groupe?: string
          id?: string
          nom: string
          pennylane_key_env: string
          siren?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          code?: string
          created_at?: string
          groupe?: string
          id?: string
          nom?: string
          pennylane_key_env?: string
          siren?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daf_store_snapshots: {
        Row: {
          snapshot: Json
          societe_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          snapshot?: Json
          societe_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          snapshot?: Json
          societe_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daf_store_snapshots_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_treso_flux: {
        Row: {
          affacture: boolean | null
          categorie: string | null
          chantier: string | null
          created_at: string
          date_flux: string | null
          id: string
          libelle: string
          montant_ht: number
          recurrence: string
          recurrence_fin: string | null
          recurrence_mois: number | null
          ref_id: string | null
          sens: string
          societe_id: string
          statut: string | null
          supprime: boolean
          taux_tva: number
          type_client: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          affacture?: boolean | null
          categorie?: string | null
          chantier?: string | null
          created_at?: string
          date_flux?: string | null
          id?: string
          libelle?: string
          montant_ht?: number
          recurrence?: string
          recurrence_fin?: string | null
          recurrence_mois?: number | null
          ref_id?: string | null
          sens?: string
          societe_id: string
          statut?: string | null
          supprime?: boolean
          taux_tva?: number
          type_client?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          affacture?: boolean | null
          categorie?: string | null
          chantier?: string | null
          created_at?: string
          date_flux?: string | null
          id?: string
          libelle?: string
          montant_ht?: number
          recurrence?: string
          recurrence_fin?: string | null
          recurrence_mois?: number | null
          ref_id?: string | null
          sens?: string
          societe_id?: string
          statut?: string | null
          supprime?: boolean
          taux_tva?: number
          type_client?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daf_treso_flux_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_treso_frozen_ref: {
        Row: {
          amount: number
          month_key: string
          societe_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          month_key: string
          societe_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          month_key?: string
          societe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_treso_frozen_ref_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_treso_reglages: {
        Row: {
          reglages: Json
          societe_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          reglages?: Json
          societe_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          reglages?: Json
          societe_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daf_treso_reglages_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      daf_treso_snapshot: {
        Row: {
          closing_balance: number
          month_key: string
          notes: string | null
          opening_balance: number
          refreshed_at: string
          societe_id: string
        }
        Insert: {
          closing_balance?: number
          month_key: string
          notes?: string | null
          opening_balance?: number
          refreshed_at?: string
          societe_id: string
        }
        Update: {
          closing_balance?: number
          month_key?: string
          notes?: string | null
          opening_balance?: number
          refreshed_at?: string
          societe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daf_treso_snapshot_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_cache_bank_summary: {
        Row: {
          payload: Json
          refreshed_at: string | null
          societe_id: string
          updated_at: string
        }
        Insert: {
          payload?: Json
          refreshed_at?: string | null
          societe_id: string
          updated_at?: string
        }
        Update: {
          payload?: Json
          refreshed_at?: string | null
          societe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_cache_bank_summary_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_cache_ca_projete: {
        Row: {
          refreshed_at: string | null
          rows: Json
          societe_id: string
          updated_at: string
        }
        Insert: {
          refreshed_at?: string | null
          rows?: Json
          societe_id: string
          updated_at?: string
        }
        Update: {
          refreshed_at?: string | null
          rows?: Json
          societe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_cache_ca_projete_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_cache_chantiers: {
        Row: {
          refreshed_at: string | null
          rows: Json
          societe_id: string
          updated_at: string
        }
        Insert: {
          refreshed_at?: string | null
          rows?: Json
          societe_id: string
          updated_at?: string
        }
        Update: {
          refreshed_at?: string | null
          rows?: Json
          societe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_cache_chantiers_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_cache_client_invoices: {
        Row: {
          customers_by_id: Json
          invoices: Json
          refreshed_at: string | null
          societe_id: string
          updated_at: string
        }
        Insert: {
          customers_by_id?: Json
          invoices?: Json
          refreshed_at?: string | null
          societe_id: string
          updated_at?: string
        }
        Update: {
          customers_by_id?: Json
          invoices?: Json
          refreshed_at?: string | null
          societe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_cache_client_invoices_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
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
      erp_cache_supplier_invoices: {
        Row: {
          invoices: Json
          refreshed_at: string | null
          societe_id: string
          updated_at: string
        }
        Insert: {
          invoices?: Json
          refreshed_at?: string | null
          societe_id: string
          updated_at?: string
        }
        Update: {
          invoices?: Json
          refreshed_at?: string | null
          societe_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_cache_supplier_invoices_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: true
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_cache_sync_runs: {
        Row: {
          created_at: string
          details: Json
          id: string
          societe_id: string | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: Json
          id?: string
          societe_id?: string | null
          source: string
          status: string
        }
        Update: {
          created_at?: string
          details?: Json
          id?: string
          societe_id?: string | null
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_cache_sync_runs_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
      }
      erp_cache_trial_balance_months: {
        Row: {
          error: string | null
          month_key: string
          refreshed_at: string
          rows: Json
          societe_id: string
        }
        Insert: {
          error?: string | null
          month_key: string
          refreshed_at?: string
          rows?: Json
          societe_id: string
        }
        Update: {
          error?: string | null
          month_key?: string
          refreshed_at?: string
          rows?: Json
          societe_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_cache_trial_balance_months_societe_id_fkey"
            columns: ["societe_id"]
            isOneToOne: false
            referencedRelation: "daf_societes"
            referencedColumns: ["id"]
          },
        ]
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
          gestion_voirie: string | null
          notes: string
          porte_entree: string | null
          prestataire: string
          prestataire_voirie: string
          responsables: string[]
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commune_key: string
          contact?: string
          contacts_json?: Json
          gestion?: string | null
          gestion_voirie?: string | null
          notes?: string
          porte_entree?: string | null
          prestataire?: string
          prestataire_voirie?: string
          responsables?: string[]
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commune_key?: string
          contact?: string
          contacts_json?: Json
          gestion?: string | null
          gestion_voirie?: string | null
          notes?: string
          porte_entree?: string | null
          prestataire?: string
          prestataire_voirie?: string
          responsables?: string[]
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
      qualification_profil: {
        Row: {
          actif: boolean
          certifications_detenues: string[]
          certifications_manquantes: string[]
          departements: string[]
          entite: string
          hors_perimetre: string[]
          id: string
          metiers: string[]
          montant_max: number | null
          montant_min: number | null
          regles: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          certifications_detenues?: string[]
          certifications_manquantes?: string[]
          departements?: string[]
          entite: string
          hors_perimetre?: string[]
          id?: string
          metiers?: string[]
          montant_max?: number | null
          montant_min?: number | null
          regles?: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          certifications_detenues?: string[]
          certifications_manquantes?: string[]
          departements?: string[]
          entite?: string
          hors_perimetre?: string[]
          id?: string
          metiers?: string[]
          montant_max?: number | null
          montant_min?: number | null
          regles?: string
          updated_at?: string
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
          analyse_at: string | null
          analyse_dce: Json | null
          analyse_erreur: string | null
          analyse_etape: string | null
          analyse_etape_at: string | null
          analyse_run_url: string | null
          analyse_statut: string
          analyse_tentatives: number
          ao_id: string | null
          avis_indices: Json
          avis_resume: Json | null
          avis_resume_at: string | null
          certif_manquante: boolean
          cpv: string | null
          created_at: string
          date_limite: string | null
          date_parution: string | null
          dce_fichiers: Json
          dce_url: string | null
          decision: string | null
          departement: string | null
          domaines: string[]
          entite: string | null
          exigences: Json
          id: string
          interet_relationnel: boolean
          intitule: string
          lien: string | null
          motif_ignore: string | null
          mail_envoye_at: string | null
          motif_ignore_note: string | null
          plateforme: string | null
          points_rouges: string[]
          qualif_error: string | null
          qualif_model: string | null
          qualif_statut: string
          qualif_usage: Json | null
          qualified_at: string | null
          raisons: string[]
          raw: Json
          resume: string | null
          score: number | null
          secteurs: string[]
          source: string
          source_id: string
          statut: string
          type_marche: string | null
          updated_at: string
          url_dce: string | null
        }
        Insert: {
          acheteur?: string | null
          analyse_at?: string | null
          analyse_dce?: Json | null
          analyse_erreur?: string | null
          analyse_etape?: string | null
          analyse_etape_at?: string | null
          analyse_run_url?: string | null
          analyse_statut?: string
          analyse_tentatives?: number
          ao_id?: string | null
          avis_indices?: Json
          avis_resume?: Json | null
          avis_resume_at?: string | null
          certif_manquante?: boolean
          cpv?: string | null
          created_at?: string
          date_limite?: string | null
          date_parution?: string | null
          dce_fichiers?: Json
          dce_url?: string | null
          decision?: string | null
          departement?: string | null
          domaines?: string[]
          entite?: string | null
          exigences?: Json
          id?: string
          interet_relationnel?: boolean
          intitule?: string
          lien?: string | null
          motif_ignore?: string | null
          mail_envoye_at?: string | null
          motif_ignore_note?: string | null
          plateforme?: string | null
          points_rouges?: string[]
          qualif_error?: string | null
          qualif_model?: string | null
          qualif_statut?: string
          qualif_usage?: Json | null
          qualified_at?: string | null
          raisons?: string[]
          raw?: Json
          resume?: string | null
          score?: number | null
          secteurs?: string[]
          source?: string
          source_id: string
          statut?: string
          type_marche?: string | null
          updated_at?: string
          url_dce?: string | null
        }
        Update: {
          acheteur?: string | null
          analyse_at?: string | null
          analyse_dce?: Json | null
          analyse_erreur?: string | null
          analyse_etape?: string | null
          analyse_etape_at?: string | null
          analyse_run_url?: string | null
          analyse_statut?: string
          analyse_tentatives?: number
          ao_id?: string | null
          avis_indices?: Json
          avis_resume?: Json | null
          avis_resume_at?: string | null
          certif_manquante?: boolean
          cpv?: string | null
          created_at?: string
          date_limite?: string | null
          date_parution?: string | null
          dce_fichiers?: Json
          dce_url?: string | null
          decision?: string | null
          departement?: string | null
          domaines?: string[]
          entite?: string | null
          exigences?: Json
          id?: string
          interet_relationnel?: boolean
          intitule?: string
          lien?: string | null
          motif_ignore?: string | null
          mail_envoye_at?: string | null
          motif_ignore_note?: string | null
          plateforme?: string | null
          points_rouges?: string[]
          qualif_error?: string | null
          qualif_model?: string | null
          qualif_statut?: string
          qualif_usage?: Json | null
          qualified_at?: string | null
          raisons?: string[]
          raw?: Json
          resume?: string | null
          score?: number | null
          secteurs?: string[]
          source?: string
          source_id?: string
          statut?: string
          type_marche?: string | null
          updated_at?: string
          url_dce?: string | null
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
      commerce_apply_module_policies: {
        Args: { p_module: string; p_table: string }
        Returns: undefined
      }
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
          last_sign_in_at: string
          module_roles: Json
          nom: string
          prenom: string
          telephone: string
          user_id: string
        }[]
      }
      commerce_set_user_module_roles: {
        Args: { p_module_roles: Json; p_user_id: string }
        Returns: undefined
      }
      daf_detention_transparente: {
        Args: { p_date: string; p_racine: string; p_scenario: string }
        Returns: {
          chemins: string
          controle: boolean
          entite_id: string
          niveau_min: number
          pct_capital: number
          pct_dividendes: number
        }[]
      }
      daf_echeancier: {
        Args: { p_scenario: string }
        Returns: {
          capital: number
          crd: number
          deal_id: string
          financement_id: string
          interets: number
          month_key: string
          porteur_entite_id: string
          type: string
        }[]
      }
      daf_flux_groupe: {
        Args: { p_debut?: string; p_fin?: string; p_scenario: string }
        Returns: {
          categorie: string
          contrepartie_entite_id: string
          deal_id: string
          entite_id: string
          libelle: string
          montant: number
          montant_pondere: number
          month_key: string
        }[]
      }
      daf_has_access: { Args: never; Returns: boolean }
      daf_positions: {
        Args: { p_date?: string; p_scenario: string }
        Returns: {
          detenteur_entite_id: string
          detenue_entite_id: string
          nature: string
          participation_id: string
          pct_capital: number
          pct_dividendes: number
          pct_votes: number
          prix_revient: number
          source: string
        }[]
      }
      daf_valeur_positions: {
        Args: { p_date: string; p_racine: string; p_scenario: string }
        Returns: {
          chemins: string
          code: string
          controle: boolean
          dette_financiere: number
          ebe_12m: number
          entite_id: string
          multiple_ebe: number
          niveau: number
          nom: string
          pct_capital_transparent: number
          pct_dividendes_transparent: number
          perimetre: string
          prix_revient_direct: number
          valeur_entreprise: number
          valeur_quote_part: number
          valeur_titres_100: number
        }[]
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
