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

async function body(response) {
  const text = await response.text()
  try {
    return { text, json: text ? JSON.parse(text) : null }
  } catch {
    return { text, json: null }
  }
}

async function main() {
  const login = await fetch(url('/api/users/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    redirect: 'manual',
  })
  const loginBody = await body(login)
  if (!login.ok || !loginBody.json?.token) {
    throw new Error(`admin login failed: HTTP ${login.status} ${loginBody.text.slice(0, 500)}`)
  }
  const authHeaders = { Authorization: `JWT ${loginBody.json.token}` }
  console.log('PASS admin data smoke login')

  // SEC-022: an admin cannot delete their own account (nor the last one), which
  // would reopen the public first-register page.
  const self = loginBody.json.user?.id
  if (!self) throw new Error(`admin login returned no user id: ${loginBody.text.slice(0, 300)}`)
  const selfDelete = await fetch(url(`/api/users/${self}`), { method: 'DELETE', headers: authHeaders })
  if (selfDelete.status !== 400) {
    throw new Error(`self-delete was not rejected: HTTP ${selfDelete.status} ${(await body(selfDelete)).text.slice(0, 300)}`)
  }
  console.log('PASS admin cannot delete their own account: HTTP 400')

  // The 8-character minimum is enforced by the server, not only the form.
  const shortPassword = await fetch(url('/api/users'), {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'short-password@example.invalid', password: 'abc' }),
  })
  if (shortPassword.status !== 400) {
    throw new Error(`a 3-character password was accepted: HTTP ${shortPassword.status} ${(await body(shortPassword)).text.slice(0, 300)}`)
  }
  console.log('PASS server rejects a password shorter than 8 characters: HTTP 400')

  async function fetchAdminPage(pathname, markers) {
    const response = await fetch(url(pathname), { headers: authHeaders, redirect: 'manual' })
    const result = await body(response)
    if (response.status !== 200) {
      throw new Error(`${pathname}: expected HTTP 200, got ${response.status}: ${result.text.slice(0, 800)}`)
    }
    for (const marker of markers) {
      if (!result.text.includes(marker)) {
        throw new Error(`${pathname}: rendered HTML is missing marker ${JSON.stringify(marker)}`)
      }
    }
    console.log(`PASS admin render ${pathname}`)
    return result.text
  }

  await fetchAdminPage('/admin/orders', ['Очередь заявок', 'Новый заказ'])
  await fetchAdminPage('/admin/orders/new', ['Новый заказ', 'Создать заказ', 'МойСклад и уведомления'])
  await fetchAdminPage('/admin/calendar', ['Календарь'])
  await fetchAdminPage('/admin/stock', ['Склад'])
  await fetchAdminPage('/admin/categories', ['Категории', 'Smoke Cameras', 'Smoke Lenses'])
  await fetchAdminPage('/admin/promo-codes', ['Промокоды'])
  await fetchAdminPage('/admin/promotions', ['Акции'])
  await fetchAdminPage('/admin/settings', ['Тексты и контакты сайта'])
  const usersHtml = await fetchAdminPage('/admin/users', ['Администраторы', adminEmail, 'это вы'])
  if (usersHtml.includes(`>${adminEmail}</span><button`)) {
    throw new Error('current admin unexpectedly renders a delete button beside its own account')
  }

  const analyticsAll = await fetchAdminPage('/admin/analytics', [
    'Аналитика',
    'Выручка по категориям',
    'за всё время',
    'KPI выше остаются общими за всё время',
  ])
  if (!analyticsAll.includes('С даты') || !analyticsAll.includes('По дату')) {
    throw new Error('/admin/analytics is missing date-range controls')
  }

  await fetchAdminPage('/admin/analytics?from=2099-01-02&to=2099-01-01', [
    '01.01.2099 — 02.01.2099',
    'За выбранный период данных нет',
    'Сбросить',
  ])
  await fetchAdminPage('/admin/analytics?from=2099-01-01&to=2099-01-01', [
    '01.01.2099 — 01.01.2099',
    'За выбранный период данных нет',
  ])
  console.log('PASS analytics all-time/reversed/same-day rendering')

  const parentResponse = await fetch(
    url('/api/categories?where[slug][equals]=smoke-cameras&limit=1&depth=0'),
    { headers: authHeaders },
  )
  const parentBody = await body(parentResponse)
  const parent = parentBody.json?.docs?.[0]
  if (!parentResponse.ok || !parent?.id) {
    throw new Error(`seeded parent category not found: ${parentBody.text.slice(0, 500)}`)
  }

  const createCategory = await fetch(url('/api/categories'), {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Smoke Admin CRUD',
      slug: 'smoke-admin-crud',
      description: 'Disposable admin CRUD smoke category',
      tag: 'ADMIN-CREATE',
      order: 9100,
      parent: parent.id,
    }),
  })
  const createdCategoryBody = await body(createCategory)
  const createdCategory = createdCategoryBody.json?.doc || createdCategoryBody.json
  if (!createCategory.ok || !createdCategory?.id) {
    throw new Error(`category create failed: HTTP ${createCategory.status} ${createdCategoryBody.text.slice(0, 700)}`)
  }
  const categoryId = createdCategory.id
  console.log(`PASS admin category create: ${categoryId}`)

  await fetchAdminPage('/admin/categories', ['Smoke Admin CRUD', 'smoke-admin-crud', 'ADMIN-CREATE'])
  await fetchAdminPage(`/admin/categories/${categoryId}`, ['Smoke Admin CRUD', 'ADMIN-CREATE'])

  const patchCategory = await fetch(url(`/api/categories/${categoryId}`), {
    method: 'PATCH',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Smoke Admin CRUD Updated', tag: 'ADMIN-UPDATED', order: 9101 }),
  })
  const patchedCategoryBody = await body(patchCategory)
  const patchedCategory = patchedCategoryBody.json?.doc || patchedCategoryBody.json
  const patchedParent = typeof patchedCategory?.parent === 'object' ? patchedCategory.parent?.id : patchedCategory?.parent
  if (
    !patchCategory.ok ||
    patchedCategory?.name !== 'Smoke Admin CRUD Updated' ||
    patchedCategory?.tag !== 'ADMIN-UPDATED' ||
    Number(patchedParent) !== Number(parent.id)
  ) {
    throw new Error(`category update/parent preservation failed: ${patchedCategoryBody.text.slice(0, 700)}`)
  }
  await fetchAdminPage(`/admin/categories/${categoryId}`, ['Smoke Admin CRUD Updated', 'ADMIN-UPDATED'])
  console.log('PASS admin category update preserves parent')

  const deleteCategory = await fetch(url(`/api/categories/${categoryId}`), {
    method: 'DELETE',
    headers: authHeaders,
  })
  if (!deleteCategory.ok) {
    throw new Error(`category delete failed: HTTP ${deleteCategory.status} ${(await deleteCategory.text()).slice(0, 500)}`)
  }
  const deletedLookup = await fetch(url(`/api/categories/${categoryId}?depth=0`), { headers: authHeaders })
  if (deletedLookup.status !== 404) {
    throw new Error(`deleted category should return 404, got HTTP ${deletedLookup.status}`)
  }
  console.log('PASS admin category delete')

  const secondEmail = 'smoke-second-admin@example.invalid'
  const secondPassword = 'ci-second-admin-password-2026'
  const createUser = await fetch(url('/api/users'), {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: secondEmail, password: secondPassword }),
  })
  const createdUserBody = await body(createUser)
  const createdUser = createdUserBody.json?.doc || createdUserBody.json
  if (!createUser.ok || !createdUser?.id) {
    throw new Error(`second admin create failed: HTTP ${createUser.status} ${createdUserBody.text.slice(0, 700)}`)
  }
  await fetchAdminPage('/admin/users', [adminEmail, secondEmail, 'это вы', 'Удалить'])
  console.log(`PASS second admin visible: ${createdUser.id}`)

  const deleteUser = await fetch(url(`/api/users/${createdUser.id}`), { method: 'DELETE', headers: authHeaders })
  if (!deleteUser.ok) {
    throw new Error(`second admin delete failed: HTTP ${deleteUser.status} ${(await deleteUser.text()).slice(0, 500)}`)
  }
  const usersAfterDelete = await fetchAdminPage('/admin/users', [adminEmail, 'это вы'])
  if (usersAfterDelete.includes(secondEmail)) throw new Error('deleted second admin is still rendered in /admin/users')
  console.log('PASS second admin delete; own account remains')

  // Editing an existing promotion must show its saved photo. The loader used
  // depth 0, so `image` was a bare id and the form's preview stayed empty.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const upload = new FormData()
  upload.append('file', new Blob([png], { type: 'image/png' }), 'smoke-promo.png')
  upload.append('_payload', JSON.stringify({ alt: 'smoke promo image' }))
  const mediaResponse = await fetch(url('/api/media'), { method: 'POST', headers: authHeaders, body: upload })
  const media = (await body(mediaResponse)).json?.doc
  if (!mediaResponse.ok || !media?.id || !media?.url) {
    throw new Error(`promo image upload failed: HTTP ${mediaResponse.status}`)
  }
  const promoResponse = await fetch(url('/api/promotions'), {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Smoke Promo With Photo', slug: `smoke-promo-${Date.now()}`, image: media.id, active: false }),
  })
  const promo = (await body(promoResponse)).json?.doc
  if (!promoResponse.ok || !promo?.id) throw new Error(`promotion create failed: HTTP ${promoResponse.status}`)
  try {
    await fetchAdminPage(`/admin/promotions/${promo.id}`, ['Smoke Promo With Photo', media.filename])
    console.log('PASS promotion edit page shows the saved photo')
  } finally {
    await fetch(url(`/api/promotions/${promo.id}`), { method: 'DELETE', headers: authHeaders })
    await fetch(url(`/api/media/${media.id}`), { method: 'DELETE', headers: authHeaders })
  }

  console.log('Admin data/UI smoke passed')
}

main().catch((error) => {
  console.error('Admin data/UI smoke failed')
  console.error(error)
  process.exit(1)
})
