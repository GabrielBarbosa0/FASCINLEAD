import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/client.js';
import { canAccessStore } from '../utils/permissions.js';
import { normalizeCpf } from '../utils/savwin-matching.js';

function assertAuthorized(profile, lead) {
  if (!isFirebaseConfigured || !['manager', 'admin'].includes(profile?.role)
    || (profile.role === 'manager' && !canAccessStore(profile, lead?.storeId))) {
    const error = new Error('Registro de venda nao autorizado.');
    error.code = 'permission-denied';
    throw error;
  }
}

export async function loadLeadSaleTracking(profile, lead) {
  assertAuthorized(profile, lead);
  const snapshot = await getDoc(doc(db, 'leadSales', lead.id));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function saveLeadSaleTracking(profile, lead, cpf, selectedSale = null) {
  assertAuthorized(profile, lead);
  const reference = doc(db, 'leadSales', lead.id);
  const existing = await getDoc(reference);
  const data = {
    leadId: lead.id,
    storeId: lead.storeId,
    capturedByUid: lead.capturedByUid,
    customerCpf: normalizeCpf(cpf),
    purchaseInterest: true,
    matchStatus: selectedSale ? 'sale_linked' : 'interest_registered',
    savwinStoreCode: String(selectedSale?.storeCode || ''),
    savwinOsNumber: String(selectedSale?.osNumber || ''),
    savwinSaleCode: String(selectedSale?.saleCode || ''),
    savwinCustomerCode: String(selectedSale?.customerCode || ''),
    savwinSaleDate: String(selectedSale?.saleDate || ''),
    savwinSaleValue: Number(selectedSale?.saleValue || 0),
    createdByUid: existing.data()?.createdByUid || profile.uid,
    createdAt: existing.data()?.createdAt || serverTimestamp(),
    updatedByUid: profile.uid,
    updatedAt: serverTimestamp(),
    schemaVersion: 1
  };
  await setDoc(reference, data);
  return data;
}
