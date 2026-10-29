import { describe, expect, it } from 'vitest';
import {
  ALL_PERMISSION_IDS,
  SYSTEM_ROLE_PROFILES,
  hasPermission,
  normalizeRolePermissions,
  systemRoleProfileForId,
  validateRoleProfile
} from '../../src/utils/role-profile.js';

describe('role profiles', () => {
  it('keeps the administrator profile with every permission', () => {
    const admin = SYSTEM_ROLE_PROFILES.find((profile) => profile.baseRole === 'admin');
    expect(admin.permissions).toEqual(ALL_PERMISSION_IDS);
    expect(hasPermission({ role: 'admin', permissions: [] }, 'roles.manage')).toBe(true);
  });

  it('provides a standard MEI profile with collaborator permissions', () => {
    const collaborator = SYSTEM_ROLE_PROFILES.find((profile) => profile.id === 'system-captor');
    const mei = SYSTEM_ROLE_PROFILES.find((profile) => profile.id === 'system-mei');
    expect(mei).toMatchObject({ name: 'MEI', scope: 'own', baseRole: 'captor', system: true });
    expect(mei.permissions).toEqual(collaborator.permissions);
  });

  it('allows the receptionist to update clinical data from the assigned stores', () => {
    const receptionist = SYSTEM_ROLE_PROFILES.find((profile) => profile.id === 'system-receptionist');

    expect(receptionist).toMatchObject({
      name: 'Atendente Balcão',
      scope: 'stores',
      baseRole: 'manager',
      system: true
    });
    expect(receptionist.permissions).toEqual([
      'leads.create',
      'leads.view_own',
      'leads.edit_own',
      'followups.own',
      'management.view',
      'leads.clinical_update',
      'appointments.view',
      'appointments.attendance'
    ]);
    expect(receptionist.permissions).not.toContain('dashboard.view');
    expect(systemRoleProfileForId('system-receptionist')).toBe(receptionist);
    expect(systemRoleProfileForId('missing-profile')).toBeNull();
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

  it('allows deletion permission in own-data and store profiles', () => {
    expect(normalizeRolePermissions('own', ['leads.delete'])).toEqual(['leads.delete']);
    expect(normalizeRolePermissions('stores', ['leads.delete'])).toEqual(['leads.delete']);
  });

  it('adds management access when a dependent team feature is enabled', () => {
    const result = validateRoleProfile({
      name: 'Analista regional',
      scope: 'stores',
      permissions: ['dashboard.view']
    });

    expect(result.isValid).toBe(true);
    expect(result.data.permissions).toEqual(['dashboard.view', 'management.view']);
  });

  it('normalizes editable system permissions and permits an empty selection', () => {
    expect(normalizeRolePermissions('stores', [])).toEqual([]);
    expect(normalizeRolePermissions('stores', ['dashboard.view'])).toEqual(['dashboard.view', 'management.view']);
    expect(normalizeRolePermissions('own', ['leads.create', 'unknown.permission'])).toEqual(['leads.create']);
  });

  it('requires a name and at least one permission', () => {
    const result = validateRoleProfile({ name: 'A', scope: 'own', permissions: [] });
    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(expect.objectContaining({ name: expect.any(String), permissions: expect.any(String) }));
  });
});
