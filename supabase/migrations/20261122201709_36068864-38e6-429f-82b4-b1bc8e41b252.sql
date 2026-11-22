DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['erp_cache_chantiers','daf_scenarios','daf_treso_frozen_ref','daf_payroll_assumptions','daf_cca_forecast','daf_client_payment_terms','daf_store_snapshots','daf_treso_snapshot','erp_cache_supplier_invoices','daf_cost_killing_levers','erp_cache_ca_projete','daf_settings','daf_pnl_budget_lines','erp_cache_client_invoices','daf_forecast_opex_lines','erp_cache_bank_summary','daf_payroll_lines','daf_recurring_payments','erp_cache_trial_balance_months'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_full_access ON public.%I', t);
    EXECUTE format('CREATE POLICY daf_access ON public.%I FOR ALL TO authenticated USING (public.daf_has_access()) WITH CHECK (public.daf_has_access())', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS auth_full_access ON public.daf_allowed_emails;
CREATE POLICY daf_allowed_emails_read ON public.daf_allowed_emails FOR SELECT TO authenticated USING (public.daf_has_access());

DROP POLICY IF EXISTS chat_conversations_open ON public.chat_conversations;
CREATE POLICY chat_conversations_access ON public.chat_conversations FOR ALL TO authenticated USING (public.commerce_has_access()) WITH CHECK (public.commerce_has_access());
DROP POLICY IF EXISTS chat_messages_open ON public.chat_messages;
CREATE POLICY chat_messages_access ON public.chat_messages FOR ALL TO authenticated USING (public.commerce_has_access()) WITH CHECK (public.commerce_has_access());