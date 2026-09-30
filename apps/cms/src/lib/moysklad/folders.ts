import { msPaginate } from './client'

export const ROOT_FOLDER_NAME = 'PlayBack Rental'
export const RENTAL_FOLDER_NAME = 'Аренда оборудования'
export const SALE_FOLDER_NAME = 'На продажу'
// "Оборудование (для учета)" mirrors the same category names as "Аренда
// оборудования" but holds the real physical inventory as Товар (product)
// entities — quantity and images for a rental listing are sourced from
// here (see sync.ts), matched by name to the corresponding Услуга (service)
// entity under "Аренда оборудования", which is where price/category/identity
// for a rental listing actually lives. Confirmed in Phase 1: rental listings
// are modeled as *services*, not products — МойСклад has no stock concept
// for services, hence needing this cross-reference.
export const ACCOUNTING_FOLDER_NAME = 'Оборудование (для учета)'

export interface MsFolder {
  id: string
  name: string
  pathName: string
  meta: { href: string }
}

export async function fetchAllFolders(): Promise<MsFolder[]> {
  const allFolders: MsFolder[] = []
  for await (const page of msPaginate<MsFolder>('/entity/productfolder')) {
    allFolders.push(...page)
  }
  return allFolders
}

/**
 * Resolves the folder ids in a named subtree (the folder itself plus every
 * descendant), matched by exact name + immediate parent path — disambiguates
 * from any unrelated same-named folder elsewhere in this shared account.
 */
export function resolveSubtreeIds(
  allFolders: MsFolder[],
  folderName: string,
  parentPathName: string,
): Set<string> {
  const root = allFolders.find((f) => f.name === folderName && f.pathName === parentPathName)
  if (!root) {
    throw new Error(
      `Could not find folder "${folderName}" under "${parentPathName || '(root)'}" in МойСклад — folder structure may have changed since the Phase 0/1 audit.`,
    )
  }

  const rootFullPath = parentPathName ? `${parentPathName}/${folderName}` : folderName
  const inSubtree = allFolders.filter(
    (f) =>
      f.id === root.id || f.pathName === rootFullPath || f.pathName.startsWith(`${rootFullPath}/`),
  )

  return new Set(inSubtree.map((f) => f.id))
}

export function resolveRentalFolderIds(allFolders: MsFolder[]): Set<string> {
  return resolveSubtreeIds(allFolders, RENTAL_FOLDER_NAME, ROOT_FOLDER_NAME)
}

export function resolveSaleFolderIds(allFolders: MsFolder[]): Set<string> {
  return resolveSubtreeIds(allFolders, SALE_FOLDER_NAME, ROOT_FOLDER_NAME)
}

export function resolveAccountingFolderIds(allFolders: MsFolder[]): Set<string> {
  return resolveSubtreeIds(allFolders, ACCOUNTING_FOLDER_NAME, ROOT_FOLDER_NAME)
}
