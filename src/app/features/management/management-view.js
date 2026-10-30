import { reportsView } from '../reports/reports-view.js';

export function managementView({ allowed, management, allowedStores, adminView, canOpenLead, permissions, queryLimit }) {
  if (!allowed) return '<div class="notice notice-danger"><i data-lucide="circle-alert"></i><span>Seu perfil não possui acesso aos dados gerenciais.</span></div>';
  return reportsView({ management, allowedStores, adminView, canOpenLead, permissions, queryLimit });
}
