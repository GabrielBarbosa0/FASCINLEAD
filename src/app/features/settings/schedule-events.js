export function handleSettingsSectionClick(event, { settings, render }) {
  const button = event.target.closest('[data-settings-section]');
  if (!button) return false;
  settings.section = button.dataset.settingsSection;
  render();
  return true;
}

export function bindScheduleStoreSelection(form, { settings, render }) {
  if (!form) return false;
  form.elements.storeId.addEventListener('change', () => {
    settings.selectedStoreId = form.elements.storeId.value;
    render();
  });
  return true;
}

export function scheduleSettingsValues(form, current) {
  return normalizeScheduleSettingsValues(Object.fromEntries(new FormData(form)), current);
}

export function normalizeScheduleSettingsValues(source, current) {
  const values = { ...source };
  const enabledFields = [
    'automaticPendingFollowUp',
    'showAmetropiaFields',
    'limitedDaysEnabled',
    'meiQuotaEnabled',
    'optometristEnabled',
    'ophthalmologyRoutingEnabled',
    'transportEnabled',
    'offlineCaptureEnabled'
  ];
  enabledFields.forEach((name) => { values[name] = values[name] === 'true'; });
  ['optometristExamPrice', 'ophthalmologistExamPrice', 'maxCompanions', 'ophthalmologyMinimumAge']
    .forEach((name) => { values[name] = Number(values[name]); });

  values.appointmentDurationMinutes = current.appointmentDurationMinutes;
  values.storeHoursRules = JSON.parse(values.storeHoursRules || '[]');
  values.openingTime = values.storeHoursRules[0]?.openingTime || current.openingTime;
  values.closingTime = values.storeHoursRules[0]?.closingTime || current.closingTime;
  values.limitedDayRules = JSON.parse(values.limitedDayRules || '[]');
  values.limitedWeekdays = values.limitedDayRules.map((rule) => rule.weekday);
  values.limitedDayCapacity = values.limitedDayRules[0]?.capacity || current.limitedDayCapacity;
  values.meiQuotaRules = JSON.parse(values.meiQuotaRules || '[]');
  values.meiQuotaWeekdays = values.meiQuotaRules.map((rule) => rule.weekday);
  values.meiMorningQuota = values.meiQuotaRules[0]?.morningQuota ?? current.meiMorningQuota;
  values.meiAfternoonQuota = values.meiQuotaRules[0]?.afternoonQuota ?? current.meiAfternoonQuota;
  values.meiDailyQuota = values.meiMorningQuota + values.meiAfternoonQuota;
  values.optometristHoursRules = JSON.parse(values.optometristHoursRules || '[]');
  values.optometristWeekdays = values.optometristHoursRules.map((rule) => rule.weekday);
  values.optometristOpeningTime = values.optometristHoursRules[0]?.openingTime || current.optometristOpeningTime;
  values.optometristClosingTime = values.optometristHoursRules[0]?.closingTime || current.optometristClosingTime;
  values.ophthalmologyHoursRules = JSON.parse(values.ophthalmologyHoursRules || '[]');
  values.ophthalmologyWeekdays = values.ophthalmologyHoursRules.map((rule) => rule.weekday);
  values.ophthalmologyOpeningTime = values.ophthalmologyHoursRules[0]?.openingTime || current.ophthalmologyOpeningTime;
  values.ophthalmologyClosingTime = values.ophthalmologyHoursRules[0]?.closingTime || current.ophthalmologyClosingTime;
  values.ophthalmologyPathologyIds = JSON.parse(values.ophthalmologyPathologyIds || '["cataract"]');
  values.ophthalmologySurgeryIds = JSON.parse(values.ophthalmologySurgeryIds || '["cataract","refractive","corneal-transplant"]');
  values.transportHoursRules = JSON.parse(values.transportHoursRules || '[]');
  if (values.schedulingMode === 'free') {
    values.openingTime = current.openingTime;
    values.closingTime = current.closingTime;
  }
  return values;
}
