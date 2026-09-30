import { PREFERENCE_KEYS } from 'payload/shared';
import { getPreferences } from '../../../../../utilities/getPreferences.js';
export async function getItemsFromPreferences(payload, user) {
  const savedPreferences = await getPreferences(PREFERENCE_KEYS.DASHBOARD_LAYOUT, payload, user.id, user.collection);
  if (!savedPreferences?.value || typeof savedPreferences.value !== 'object' || !('layouts' in savedPreferences.value)) {
    return null;
  }
  return savedPreferences.value.layouts;
}
//# sourceMappingURL=getItemsFromPreferences.js.map