import { normalizeBrazilianPhone } from './phone.js';

export const INTERESTS = [
  { id: '', label: 'Nao informado' },
  { id: 'complete-glasses', label: 'Oculos completo' },
  { id: 'frames', label: 'Armacao' },
  { id: 'lenses', label: 'Lentes' },
  { id: 'eye-exam', label: 'Exame de vista' },
  { id: 'other', label: 'Outro' }
];

export const AMETROPIAS = [
  { id: 'myopia', label: 'Miopia' },
  { id: 'hyperopia', label: 'Hipermetropia' },
  { id: 'astigmatism', label: 'Astigmatismo' },
  { id: 'presbyopia', label: 'Presbiopia' },
  { id: 'none', label: 'Nao possui' },
  { id: 'unknown', label: 'Nao sabe informar' }
];

function normalizeAmetropias(values) {
  const requested = Array.isArray(values) ? values : [values].filter(Boolean);
  const validIds = new Set(AMETROPIAS.map((item) => item.id));
  const selected = [...new Set(requested.map(String).filter((id) => validIds.has(id)))];
  if (selected.includes('none')) return ['none'];
  if (selected.includes('unknown')) return ['unknown'];
  return selected;
}

function ametropiaData(input) {
  const ametropiaIds = normalizeAmetropias(input.ametropiaIds);
  return {
    ametropiaIds,
    ametropiaLabels: ametropiaIds.map((id) => AMETROPIAS.find((item) => item.id === id).label)
  };
}

export function validateLeadInput(input) {
  const errors = {};
  const fullName = input.fullName?.trim() || '';
  const phone = normalizeBrazilianPhone(input.phone);

  if (fullName.length < 2) errors.fullName = 'Informe o nome do cliente.';
  if (fullName.length > 120) errors.fullName = 'Use no maximo 120 caracteres.';
  if (!phone) errors.phone = 'Informe um telefone com DDD.';
  if ((input.notes?.trim().length || 0) > 500) errors.notes = 'Use no maximo 500 caracteres.';

  const appointmentDate = input.appointmentDate?.trim() || '';
  const appointmentTime = input.appointmentTime?.trim() || '';
  if ((appointmentDate && !appointmentTime) || (!appointmentDate && appointmentTime)) {
    errors.appointmentDate = 'Informe a data e o horario do pre-agendamento.';
    errors.appointmentTime = 'Informe a data e o horario do pre-agendamento.';
  }
  if (appointmentDate && !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate)) {
    errors.appointmentDate = 'Informe uma data valida.';
  }
  if (appointmentTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(appointmentTime)) {
    errors.appointmentTime = 'Informe um horario valido.';
  }

  return { errors, isValid: Object.keys(errors).length === 0, phone };
}

export function createLeadDocument(input, profile, installationId, now = new Date()) {
  const validation = validateLeadInput(input);
  if (!validation.isValid) return { ...validation, data: null };

  const interest = INTERESTS.find((item) => item.id === input.interestId) || INTERESTS[0];

  return {
    errors: {},
    isValid: true,
    data: {
      fullName: input.fullName.trim(),
      preferredName: input.preferredName?.trim() || '',
      phone: validation.phone.e164,
      phoneSearch: validation.phone.search,
      neighborhood: input.neighborhood?.trim() || '',
      city: input.city?.trim() || '',
      state: (input.state?.trim() || 'PE').toUpperCase().slice(0, 2),
      interestId: interest.id,
      interestLabel: interest.id ? interest.label : '',
      ...ametropiaData(input),
      appointmentDate: input.appointmentDate?.trim() || '',
      appointmentTime: input.appointmentTime?.trim() || '',
      ...(input.appointmentDate?.trim() ? {
        appointmentAttendance: 'pending',
        appointmentSchedulingMode: input.schedulingMode === 'controlled' ? 'controlled' : 'free',
        appointmentDurationMinutes: Number(input.appointmentDurationMinutes) || 20
      } : {}),
      notes: input.notes?.trim() || '',
      source: 'street',
      capturedAtClient: now.toISOString(),
      capturedByUid: profile.uid,
      capturedByName: profile.displayName,
      storeId: profile.storeId,
      installationId,
      appVersion: '0.1.0',
      schemaVersion: 1
    }
  };
}

export function createLeadUpdate(input) {
  const validation = validateLeadInput(input);
  if (!validation.isValid) return { ...validation, data: null };

  const interest = INTERESTS.find((item) => item.id === input.interestId) || INTERESTS[0];
  return {
    errors: {},
    isValid: true,
    data: {
      fullName: input.fullName.trim(),
      preferredName: input.preferredName?.trim() || '',
      phone: validation.phone.e164,
      phoneSearch: validation.phone.search,
      neighborhood: input.neighborhood?.trim() || '',
      city: input.city?.trim() || '',
      state: (input.state?.trim() || 'PE').toUpperCase().slice(0, 2),
      interestId: interest.id,
      interestLabel: interest.id ? interest.label : '',
      ...ametropiaData(input),
      appointmentDate: input.appointmentDate?.trim() || '',
      appointmentTime: input.appointmentTime?.trim() || '',
      ...(input.appointmentDate?.trim() && input.schedulingMode ? {
        appointmentSchedulingMode: input.schedulingMode === 'controlled' ? 'controlled' : 'free',
        appointmentDurationMinutes: Number(input.appointmentDurationMinutes) || 20
      } : {}),
      notes: input.notes?.trim() || ''
    }
  };
}
