import { afterEach, describe, expect, it, vi } from 'vitest';
import { restoreNewLeadDraft } from '../../src/app/features/capture/capture-form.js';
import { captureAppointmentTimeField, careRouteAppointmentSchedule } from '../../src/app/features/capture/capture-schedule.js';
import { enrichLeadTriage, eyeTriageFields, triageConfigFields } from '../../src/app/features/capture/capture-triage.js';
import { transportFields } from '../../src/app/features/capture/capture-transport.js';
import { captureView } from '../../src/app/features/capture/capture-view.js';
import { DEFAULT_STORE_SCHEDULE } from '../../src/utils/schedule.js';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('capture feature modules', () => {
  it('restores simple, checkbox and surgery draft fields', () => {
    const fullName = { type: 'text', value: '' };
    const pathology = { type: 'checkbox', value: 'cataract', checked: false };
    const surgeryType = { type: 'select-one', value: '', disabled: true };
    const controls = {
      fullName: [fullName],
      pathologyIds: [pathology],
      eyeSurgeryStatus: [{ type: 'select-one', value: '' }],
      eyeSurgeryType: [surgeryType]
    };
    const form = {
      elements: { eyeSurgeryType: surgeryType },
      querySelectorAll: (selector) => controls[selector.match(/name="([^"]+)"/)?.[1]] || []
    };

    restoreNewLeadDraft(form, {
      fullName: 'Maria Silva',
      pathologyIds: ['cataract'],
      eyeSurgeryStatus: 'yes',
      eyeSurgeryType: 'cataract'
    });

    expect(fullName.value).toBe('Maria Silva');
    expect(pathology.checked).toBe(true);
    expect(surgeryType.disabled).toBe(false);
    expect(surgeryType.value).toBe('cataract');
  });

  it('renders and enriches clinical triage with configured historical pricing', () => {
    const settings = {
      ...DEFAULT_STORE_SCHEDULE,
      ophthalmologyRoutingEnabled: true,
      ophthalmologyPathologyIds: ['cataract'],
      optometristExamPrice: 180,
      ophthalmologistExamPrice: 260
    };
    const values = { pathologyIds: ['cataract'], examPaymentType: 'paid', examPaymentMethods: ['pix'] };
    const enriched = enrichLeadTriage(values, settings);

    expect(enriched).toMatchObject({ careRoute: 'ophthalmologist', examPrice: 260 });
    expect(eyeTriageFields(values, settings)).toContain('Oftalmologista');
    expect(triageConfigFields(settings)).toContain('name="ophthalmologistExamPrice"');
  });

  it('renders transport limits and availability from store settings', () => {
    const settings = {
      ...DEFAULT_STORE_SCHEDULE,
      transportEnabled: true,
      maxCompanions: 2,
      transportHoursRules: [{ weekday: 4, openingTime: '08:00', closingTime: '12:00' }]
    };
    const markup = transportFields({ needsTransport: true, companionCount: 2, appointmentDate: '2026-10-29' }, settings);

    expect(markup).toContain('2 acompanhantes');
    expect(markup).toContain('Transporte disponível das 08:00 às 12:00.');
  });

  it('uses the care route schedule and supports free scheduling', () => {
    const settings = { ...DEFAULT_STORE_SCHEDULE, schedulingMode: 'free' };
    expect(careRouteAppointmentSchedule(settings, 'optometrist')).toBeTruthy();
    expect(captureAppointmentTimeField({
      scheduleState: { settings, appointmentDate: '', appointments: [], loading: false, error: '', triage: {} },
      service: { durationMinutes: 20 },
      profile: {},
      online: true
    })).toContain('type="time"');
  });

  it('renders the capture page without reading application-global state', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const scheduleState = {
      settings: { ...DEFAULT_STORE_SCHEDULE, transportEnabled: false },
      services: [{ id: 'exam', name: 'Exame de vista', durationMinutes: 20, storeIds: ['loja-06'], active: true }],
      serviceId: 'exam',
      appointmentDate: '',
      loaded: true
    };
    const markup = captureView({
      scheduleState,
      offlineCaptureEnabled: true,
      selectedStoreId: 'loja-06',
      allowedStoreIds: ['loja-06'],
      storeChoice: false,
      selectedService: scheduleState.services[0],
      appointmentTimeMarkup: '<div data-time-field></div>'
    });

    expect(markup).toContain('id="lead-form"');
    expect(markup).toContain('Exame de vista - 20 min');
    expect(markup).toContain('data-time-field');
  });
});
