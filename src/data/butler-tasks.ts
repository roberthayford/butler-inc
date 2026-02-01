/**
 * Task options for each butler type
 * 
 * Used in the reservation form to help users select what they need.
 * Each butler type has predefined tasks, with an "Other" option available.
 */

import type { ButlerTypeKey } from './pricing-config';

export interface ButlerTask {
  id: string;
  label: string;
}

/**
 * Task options for each butler type
 * 
 * Phase 1: Only Busy Butler tasks are actively used
 * Other butler tasks are defined for Phase 2 implementation
 */
export const BUTLER_TASKS: Record<ButlerTypeKey, ButlerTask[]> = {
  busy: [
    { id: 'courier', label: 'Courier/delivery' },
    { id: 'document', label: 'Document pickup' },
    { id: 'shopping', label: 'Urgent shopping' },
  ],
  baby: [
    { id: 'school-run', label: 'School run' },
    { id: 'childcare-logistics', label: 'Childcare logistics' },
    { id: 'elderly-check', label: 'Elderly welfare check' },
  ],
  bougie: [
    { id: 'luxury-sourcing', label: 'Luxury sourcing' },
    { id: 'vip-access', label: 'VIP event access' },
    { id: 'exclusive-reservations', label: 'Exclusive reservations' },
  ],
  base: [
    { id: 'key-holding', label: 'Key holding' },
    { id: 'tradesman-coordination', label: 'Tradesman coordination' },
    { id: 'property-check', label: 'Property check' },
  ],
  budget: [
    { id: 'general-errands', label: 'General errands' },
    { id: 'non-urgent-shopping', label: 'Non-urgent shopping' },
    { id: 'returns-exchanges', label: 'Returns/exchanges' },
  ],
  bespoke: [], // Bespoke butler uses free-text description only
};
