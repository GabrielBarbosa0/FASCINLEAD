import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { calculateGoalProgress, GOAL_METRIC, validateGoal } from '../utils/goal.js';

export const GOALS_LEAD_LIMIT = 1000;

function canManageGoals(profile) {
  return ['manager', 'admin'].includes(profile?.role);
}

function localDayStart(date) {
  return new Date(`${date}T00:00:00`).toISOString();
}

function localDayAfter(date) {
  const nextDay = new Date(`${date}T00:00:00`);
  nextDay.setDate(nextDay.getDate() + 1);
  return nextDay.toISOString();
}

async function loadGoals(profile) {
  const constraints = [];
  if (profile.role === 'manager') constraints.push(where('storeId', '==', profile.storeId));
  if (profile.role === 'captor') constraints.push(where('assigneeUid', '==', profile.uid));

  const snapshot = await getDocs(query(collection(db, 'goals'), ...constraints));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

async function loadMembers(profile) {
  if (!canManageGoals(profile)) return [];
  const usersQuery = profile.role === 'manager'
    ? query(collection(db, 'users'), where('storeId', '==', profile.storeId))
    : collection(db, 'users');
  const snapshot = await getDocs(usersQuery);

  return snapshot.docs
    .map((item) => ({ uid: item.id, ...item.data() }))
    .filter((member) => member.active === true && member.role === 'captor')
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pt-BR'));
}

async function loadProgressLeads(profile, goals) {
  if (!goals.length) return { leads: [], truncated: false };
  const startDate = goals.reduce((minimum, goal) => goal.startDate < minimum ? goal.startDate : minimum, goals[0].startDate);
  const endDate = goals.reduce((maximum, goal) => goal.endDate > maximum ? goal.endDate : maximum, goals[0].endDate);
  const constraints = [
    where('capturedAtClient', '>=', localDayStart(startDate)),
    where('capturedAtClient', '<', localDayAfter(endDate)),
    orderBy('capturedAtClient', 'desc'),
    limit(GOALS_LEAD_LIMIT + 1)
  ];

  if (profile.role === 'manager') constraints.unshift(where('storeId', '==', profile.storeId));
  if (profile.role === 'captor') constraints.unshift(where('capturedByUid', '==', profile.uid));

  const snapshot = await getDocs(query(collection(db, 'leads'), ...constraints));
  return {
    leads: snapshot.docs.slice(0, GOALS_LEAD_LIMIT).map((item) => ({ id: item.id, ...item.data() })),
    truncated: snapshot.size > GOALS_LEAD_LIMIT
  };
}

export async function loadGoalsDashboard(profile) {
  if (!isFirebaseConfigured || !profile?.uid) throw new Error('Metas indisponiveis.');
  const [goals, members] = await Promise.all([loadGoals(profile), loadMembers(profile)]);
  const { leads, truncated } = await loadProgressLeads(profile, goals);
  const progress = goals
    .map((goal) => calculateGoalProgress(goal, leads))
    .sort((a, b) => a.endDate.localeCompare(b.endDate) || a.assigneeName.localeCompare(b.assigneeName, 'pt-BR'));

  return { goals: progress, members, truncated };
}

export async function createGoals(profile, values, members) {
  if (!isFirebaseConfigured || !canManageGoals(profile)) {
    const error = new Error('Seu perfil nao pode criar metas.');
    error.code = 'permission-denied';
    throw error;
  }

  const validation = validateGoal(values);
  if (!validation.isValid) return validation;
  const selectedMembers = validation.data.assigneeUids
    .map((uid) => members.find((member) => member.uid === uid))
    .filter(Boolean);
  if (selectedMembers.length !== validation.data.assigneeUids.length) {
    return { ...validation, isValid: false, errors: { assigneeUids: 'Um dos colaboradores selecionados nao esta disponivel.' } };
  }
  if (profile.role === 'manager' && (
    validation.data.storeId !== profile.storeId
    || selectedMembers.some((member) => member.storeId !== profile.storeId)
  )) {
    const error = new Error('O gestor so pode criar metas para sua propria equipe.');
    error.code = 'permission-denied';
    throw error;
  }

  const batch = writeBatch(db);
  const groupId = crypto.randomUUID();
  selectedMembers.forEach((member) => {
    const goalRef = doc(collection(db, 'goals'));
    batch.set(goalRef, {
      title: validation.data.title,
      metric: GOAL_METRIC,
      targetCount: validation.data.targetCount,
      startDate: validation.data.startDate,
      endDate: validation.data.endDate,
      storeId: validation.data.storeId,
      assigneeUid: member.uid,
      assigneeName: member.displayName,
      createdByUid: profile.uid,
      createdByName: profile.displayName,
      createdAt: serverTimestamp(),
      groupId,
      schemaVersion: 1
    });
  });
  await batch.commit();
  return validation;
}

export async function deleteGoal(profile, goal) {
  if (!isFirebaseConfigured || !canManageGoals(profile)
    || (profile.role === 'manager' && goal.storeId !== profile.storeId)) {
    const error = new Error('Seu perfil nao pode excluir esta meta.');
    error.code = 'permission-denied';
    throw error;
  }
  await deleteDoc(doc(db, 'goals', goal.id));
}
