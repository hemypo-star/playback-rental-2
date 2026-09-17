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

  await fetchAdminPage('/admin/orders', ['Очередь заявок'])
  await fetchAdminPage('/admin/calendar', ['Календарь'])
  await fetchAdminPage('/admin/stock', ['Склад'])
  await fetchAdminPage('/admin/categories', ['Категории', 'Smoke Cameras', 'Smoke Lenses'])
  await fetchAdminPage('/admin/promo-codes', ['Промокоды'])
  await fetchAdminPage('/admin/promotions', ['Акции'])
  await fetchAdminPage('/admin/settings', ['Настройки'])
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

  console.log('Admin data/UI smoke passed')
}

main().catch((error) => {
  console.error('Admin data/UI smoke failed')
  console.error(error)
  process.exit(1)
})
