// Current revisions of the legal documents the customer agrees to. Shown on
// the pages themselves and stored with each order's consent
// (Orders.consentDocuments), so it is provable which text a customer
// accepted. Bump the date whenever a document's text changes.
export const LEGAL_DOCUMENTS = {
  personalDataConsent: { path: '/personal-data-consent', revision: '2026-10-15' },
  privacyPolicy: { path: '/privacy-policy', revision: '2026-09-15' },
  userAgreement: { path: '/user-agreement', revision: '2026-10-01' },
} as const

/** "personal-data-consent@2026-10-15; privacy-policy@…; user-agreement@…" */
export function consentDocumentsStamp(): string {
  return Object.values(LEGAL_DOCUMENTS)
    .map((d) => `${d.path.slice(1)}@${d.revision}`)
    .join('; ')
}

/** 2026-10-15 -> 15.10.2026 */
export function revisionLabel(revision: string): string {
  const [y, m, d] = revision.split('-')
  return `${d}.${m}.${y}`
}
