import { describe, expect, it } from 'vitest';
import { calculateAge, createLeadDocument, createLeadUpdate, ophthalmologyTriage, validateLeadInput } from '../../src/utils/lead.js';

const validInput = {
  fullName: 'Cliente Exemplo',
  phone: '(81) 99999-1234',
  customerRg: '12.345.678-x',
  customerCpf: '529.982.247-25',
  birthDate: '1985-04-12',
  sex: 'female',
  preferredName: '',
  street: 'Rua das Flores',
  streetNumber: 'SN',
  neighborhood: '',
  city: '',
  state: 'PE',
  interestId: 'complete-glasses',
  ametropiaIds: ['myopia', 'astigmatism'],
  pathologyIds: ['glaucoma', 'diabetes'],
  appointmentDate: '2026-10-02',
  appointmentTime: '14:30',
  appointmentServiceId: 'service-eye-exam',
  appointmentServiceName: 'Exame de vista',
  appointmentDurationMinutes: 30,
  schedulingMode: 'controlled',
  notes: ''
};

const profile = {
  uid: 'user-test',
  displayName: 'Usuario de Teste',
  storeId: 'store-test'
};

describe('lead validation', () => {
  it('requires name and phone', () => {
    const result = validateLeadInput({ fullName: '', phone: '' });

    expect(result.isValid).toBe(false);
    expect(result.errors).toMatchObject({
      fullName: expect.any(String),
      phone: expect.any(String)
    });
  });

  it('rejects notes longer than 500 characters', () => {
    const result = validateLeadInput({ ...validInput, notes: 'a'.repeat(501) });
    expect(result.errors.notes).toBeDefined();
  });

  it('accepts an empty CPF and rejects an invalid one', () => {
    expect(validateLeadInput({ ...validInput, customerCpf: '' }).isValid).toBe(true);
    const result = validateLeadInput({ ...validInput, customerCpf: '111.111.111-11' });
    expect(result.errors.customerCpf).toBeDefined();
  });

  it('normalizes an optional RG and limits its length', () => {
    expect(createLeadUpdate(validInput).data.customerRg).toBe('12.345.678-X');
    expect(validateLeadInput({ ...validInput, customerRg: '1'.repeat(21) }).errors.customerRg).toBeDefined();
  });

  it('calculates age and rejects a future birth date', () => {
    expect(calculateAge('2000-11-10', new Date(2026, 9, 21))).toBe(25);
    expect(calculateAge('2000-10-10', new Date(2026, 9, 21))).toBe(26);
    expect(validateLeadInput({ ...validInput, birthDate: '2999-01-01' }).errors.birthDate).toBeDefined();
    expect(validateLeadInput({ ...validInput, birthDate: '' }).isValid).toBe(true);
  });

  it('accepts known sex options and rejects unknown values', () => {
    expect(validateLeadInput({ ...validInput, sex: 'male' }).isValid).toBe(true);
    expect(validateLeadInput({ ...validInput, sex: '' }).isValid).toBe(true);
    expect(validateLeadInput({ ...validInput, sex: 'invalid' }).errors.sex).toBeDefined();
  });

  it('requires date and time together for a pre-appointment', () => {
    const result = validateLeadInput({
      ...validInput,
      appointmentTime: ''
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.appointmentDate).toBeDefined();
    expect(result.errors.appointmentTime).toBeDefined();
  });

  it('creates the expected versioned document', () => {
    const now = new Date('2026-09-28T12:00:00.000Z');
    const result = createLeadDocument(validInput, profile, 'installation-test', now);

    expect(result.isValid).toBe(true);
    expect(result.data).toMatchObject({
      fullName: 'Cliente Exemplo',
      phone: '+5581999991234',
      phoneSearch: '81999991234',
      customerCpf: '52998224725',
      customerRg: '12.345.678-X',
      birthDate: '1985-04-12',
      sex: 'female',
      street: 'Rua das Flores',
      streetNumber: 'S/N',
      appointmentDate: '2026-10-02',
      appointmentTime: '14:30',
      appointmentAttendance: 'pending',
      appointmentServiceId: 'service-eye-exam',
      appointmentServiceName: 'Exame de vista',
      appointmentDurationMinutes: 30,
      appointmentReservation: { status: 'confirmed', reason: '', requestedDate: '', requestedTime: '' },
      ametropiaIds: ['myopia', 'astigmatism'],
      ametropiaLabels: ['Miopia', 'Astigmatismo'],
      pathologyIds: ['glaucoma', 'diabetes'],
      pathologyLabels: ['Glaucoma', 'Diabetes'],
      source: 'street',
      capturedAtClient: '2026-09-28T12:00:00.000Z',
      capturedByUid: 'user-test',
      storeId: 'store-test',
      installationId: 'installation-test',
      schemaVersion: 1
    });
    expect(result.data).not.toHaveProperty('consentGiven');
    expect(result.data).not.toHaveProperty('consentAtClient');
  });

  it('preserves an offline appointment request without confirming the schedule', () => {
    const result = createLeadDocument({
      ...validInput,
      deferAppointment: true,
      appointmentReservationReason: 'offline',
      needsTransport: 'true',
      hasCompanion: 'true',
      transportEnabled: true,
      transportAllowedWeekdays: [5]
    }, profile, 'installation-test');

    expect(result.isValid).toBe(true);
    expect(result.data).toMatchObject({
      appointmentDate: '',
      appointmentTime: '',
      appointmentReservation: {
        status: 'pending',
        reason: 'offline',
        requestedDate: '2026-10-02',
        requestedTime: '14:30'
      },
      appointmentServiceName: 'Exame de vista',
      needsTransport: true,
      transportSeats: 2
    });
    expect(result.data).not.toHaveProperty('appointmentAttendance');
  });

  it('stores transport customers and companions as separate seat counts', () => {
    const result = createLeadDocument({
      ...validInput,
      needsTransport: 'true',
      hasCompanion: 'true',
      transportEnabled: true,
      transportAllowedWeekdays: [5]
    }, profile, 'installation-test');

    expect(result.isValid).toBe(true);
    expect(result.data).toMatchObject({
      needsTransport: true,
      hasCompanion: true,
      transportSeats: 2
    });
  });

  it('blocks transport on dates without configured availability', () => {
    const result = validateLeadInput({
      ...validInput,
      needsTransport: 'true',
      hasCompanion: 'false',
      transportEnabled: true,
      transportAllowedWeekdays: [3]
    });

    expect(result.errors.appointmentDate).toBe('Escolha um dia com transporte disponivel.');
  });

  it('blocks appointments outside the configured transport hours', () => {
    const result = validateLeadInput({
      ...validInput,
      needsTransport: 'true',
      hasCompanion: 'false',
      transportEnabled: true,
      transportAllowedWeekdays: [5],
      transportHoursRules: [{ weekday: 5, openingTime: '08:00', closingTime: '14:00' }]
    });

    expect(result.errors.appointmentTime).toBe('Escolha um horario dentro da disponibilidade do transporte.');
  });

  it('creates an update with editable fields only', () => {
    const result = createLeadUpdate({
      ...validInput,
      fullName: 'Cliente Corrigido',
      customerRg: '12.345.678-X',
      city: 'Recife'
    });

    expect(result.isValid).toBe(true);
    expect(result.data).toMatchObject({
      fullName: 'Cliente Corrigido',
      birthDate: '1985-04-12',
      sex: 'female',
      street: 'Rua das Flores',
      streetNumber: 'S/N',
      city: 'Recife',
      phone: '+5581999991234'
    });
    expect(result.data).not.toHaveProperty('capturedByUid');
    expect(result.data).not.toHaveProperty('storeId');
    expect(result.data).not.toHaveProperty('capturedAtClient');
  });

  it('keeps exclusive ametropia answers consistent', () => {
    const result = createLeadUpdate({
      ...validInput,
      ametropiaIds: ['myopia', 'none']
    });

    expect(result.data.ametropiaIds).toEqual(['none']);
    expect(result.data.ametropiaLabels).toEqual(['Nao possui']);
  });

  it('keeps exclusive pathology answers consistent', () => {
    const result = createLeadUpdate({
      ...validInput,
      pathologyIds: ['glaucoma', 'none']
    });

    expect(result.data.pathologyIds).toEqual(['none']);
    expect(result.data.pathologyLabels).toEqual(['Nao possui']);
  });

  it('ignores pathology options removed from the registration form', () => {
    const result = createLeadUpdate({
      ...validInput,
      pathologyIds: ['dry-eye', 'macular-degeneration', 'retinal-detachment']
    });

    expect(result.data.pathologyIds).toEqual([]);
    expect(result.data.pathologyLabels).toEqual([]);
  });

  it('requires the eye surgery answer from the configured minimum age', () => {
    const result = validateLeadInput({
      ...validInput,
      birthDate: '1960-01-01',
      ophthalmologyRoutingEnabled: true,
      ophthalmologyMinimumAge: 55,
      eyeSurgeryStatus: ''
    });

    expect(result.errors.eyeSurgeryStatus).toBeDefined();
  });

  it('requires which surgery was performed and supports another description', () => {
    expect(validateLeadInput({
      ...validInput,
      birthDate: '1960-01-01',
      ophthalmologyRoutingEnabled: true,
      ophthalmologyMinimumAge: 55,
      eyeSurgeryStatus: 'yes',
      eyeSurgeryType: ''
    }).errors.eyeSurgeryType).toBeDefined();
    expect(validateLeadInput({
      ...validInput,
      birthDate: '1960-01-01',
      ophthalmologyRoutingEnabled: true,
      ophthalmologyMinimumAge: 55,
      eyeSurgeryStatus: 'yes',
      eyeSurgeryType: 'other',
      eyeSurgeryDetails: ''
    }).errors.eyeSurgeryDetails).toBeDefined();
  });

  it('routes cataract pathology or surgery to ophthalmology', () => {
    const settings = {
      ophthalmologyRoutingEnabled: true,
      ophthalmologyMinimumAge: 55,
      ophthalmologyPathologyIds: ['cataract'],
      ophthalmologySurgeryIds: ['cataract']
    };
    expect(ophthalmologyTriage({ ...validInput, pathologyIds: ['cataract'] }, settings).careRoute).toBe('ophthalmologist');
    expect(ophthalmologyTriage({ ...validInput, pathologyIds: [], eyeSurgeryStatus: 'yes', eyeSurgeryType: 'cataract' }, settings).careRoute).toBe('ophthalmologist');
    expect(ophthalmologyTriage({ ...validInput, pathologyIds: ['glaucoma'] }, settings).careRoute).toBe('optometrist');
  });

  it('rejects ophthalmology appointments outside configured weekdays', () => {
    const result = validateLeadInput({
      ...validInput,
      appointmentDate: '2026-10-22',
      careRouteOverride: 'ophthalmologist',
      ophthalmologyAllowedWeekdays: [6]
    });
    expect(result.errors.appointmentDate).toBeDefined();
  });
});
