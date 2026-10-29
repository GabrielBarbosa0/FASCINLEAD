import { DEFAULT_STORE_SCHEDULE, WEEKDAY_OPTIONS } from '../../../utils/schedule.js';
import { STORES } from '../../../utils/stores.js';
import { scheduleDialogs } from './schedule-dialogs.js';

export function selectedSchedule(settings) {
  return settings.records.find((item) => item.id === settings.selectedStoreId)
    || { ...STORES.find((item) => item.id === settings.selectedStoreId), ...DEFAULT_STORE_SCHEDULE };
}

function limitedRows(selected) {
  return WEEKDAY_OPTIONS.map((day) => {
    const rule = selected.limitedDayRules.find((item) => item.weekday === day.id);
    return `<div class="schedule-rule-row ${rule ? 'is-active' : ''}" data-limited-day-row="${day.id}"><label class="schedule-rule-day checkbox-label"><input type="checkbox" name="limitedDayWeekday" value="${day.id}" ${rule ? 'checked' : ''} /><span>${day.label}</span></label><div class="number-with-unit"><input aria-label="Vagas de ${day.label}" name="limitedDayCapacity-${day.id}" type="number" min="1" max="100" step="1" value="${rule?.capacity || selected.limitedDayCapacity}" ${rule ? '' : 'disabled'} /><span>vagas</span></div></div>`;
  }).join('');
}

function meiRows(selected) {
  return WEEKDAY_OPTIONS.map((day) => {
    const rule = selected.meiQuotaRules.find((item) => item.weekday === day.id);
    const morning = rule?.morningQuota ?? selected.meiMorningQuota;
    const afternoon = rule?.afternoonQuota ?? selected.meiAfternoonQuota;
    return `<div class="schedule-rule-row schedule-mei-rule-row ${rule ? 'is-active' : ''}" data-mei-day-row="${day.id}"><label class="schedule-rule-day checkbox-label"><input type="checkbox" name="meiQuotaWeekday" value="${day.id}" ${rule ? 'checked' : ''} /><span>${day.label}</span></label><div class="number-with-unit"><input aria-label="Cota da manhã de ${day.label}" name="meiMorningQuota-${day.id}" type="number" min="0" max="100" step="1" value="${morning}" ${rule ? '' : 'disabled'} /><span>manhã</span></div><div class="number-with-unit"><input aria-label="Cota da tarde de ${day.label}" name="meiAfternoonQuota-${day.id}" type="number" min="0" max="100" step="1" value="${afternoon}" ${rule ? '' : 'disabled'} /><span>tarde</span></div><strong class="schedule-rule-total" data-mei-day-total>${morning + afternoon} total</strong></div>`;
  }).join('');
}

function hoursRows(selected, { rules, rowName, checkboxName, openingName, closingName, openingFallback, closingFallback, labelPrefix = '' }) {
  return WEEKDAY_OPTIONS.map((day) => {
    const rule = rules.find((item) => item.weekday === day.id);
    return `<div class="schedule-rule-row schedule-hours-rule-row ${rule ? 'is-active' : ''}" data-${rowName}="${day.id}"><label class="schedule-rule-day checkbox-label"><input type="checkbox" name="${checkboxName}" value="${day.id}" ${rule ? 'checked' : ''} /><span>${day.label}</span></label><input aria-label="Início ${labelPrefix}${day.label}" name="${openingName}-${day.id}" type="time" value="${rule?.openingTime || openingFallback}" ${rule ? '' : 'disabled'} /><input aria-label="Fim ${labelPrefix}${day.label}" name="${closingName}-${day.id}" type="time" value="${rule?.closingTime || closingFallback}" ${rule ? '' : 'disabled'} /></div>`;
  }).join('');
}

function scheduleRows(selected) {
  return {
    limited: limitedRows(selected),
    mei: meiRows(selected),
    store: hoursRows(selected, { rules: selected.storeHoursRules, rowName: 'store-hours-row', checkboxName: 'storeHoursWeekday', openingName: 'storeOpeningTime', closingName: 'storeClosingTime', openingFallback: selected.openingTime, closingFallback: selected.closingTime, labelPrefix: 'de ' }),
    optometrist: hoursRows(selected, { rules: selected.optometristHoursRules, rowName: 'optometrist-hours-row', checkboxName: 'optometristWeekday', openingName: 'optometristOpeningTime', closingName: 'optometristClosingTime', openingFallback: selected.optometristOpeningTime, closingFallback: selected.optometristClosingTime, labelPrefix: 'do optometrista em ' }),
    ophthalmology: hoursRows(selected, { rules: selected.ophthalmologyHoursRules, rowName: 'ophthalmology-hours-row', checkboxName: 'ophthalmologyWeekday', openingName: 'ophthalmologyOpeningTime', closingName: 'ophthalmologyClosingTime', openingFallback: selected.ophthalmologyOpeningTime, closingFallback: selected.ophthalmologyClosingTime, labelPrefix: 'do oftalmologista em ' }),
    transport: hoursRows(selected, { rules: selected.transportHoursRules, rowName: 'transport-hours-row', checkboxName: 'transportWeekday', openingName: 'transportOpeningTime', closingName: 'transportClosingTime', openingFallback: '08:00', closingFallback: '18:00', labelPrefix: 'do transporte em ' })
  };
}

function countSummary(enabled, rules, singular, plural, disabled) {
  return enabled ? `${rules.length} ${rules.length === 1 ? singular : plural}` : disabled;
}

export function scheduleSettingsView(settings) {
  const { selectedStoreId, loading, saving } = settings;
  const selected = selectedSchedule(settings);
  const storeOptions = STORES.map((store) => `<option value="${store.id}" ${store.id === selectedStoreId ? 'selected' : ''}>${store.displayLabel}</option>`).join('');
  const rows = scheduleRows(selected);
  const currency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return `<section class="settings-layout"><form id="schedule-settings-form" class="settings-form" novalidate>
    <div class="filter-title"><i data-lucide="calendar-days"></i><div><strong>Configurações da agenda</strong><span>As alterações valem para novos pré-agendamentos.</span></div></div>
    <div class="field"><label for="settings-store">Loja</label><select id="settings-store" name="storeId">${storeOptions}</select></div>
    <div class="schedule-config-grid">
      ${launch('calendar-days', 'Configurações gerais', selected.schedulingMode === 'free' ? 'Cadastro livre' : countSummary(true, selected.storeHoursRules, 'dia aberto', 'dias abertos', ''), 'data-general-schedule-open', 'Configurar agenda', 'data-general-schedule-summary')}
      ${launch('calendar-days', 'Limite de vagas', countSummary(selected.limitedDaysEnabled, selected.limitedDayRules, 'dia configurado', 'dias configurados', 'Desativado'), 'data-limited-days-open', 'Configurar limite', 'data-limited-days-summary')}
      ${launch('users', 'Cotas do MEI', countSummary(selected.meiQuotaEnabled, selected.meiQuotaRules, 'dia configurado', 'dias configurados', 'Desativadas'), 'data-mei-quota-open', 'Configurar cotas', 'data-mei-quota-summary')}
      ${launch('stethoscope', 'Triagem e valores de consulta', `Optometrista ${currency(selected.optometristExamPrice)} · Oftalmologista ${currency(selected.ophthalmologistExamPrice)}`, 'data-ophthalmology-open', 'Configurar', 'data-ophthalmology-summary')}
      ${launch('bus-front', 'Transporte', countSummary(selected.transportEnabled, selected.transportHoursRules, 'dia configurado', 'dias configurados', 'Desativado'), 'data-transport-open', 'Configurar transporte', 'data-transport-summary')}
      ${launch('hard-drive', 'Cadastro offline', selected.offlineCaptureEnabled ? 'Ativado' : 'Desativado', 'data-offline-capture-open', 'Configurar modo offline', 'data-offline-capture-summary')}
    </div>
    ${scheduleDialogs({ selected, rows })}
    <button class="button button-primary button-block" type="submit" ${loading || saving ? 'disabled' : ''}><i data-lucide="save"></i><span>${saving ? 'Salvando...' : 'Salvar configuração'}</span></button>
  </form></section>`;
}

function launch(icon, title, summary, action, buttonLabel, summaryAttribute) {
  return `<div class="schedule-config-launch"><span class="schedule-config-launch-icon"><i data-lucide="${icon}"></i></span><span><strong>${title}</strong><small ${summaryAttribute}>${summary}</small></span><button class="button button-secondary" type="button" ${action}><i data-lucide="wrench"></i><span>${buttonLabel}</span></button></div>`;
}
