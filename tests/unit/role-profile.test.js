import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSION_IDS,
  SYSTEM_ROLE_PROFILES,
  hasPermission,
  validateRoleProfile
} from '../../src/utils/role-profile.js';

describe('role profiles', () => {
  it('keeps the administrator profile with every permission', () => {
    const admin = SYSTEM_ROLE_PROFILES.find((profile) => profile.baseRole === 'admin');
    expect(admin.permissions).toEqual(ALL_PERMISSION_IDS);
    expect(hasPermission({ role: 'admin', permissions: [] }, 'roles.manage')).toBe(true);
  });

  it('keeps the receptionist focused on front-desk scheduling', () => {
    const receptionist = SYSTEM_ROLE_PROFILES.find((profile) => profile.id === 'system-receptionist');

    expect(receptionist).toMatchObject({
      name: 'Atendente de balcao',
      scope: 'stores',
      baseRole: 'manager',
      system: true
    });
    expect(receptionist.permissions).toEqual([
      'leads.create',
      'leads.view_own',
      'leads.edit_own',
      'appointments.view',
      'appointments.attendance'
    ]);
    expect(receptionist.permissions).not.toContain('management.view');
    expect(receptionist.permissions).not.toContain('reports.view');
  });

  it('creates an own-data profile without team permissions', () => {
    const result = validateRoleProfile({
      name: 'Captador externo',
      scope: 'own',
      permissions: ['leads.create', 'appointments.view']
    });

    expect(result.isValid).toBe(true);
    expect(result.data.baseRole).toBe('captor');
    expect(result.data.permissions).toEqual(['leads.create']);
  });

  it('adds management access when a dependent team feature is enabled', () => {
    const result = validateRoleProfile({
      name: 'Analista regional',
      scope: 'stores',
      permissions: ['reports.view']
    });

    expect(result.isValid).toBe(true);
    expect(result.data.permissions).toEqual(['reports.view', 'management.view']);
  });

  it('requires a name and at least one permission', () => {
    const result = validateRoleProfile({ name: 'A', scope: 'own', permissions: [] });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(expect.objectContaining({ name: expect.any(String), permissions: expect.any(String) }));
  });
});
