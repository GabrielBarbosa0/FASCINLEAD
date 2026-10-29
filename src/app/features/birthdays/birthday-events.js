import { birthdayBenefitLabel } from './birthday-data.js';

export function birthdayBenefitPlannedEvent(lead, profile, campaign, now = new Date()) {
  return {
    leadId: lead.id,
    storeId: lead.storeId,
    eventType: 'birthday_benefit_planned',
    funnelStage: lead.funnelStage || 'captured',
    reasonCode: 'birthday_campaign',
    benefitType: campaign.benefitType,
    benefitValue: Number(campaign.benefitValue) || 0,
    benefitLabel: birthdayBenefitLabel(campaign.benefitType, campaign.benefitValue),
    actorUid: profile.uid,
    actorName: String(profile.displayName || 'Usuario'),
    actorRole: String(profile.role || 'user'),
    occurredAtClient: now.toISOString(),
    schemaVersion: 1
  };
}

export function birthdayCongratulatedEvent(lead, profile, campaign, now = new Date()) {
  return {
    ...birthdayBenefitPlannedEvent(lead, profile, campaign, now),
    eventType: 'birthday_congratulated',
    reasonCode: 'birthday_contact'
  };
}
