import { describe, expect, it } from 'vitest';
import {
  defaultAppointmentService,
  normalizeAppointmentService,
  servicesForStore,
  validateAppointmentService
} from '../../src/utils/service-catalog.js';

describe('appointment service catalog', () => {
  it('creates a compatible default eye exam', () => {
    expect(defaultAppointmentService(['loja-02', 'loja-06'], 30)).toMatchObject({
      id: 'default-eye-exam',
      name: 'Exame de vista',
      storeIds: ['loja-02', 'loja-06'],
      durationMinutes: 30,
      active: true
    });
  });

  it('normalizes and validates service data', () => {
    expect(normalizeAppointmentService({
      name: '  Retorno  ',
      storeIds: ['LOJA-06', 'loja-02', 'loja-06'],
      durationMinutes: '15',
      active: 'true'
    })).toEqual({
      name: 'Retorno',
      storeIds: ['loja-06', 'loja-02'],
      durationMinutes: 15,
      active: true,
      schemaVersion: 2
    });
    expect(validateAppointmentService({ name: 'A', storeIds: ['loja-03'], durationMinutes: 2 })).toMatchObject({
      isValid: false,
      errors: {
        name: expect.any(String),
        storeIds: expect.any(String),
        durationMinutes: expect.any(String)
      }
    });
  });

  it('returns only active services from the selected store', () => {
    const services = [
      { id: 'b', name: 'Retorno', storeIds: ['loja-04', 'loja-06'], active: true },
      { id: 'a', name: 'Exame', storeIds: ['loja-02', 'loja-06'], active: true },
      { id: 'c', name: 'Inativo', storeIds: ['loja-06'], active: false },
      { id: 'd', name: 'Outra loja', storeIds: ['loja-02'], active: true }
    ];
    expect(servicesForStore(services, 'loja-06').map((item) => item.id)).toEqual(['a', 'b']);
  });
});
