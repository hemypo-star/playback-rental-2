const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000'
const adminEmail = process.env.SMOKE_ADMIN_EMAIL
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD

if (!adminEmail || !adminPassword) {
  console.error('SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD are required')
  process.exit(1)
}

function url(pathname) {
  return new URL(pathname, baseUrl).toString()
}

async function parse(response) {
  const text = await response.text()
  try {
    return { text, json: text ? JSON.parse(text) : null }
  } catch {
    return { text, json: null }
  }
}

function documentFrom(body) {
  return body?.doc || body
}

async function login(email, password) {
  const response = await fetch(url('/api/users/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const result = await parse(response)
  if (!response.ok || !result.json?.token || !result.json?.user?.id) {
    throw new Error(`login failed: HTTP ${response.status} ${result.text.slice(0, 600)}`)
  }
  return result.json
}

async function main() {
  let session = await login(adminEmail, adminPassword)
  let authHeaders = { Authorization: `JWT ${session.token}` }
  const ownId = session.user.id
  console.log('PASS content smoke admin login')

  // SiteSettings: send a full document, change two distant fields, verify an
  // unrelated field and the array survive, then restore the original doc.
  const settingsGet = await fetch(url('/api/globals/site-settings?depth=0'), { headers: authHeaders })
  const settingsResult = await parse(settingsGet)
  if (!settingsGet.ok || !settingsResult.json) {
    throw new Error(`site settings GET failed: HTTP ${settingsGet.status} ${settingsResult.text.slice(0, 600)}`)
  }
  const originalSettings = settingsResult.json
  const settingsPayload = { ...originalSettings }
  delete settingsPayload.id
  delete settingsPayload.createdAt
  delete settingsPayload.updatedAt
  settingsPayload.heroKicker = 'Smoke settings kicker'
  settingsPayload.contactHours = '11:00 — 20:00'

  const settingsSave = await fetch(url('/api/globals/site-settings'), {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(settingsPayload),
  })
  const settingsSaveResult = await parse(settingsSave)
  if (!settingsSave.ok) {
    throw new Error(`site settings save failed: HTTP ${settingsSave.status} ${settingsSaveResult.text.slice(0, 700)}`)
  }

  const settingsVerify = await fetch(url('/api/globals/site-settings?depth=0'), { headers: authHeaders })
  const settingsVerifyResult = await parse(settingsVerify)
  const changed = settingsVerifyResult.json
  if (
    !settingsVerify.ok ||
    changed?.heroKicker !== 'Smoke settings kicker' ||
    changed?.contactHours !== '11:00 — 20:00' ||
    changed?.contactEmail !== originalSettings.contactEmail ||
    JSON.stringify(changed?.howItWorksSteps || []) !== JSON.stringify(originalSettings.howItWorksSteps || [])
  ) {
    throw new Error(`site settings full-save preservation failed: ${settingsVerifyResult.text.slice(0, 900)}`)
  }
  console.log('PASS SiteSettings full-object save preserves unrelated fields')

  const restoreSettings = { ...originalSettings }
  delete restoreSettings.id
  delete restoreSettings.createdAt
  delete restoreSettings.updatedAt
  const restoreSettingsResponse = await fetch(url('/api/globals/site-settings'), {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify(restoreSettings),
  })
  if (!restoreSettingsResponse.ok) {
    throw new Error(`site settings restore failed: HTTP ${restoreSettingsResponse.status} ${(await restoreSettingsResponse.text()).slice(0, 500)}`)
  }

  // Product edit boundary: mutate only admin-owned fields and verify
  // sync-owned identity/listing fields remain byte-for-byte unchanged.
  const productSearch = await fetch(
    url('/api/products?where[moySkladId][equals]=smoke-ci-camera-001&limit=1&depth=0'),
    { headers: authHeaders },
  )
  const productSearchResult = await parse(productSearch)
  const product = productSearchResult.json?.docs?.[0]
  if (!productSearch.ok || !product?.id) {
    throw new Error(`seeded smoke product not found: ${productSearchResult.text.slice(0, 600)}`)
  }
  const syncOwnedBefore = {
    title: product.title,
    listingType: product.listingType,
    moySkladId: product.moySkladId,
    moySkladInventoryProductId: product.moySkladInventoryProductId ?? null,
    moySkladCode: product.moySkladCode ?? null,
    lastSyncedAt: product.lastSyncedAt ?? null,
  }
  const productPatch = await fetch(url(`/api/products/${product.id}`), {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subtitle: 'Smoke admin subtitle updated',
      tag: 'SMOKE-ADMIN',
      available: false,
      isKit: true,
      oldPrice: 1800,
      kitItems: [{ label: 'Smoke body' }, { label: 'Smoke battery' }],
    }),
  })
  const productPatchResult = await parse(productPatch)
  const productAfter = documentFrom(productPatchResult.json)
  if (!productPatch.ok || !productAfter) {
    throw new Error(`product admin-owned edit failed: HTTP ${productPatch.status} ${productPatchResult.text.slice(0, 700)}`)
  }
  const syncOwnedAfter = {
    title: productAfter.title,
    listingType: productAfter.listingType,
    moySkladId: productAfter.moySkladId,
    moySkladInventoryProductId: productAfter.moySkladInventoryProductId ?? null,
    moySkladCode: productAfter.moySkladCode ?? null,
    lastSyncedAt: productAfter.lastSyncedAt ?? null,
  }
  if (
    productAfter.subtitle !== 'Smoke admin subtitle updated' ||
    productAfter.tag !== 'SMOKE-ADMIN' ||
    productAfter.available !== false ||
    productAfter.isKit !== true ||
    JSON.stringify(syncOwnedAfter) !== JSON.stringify(syncOwnedBefore)
  ) {
    throw new Error(`product ownership boundary failed: ${JSON.stringify({ syncOwnedBefore, syncOwnedAfter, productAfter })}`)
  }
  console.log('PASS product admin-owned edit preserves sync-owned identity fields')

  // Restore the smoke product so the disposable fixture remains reusable by
  // later checks in this same workflow.
  const restoreProduct = await fetch(url(`/api/products/${product.id}`), {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subtitle: product.subtitle ?? '',
      tag: product.tag ?? '',
      available: product.available,
      isKit: product.isKit,
      oldPrice: product.oldPrice ?? null,
      kitItems: product.kitItems ?? [],
    }),
  })
  if (!restoreProduct.ok) throw new Error(`product restore failed: HTTP ${restoreProduct.status}`)

  // Media fixture: alt edit must persist, admin media page must render it,
  // then the same media can satisfy the required image relationship for a
  // disposable promotion CRUD check.
  const mediaSearch = await fetch(
    url('/api/media?where[filename][equals]=smoke-admin-media.png&limit=1&depth=0'),
    { headers: authHeaders },
  )
  const mediaSearchResult = await parse(mediaSearch)
  const media = mediaSearchResult.json?.docs?.[0]
  if (!mediaSearch.ok || !media?.id) {
    throw new Error(`seeded smoke media not found: ${mediaSearchResult.text.slice(0, 600)}`)
  }
  const mediaPatch = await fetch(url(`/api/media/${media.id}`), {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ alt: 'Smoke admin media updated alt' }),
  })
  const mediaPatchResult = await parse(mediaPatch)
  const mediaAfter = documentFrom(mediaPatchResult.json)
  if (!mediaPatch.ok || mediaAfter?.alt !== 'Smoke admin media updated alt') {
    throw new Error(`media alt edit failed: ${mediaPatchResult.text.slice(0, 600)}`)
  }
  const mediaPage = await fetch(url('/admin/media'), { headers: authHeaders })
  const mediaPageText = await mediaPage.text()
  if (!mediaPage.ok || !mediaPageText.includes('Smoke admin media updated alt')) {
    throw new Error('/admin/media does not render updated alt text')
  }
  console.log('PASS media upload fixture and alt edit visible in admin')

  const promotionCreate = await fetch(url('/api/promotions'), {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Smoke Promotion CRUD',
      kicker: 'Smoke kicker',
      text: 'Smoke short copy',
      content: 'Smoke long copy',
      image: media.id,
      active: true,
      order: 9200,
    }),
  })
  const promotionCreateResult = await parse(promotionCreate)
  const promotion = documentFrom(promotionCreateResult.json)
  if (!promotionCreate.ok || !promotion?.id || !promotion?.slug) {
    throw new Error(`promotion create/slug generation failed: ${promotionCreateResult.text.slice(0, 700)}`)
  }
  const promotionPage = await fetch(url(`/promotions/${promotion.slug}`))
  const promotionPageText = await promotionPage.text()
  if (!promotionPage.ok || !promotionPageText.includes('Smoke Promotion CRUD') || !promotionPageText.includes('Smoke long copy')) {
    throw new Error('public promotion page did not render the created promotion')
  }

  const promotionPatch = await fetch(url(`/api/promotions/${promotion.id}`), {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Smoke Promotion Updated', active: false, order: 9201 }),
  })
  const promotionPatchResult = await parse(promotionPatch)
  const promotionAfter = documentFrom(promotionPatchResult.json)
  if (!promotionPatch.ok || promotionAfter?.title !== 'Smoke Promotion Updated' || promotionAfter?.active !== false) {
    throw new Error(`promotion update failed: ${promotionPatchResult.text.slice(0, 700)}`)
  }
  const promotionDelete = await fetch(url(`/api/promotions/${promotion.id}`), { method: 'DELETE', headers: authHeaders })
  if (!promotionDelete.ok) throw new Error(`promotion delete failed: HTTP ${promotionDelete.status}`)
  console.log('PASS promotion create/public render/update/delete')

  // Password change and fresh login, then restore the original password so
  // subsequent disposable checks can keep using the standard fixture secret.
  const changedPassword = 'ci-smoke-password-changed-2026'
  const passwordPatch = await fetch(url(`/api/users/${ownId}`), {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: changedPassword }),
  })
  if (!passwordPatch.ok) {
    throw new Error(`own password change failed: HTTP ${passwordPatch.status} ${(await passwordPatch.text()).slice(0, 500)}`)
  }
  session = await login(adminEmail, changedPassword)
  authHeaders = { Authorization: `JWT ${session.token}` }
  console.log('PASS fresh login with changed password')

  const restorePassword = await fetch(url(`/api/users/${ownId}`), {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: adminPassword }),
  })
  if (!restorePassword.ok) throw new Error(`password restore failed: HTTP ${restorePassword.status}`)
  await login(adminEmail, adminPassword)
  console.log('PASS original admin password restored')

  const mediaDelete = await fetch(url(`/api/media/${media.id}`), { method: 'DELETE', headers: authHeaders })
  if (!mediaDelete.ok) {
    throw new Error(`media delete failed after promotion cleanup: HTTP ${mediaDelete.status} ${(await mediaDelete.text()).slice(0, 500)}`)
  }
  console.log('PASS disposable media delete after references removed')

  console.log('Admin content/settings/media/password smoke passed')
}

main().catch((error) => {
  console.error('Admin content/settings/media/password smoke failed')
  console.error(error)
  process.exit(1)
})
