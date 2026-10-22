import { normalizeBrazilianPhone } from './phone.js';
import { isValidCpf, normalizeCpf } from './savwin-matching.js';
import { isTransportAppointmentAllowed } from './schedule.js';

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

export const PATHOLOGIES = [
  { id: 'cataract', label: 'Catarata' },
  { id: 'glaucoma', label: 'Glaucoma' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'hypertension', label: 'Pressao alta' },
  { id: 'keratoconus', label: 'Ceratocone' },
  { id: 'retinopathy', label: 'Retinopatia' },
  { id: 'other', label: 'Outra' },
  { id: 'none', label: 'Nao possui' },
  { id: 'unknown', label: 'Nao sabe informar' }
];

export const SEX_OPTIONS = [
  { id: '', label: 'Nao informado' },
  { id: 'female', label: 'Feminino' },
  { id: 'male', label: 'Masculino' }
];

export const EYE_SURGERY_STATUS_OPTIONS = [
  { id: '', label: 'Selecione' },
  { id: 'yes', label: 'Sim' },
  { id: 'no', label: 'Nao' },
  { id: 'unknown', label: 'Nao sabe informar' }
];

export const EYE_SURGERIES = [
  { id: '', label: 'Selecione' },
  { id: 'cataract', label: 'Catarata' },
  { id: 'other', label: 'Outra' }
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

function normalizePathologies(values) {
  const requested = Array.isArray(values) ? values : [values].filter(Boolean);
  const validIds = new Set(PATHOLOGIES.map((item) => item.id));
  const selected = [...new Set(requested.map(String).filter((id) => validIds.has(id)))];
  if (selected.includes('none')) return ['none'];
  if (selected.includes('unknown')) return ['unknown'];
  return selected;
}

function pathologyData(input) {
  const pathologyIds = normalizePathologies(input.pathologyIds);
  return {
    pathologyIds,
    pathologyLabels: pathologyIds.map((id) => PATHOLOGIES.find((item) => item.id === id).label)
  };
}

function normalizeStreetNumber(value) {
  const number = String(value || '').trim();
  return /^s\/?n$/i.test(number) ? 'S/N' : number;
}

function normalizeRg(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
}

function parseBirthDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return { year, month, day };
}

export function calculateAge(birthDate, referenceDate = new Date()) {
  const birth = parseBirthDate(birthDate);
  if (!birth || Number.isNaN(referenceDate.getTime())) return null;
  let age = referenceDate.getFullYear() - birth.year;
  const beforeBirthday = referenceDate.getMonth() + 1 < birth.month
    || (referenceDate.getMonth() + 1 === birth.month && referenceDate.getDate() < birth.day);
  if (beforeBirthday) age -= 1;
  return age >= 0 ? age : null;
}

function booleanValue(value) {
  return value === true || value === 'true';
}

function weekdayFromDate(value) {
  const parsed = parseBirthDate(value);
  return parsed ? new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay() : null;
}

export function ophthalmologyTriage(input = {}, settings = {}, referenceDate = new Date()) {
  const enabled = settings.ophthalmologyRoutingEnabled === undefined
    ? true
    : booleanValue(settings.ophthalmologyRoutingEnabled);
  const minimumAge = Number.isInteger(Number(settings.ophthalmologyMinimumAge))
    ? Number(settings.ophthalmologyMinimumAge)
    : 55;
  const age = calculateAge(input.birthDate, referenceDate);
  const surgeryQuestionRequired = enabled && age !== null && age >= minimumAge;
  const surgeryStatus = EYE_SURGERY_STATUS_OPTIONS.some((item) => item.id === input.eyeSurgeryStatus)
    ? input.eyeSurgeryStatus
    : '';
  const surgeryType = EYE_SURGERIES.some((item) => item.id === input.eyeSurgeryType)
    ? input.eyeSurgeryType
    : '';
  const pathologyCriteria = Array.isArray(settings.ophthalmologyPathologyIds)
    ? settings.ophthalmologyPathologyIds
    : ['cataract'];
  const surgeryCriteria = Array.isArray(settings.ophthalmologySurgeryIds)
    ? settings.ophthalmologySurgeryIds
    : ['cataract'];
  const pathologyIds = normalizePathologies(input.pathologyIds);
  const pathologyMatch = pathologyIds.some((id) => pathologyCriteria.includes(id));
  const surgeryMatch = surgeryStatus === 'yes' && surgeryCriteria.includes(surgeryType);
  const override = ['automatic', 'ophthalmologist', 'optometrist'].includes(input.careRouteOverride)
    ? input.careRouteOverride
    : 'automatic';
  const automaticRoute = enabled && (pathologyMatch || surgeryMatch) ? 'ophthalmologist' : 'optometrist';
  const careRoute = override === 'automatic' ? automaticRoute : override;
  const reasons = [];
  if (pathologyMatch) reasons.push('pathology');
  if (surgeryMatch) reasons.push('surgery');
  if (override !== 'automatic') reasons.push('manual');

  return {
    age,
    surgeryQuestionRequired,
    eyeSurgeryStatus: surgeryStatus,
    eyeSurgeryType: surgeryStatus === 'yes' ? surgeryType : '',
    eyeSurgeryDetails: surgeryStatus === 'yes' && surgeryType === 'other'
      ? String(input.eyeSurgeryDetails || '').trim().slice(0, 120)
      : '',
    careRoute,
    careRouteOverride: override,
    careRouteReasons: reasons
  };
}

export function validateLeadInput(input) {
  const errors = {};
  const fullName = input.fullName?.trim() || '';
  const phone = normalizeBrazilianPhone(input.phone);
  const customerCpf = normalizeCpf(input.customerCpf);
  const customerRg = normalizeRg(input.customerRg);
  const birthDate = String(input.birthDate || '').trim();
  const sex = String(input.sex || '').trim();
  const needsTransport = booleanValue(input.needsTransport);
  const hasCompanion = needsTransport && booleanValue(input.hasCompanion);

  if (fullName.length < 2) errors.fullName = 'Informe o nome do cliente.';
  if (fullName.length > 120) errors.fullName = 'Use no maximo 120 caracteres.';
  if (!phone) errors.phone = 'Informe um telefone com DDD.';
  if (customerCpf && !isValidCpf(customerCpf)) errors.customerCpf = 'Informe um CPF valido.';
  if (customerRg.length > 20) errors.customerRg = 'Use no maximo 20 caracteres.';
  if (birthDate && calculateAge(birthDate) === null) errors.birthDate = 'Informe uma data de nascimento valida.';
  if (!SEX_OPTIONS.some((option) => option.id === sex)) errors.sex = 'Selecione uma opcao valida.';
  if ((input.street?.trim().length || 0) > 120) errors.street = 'Use no maximo 120 caracteres.';
  if (normalizeStreetNumber(input.streetNumber).length > 12) errors.streetNumber = 'Use no maximo 12 caracteres.';
  if ((input.notes?.trim().length || 0) > 500) errors.notes = 'Use no maximo 500 caracteres.';

  const triage = ophthalmologyTriage(input, {
    ophthalmologyRoutingEnabled: input.ophthalmologyRoutingEnabled,
    ophthalmologyMinimumAge: input.ophthalmologyMinimumAge,
    ophthalmologyPathologyIds: input.ophthalmologyPathologyIds,
    ophthalmologySurgeryIds: input.ophthalmologySurgeryIds
  });
  if (triage.surgeryQuestionRequired && !triage.eyeSurgeryStatus) {
    errors.eyeSurgeryStatus = 'Informe se o cliente ja realizou cirurgia nos olhos.';
  }
  if (triage.eyeSurgeryStatus === 'yes' && !triage.eyeSurgeryType) {
    errors.eyeSurgeryType = 'Informe qual cirurgia foi realizada.';
  }
  if (triage.eyeSurgeryStatus === 'yes' && triage.eyeSurgeryType === 'other' && !triage.eyeSurgeryDetails) {
    errors.eyeSurgeryDetails = 'Informe o nome da cirurgia.';
  }

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
  if (input.appointmentServiceId && String(input.appointmentServiceId).length > 120) {
    errors.appointmentServiceId = 'Selecione um servico valido.';
  }
  const transportAllowedWeekdays = Array.isArray(input.transportAllowedWeekdays)
    ? input.transportAllowedWeekdays.map(Number)
    : [];
  if (needsTransport && !booleanValue(input.transportEnabled)) {
    errors.needsTransport = 'O transporte ainda nao esta configurado para esta loja.';
  }
  if (needsTransport && appointmentDate && !transportAllowedWeekdays.includes(weekdayFromDate(appointmentDate))) {
    errors.appointmentDate = 'Escolha um dia com transporte disponivel.';
  }
  if (needsTransport && appointmentDate && appointmentTime && Array.isArray(input.transportHoursRules)
    && !isTransportAppointmentAllowed({
      transportEnabled: booleanValue(input.transportEnabled),
      transportHoursRules: input.transportHoursRules
    }, appointmentDate, appointmentTime, Number(input.appointmentDurationMinutes) || 20)) {
    errors.appointmentTime = 'Escolha um horario dentro da disponibilidade do transporte.';
  }
  const allowedWeekdays = Array.isArray(input.ophthalmologyAllowedWeekdays)
    ? input.ophthalmologyAllowedWeekdays.map(Number)
    : [];
  if (triage.careRoute === 'ophthalmologist' && appointmentDate && allowedWeekdays.length
    && !allowedWeekdays.includes(weekdayFromDate(appointmentDate))) {
    errors.appointmentDate = 'Escolha um dia de atendimento do oftalmologista.';
  }

  return {
    errors,
    isValid: Object.keys(errors).length === 0,
    phone,
    customerCpf,
    customerRg,
    birthDate,
    sex,
    needsTransport,
    hasCompanion,
    transportSeats: needsTransport ? (hasCompanion ? 2 : 1) : 0,
    triage
  };
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
      customerCpf: validation.customerCpf,
      customerRg: validation.customerRg,
      birthDate: validation.birthDate,
      sex: validation.sex,
      street: input.street?.trim() || '',
      streetNumber: normalizeStreetNumber(input.streetNumber),
      neighborhood: input.neighborhood?.trim() || '',
      city: input.city?.trim() || '',
      state: (input.state?.trim() || 'PE').toUpperCase().slice(0, 2),
      interestId: interest.id,
      interestLabel: interest.id ? interest.label : '',
      ...ametropiaData(input),
      ...pathologyData(input),
      eyeSurgeryStatus: validation.triage.eyeSurgeryStatus,
      eyeSurgeryType: validation.triage.eyeSurgeryType,
      eyeSurgeryDetails: validation.triage.eyeSurgeryDetails,
      careRoute: validation.triage.careRoute,
      careRouteOverride: validation.triage.careRouteOverride,
      careRouteReasons: Array.isArray(input.careRouteReasons) ? input.careRouteReasons : [],
      needsTransport: validation.needsTransport,
      hasCompanion: validation.hasCompanion,
      transportSeats: validation.transportSeats,
      appointmentDate: input.appointmentDate?.trim() || '',
      appointmentTime: input.appointmentTime?.trim() || '',
      ...(input.appointmentDate?.trim() ? {
        appointmentAttendance: 'pending',
        appointmentSchedulingMode: input.schedulingMode === 'controlled' ? 'controlled' : 'free',
        appointmentDurationMinutes: Number(input.appointmentDurationMinutes) || 20,
        ...(input.appointmentServiceId ? {
          appointmentServiceId: String(input.appointmentServiceId),
          appointmentServiceName: String(input.appointmentServiceName || 'Exame de vista').trim().slice(0, 80)
        } : {})
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
      customerCpf: validation.customerCpf,
      customerRg: validation.customerRg,
      birthDate: validation.birthDate,
      sex: validation.sex,
      street: input.street?.trim() || '',
      streetNumber: normalizeStreetNumber(input.streetNumber),
      neighborhood: input.neighborhood?.trim() || '',
      city: input.city?.trim() || '',
      state: (input.state?.trim() || 'PE').toUpperCase().slice(0, 2),
      interestId: interest.id,
      interestLabel: interest.id ? interest.label : '',
      ...ametropiaData(input),
      ...pathologyData(input),
      eyeSurgeryStatus: validation.triage.eyeSurgeryStatus,
      eyeSurgeryType: validation.triage.eyeSurgeryType,
      eyeSurgeryDetails: validation.triage.eyeSurgeryDetails,
      careRoute: validation.triage.careRoute,
      careRouteOverride: validation.triage.careRouteOverride,
      careRouteReasons: Array.isArray(input.careRouteReasons) ? input.careRouteReasons : [],
      needsTransport: validation.needsTransport,
      hasCompanion: validation.hasCompanion,
      transportSeats: validation.transportSeats,
      appointmentDate: input.appointmentDate?.trim() || '',
      appointmentTime: input.appointmentTime?.trim() || '',
      ...(input.appointmentDate?.trim() && input.schedulingMode ? {
        appointmentSchedulingMode: input.schedulingMode === 'controlled' ? 'controlled' : 'free',
        appointmentDurationMinutes: Number(input.appointmentDurationMinutes) || 20,
        ...(input.appointmentServiceId ? {
          appointmentServiceId: String(input.appointmentServiceId),
          appointmentServiceName: String(input.appointmentServiceName || 'Exame de vista').trim().slice(0, 80)
        } : {})
      } : {}),
      notes: input.notes?.trim() || ''
    }
  };
}
