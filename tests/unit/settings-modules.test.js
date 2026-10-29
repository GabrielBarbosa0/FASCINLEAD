import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_STORE_SCHEDULE } from '../../src/utils/schedule.js';
import { bindScheduleStoreSelection, handleSettingsSectionClick, normalizeScheduleSettingsValues } from '../../src/app/features/settings/schedule-events.js';
import { scheduleSettingsView, selectedSchedule } from '../../src/app/features/settings/schedule-settings.js';
import { settingsView } from '../../src/app/features/settings/settings-view.js';

function schedule(overrides = {}) {
  return { id: 'loja-02', ...DEFAULT_STORE_SCHEDULE, ...overrides };
}

describe('settings feature modules', () => {
  it('renders access protection, tabs and the selected content', () => {
    expect(settingsView({ allowed: false, settings: {}, content: '' })).toContain('Somente administradores');
    const markup = settingsView({
      allowed: true,
      settings: { section: 'schedule', loading: false, saving: false, error: '' },
      content: '<section>Agenda da loja</section>'
    });
    expect(markup).toContain('aria-selected="true" data-settings-section="schedule"');
    expect(markup).toContain('Agenda da loja');
  });

  it('selects a saved schedule and falls back to the default store schedule', () => {
    const saved = schedule({ maxCompanions: 3 });
    expect(selectedSchedule({ records: [saved], selectedStoreId: 'loja-02' })).toBe(saved);
    expect(selectedSchedule({ records: [], selectedStoreId: 'loja-02' })).toMatchObject({ maxCompanions: DEFAULT_STORE_SCHEDULE.maxCompanions });
  });

  it('keeps professional controls and schedules in the intended order', () => {
    const markup = scheduleSettingsView({
      records: [schedule()],
      selectedStoreId: 'loja-02',
      loading: false,
      saving: false
    });
    const labels = [
      'Perguntar sobre cirurgia a partir de',
      'Ativar atendimento com optometrista',
      'Escala do optometrista',
      'Ativar triagem para oftalmologista',
      'Escala do oftalmologista'
    ];
    labels.reduce((previous, label) => {
      const index = markup.indexOf(label);
      expect(index).toBeGreaterThan(previous);
      return index;
    }, -1);
    expect(markup).toContain('id="transport-dialog"');
    expect(markup).toContain('id="offline-capture-dialog"');
  });

  it('normalizes schedule form values and preserves free-mode hours', () => {
    const current = schedule({ openingTime: '08:00', closingTime: '18:00' });
    const values = normalizeScheduleSettingsValues({
      storeId: 'loja-02',
      schedulingMode: 'free',
      automaticPendingFollowUp: 'true',
      showAmetropiaFields: 'false',
      optometristExamPrice: '150',
      ophthalmologistExamPrice: '200',
      ophthalmologyMinimumAge: '55',
      maxCompanions: '2',
      storeHoursRules: '[{"weekday":1,"openingTime":"09:00","closingTime":"17:00"}]',
      limitedDayRules: '[]',
      meiQuotaRules: '[]',
      optometristHoursRules: '[]',
      ophthalmologyHoursRules: '[]',
      transportHoursRules: '[]'
    }, current);
    expect(values).toMatchObject({
      openingTime: '08:00',
      closingTime: '18:00',
      automaticPendingFollowUp: true,
      showAmetropiaFields: false,
      optometristExamPrice: 150,
      ophthalmologistExamPrice: 200,
      ophthalmologyMinimumAge: 55,
      ophthalmologyPathologyIds: ['cataract']
    });
  });

  it('delegates section and store changes', () => {
    const settings = { section: 'schedule', selectedStoreId: 'loja-02' };
    const render = vi.fn();
    const sectionButton = { dataset: { settingsSection: 'services' } };
    expect(handleSettingsSectionClick({ target: { closest: () => sectionButton } }, { settings, render })).toBe(true);
    expect(settings.section).toBe('services');

    let change;
    const form = { elements: { storeId: { value: 'loja-06', addEventListener: (_, callback) => { change = callback; } } } };
    expect(bindScheduleStoreSelection(form, { settings, render })).toBe(true);
    change();
    expect(settings.selectedStoreId).toBe('loja-06');
  });
});
