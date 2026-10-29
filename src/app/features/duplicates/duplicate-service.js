import { collection, getDocs, limit, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../../../firebase/client.js';
import { duplicateSearchTerms, rankDuplicateCandidates } from './duplicate-detector.js';

const DUPLICATE_QUERY_LIMIT = 8;

function duplicateQuery(field, value) {
  return getDocs(query(collection(db, 'leads'), where(field, '==', value), limit(DUPLICATE_QUERY_LIMIT)));
}

export async function findDuplicateLeads(values = {}) {
  const search = duplicateSearchTerms(values);
  if (!isFirebaseConfigured || (!search.customerCpf && !search.phoneSearch)) return [];

  const requests = [];
  if (search.customerCpf.length === 11) requests.push(duplicateQuery('customerCpf', search.customerCpf));
  if (search.phoneSearch) requests.push(duplicateQuery('phoneSearch', search.phoneSearch));
  const snapshots = await Promise.all(requests);
  const candidates = snapshots.flatMap((snapshot) => snapshot.docs.map((lead) => ({ id: lead.id, ...lead.data() })));
  return rankDuplicateCandidates(values, candidates);
}
