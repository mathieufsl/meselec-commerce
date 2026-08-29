export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      appels_offres: {
        Row: Record<string, unknown>;
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      ao_lots: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      ao_documents: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      ao_reponses: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      ao_reponse_lignes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      bpu_catalogues: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      bpu_lignes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      clients: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      commerce_settings: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      erp_cache_employes: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      erp_cache_clients: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      erp_cache_fournisseurs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      erp_cache_sync_runs: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      fournisseurs_commerciaux: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      memoires_techniques: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      prospection_suivi: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
      societes_exploitation: { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> };
    };
    Functions: {
      import_bpu_lignes: {
        Args: { p_catalogue_id: string; p_lignes: Json };
        Returns: number;
      };
      recalc_ao_reponse_montant: {
        Args: { p_reponse_id: string };
        Returns: number;
      };
      commerce_has_access: { Args: Record<string, never>; Returns: boolean };
    };
  };
};
