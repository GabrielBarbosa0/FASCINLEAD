import { filterManagementRecords } from '../management/management-filters.js';
import {
  paginateReportRecords,
  reportMetricsView,
  reportNoticesView,
  reportResultsView,
  reportToolbar
} from './report-components.js';
import { reportFiltersView } from './report-filters.js';

export function reportsView({ management, allowedStores, adminView, canOpenLead, permissions, queryLimit }) {
  const { filters, loaded, loading, error, records, truncated, pageSize } = management;
  const filtered = filterManagementRecords(records, filters);
  const pagination = paginateReportRecords(filtered, management.page, pageSize);

  return `${reportToolbar({ permissions, adminView, recordCount: filtered.length })}
    ${reportFiltersView({ filters, records, allowedStores, loading })}
    ${reportNoticesView({ error, truncated, queryLimit })}
    ${reportMetricsView(filtered)}
    <section class="management-results" aria-busy="${loading}">${reportResultsView({
      records: pagination.pageRecords,
      loaded,
      canOpenLead,
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      totalRecords: filtered.length
    })}</section>`;
}
