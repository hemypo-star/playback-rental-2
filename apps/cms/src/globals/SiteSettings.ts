import type { GlobalConfig } from 'payload'

// Replaces the old app's generic key/value `settings` table — the only key
// that was ever actually read from it (grepped the old codebase) was
// 'hero_banner_image'. Payload Globals are the right fit for this kind of
// singleton site config, vs. a collection of arbitrary rows.
//
// Everything on the storefront that isn't catalog data (product/category
// listings) lives here, editable without a deploy — the hero copy, the
// static business facts on the homepage, the "how it works" steps, the CTA
// banner, and contact details (which Footer.astro and the homepage CTA both
// read, so there's one source of truth instead of the two copies that
// existed before this).
export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  admin: {
    description: 'Site-wide settings and copy — everything on the storefront outside the catalog itself.',
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Главная — герой',
          fields: [
            {
              name: 'heroBannerImage',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Homepage hero background image (desktop, ~1600x2000).' },
            },
            {
              name: 'heroBannerImageMobile',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Homepage hero background image (mobile, ~1080x1350). Falls back to the desktop image if unset.' },
            },
            { name: 'heroKicker', type: 'text', defaultValue: 'Прокат съёмочной техники' },
            { name: 'heroCity', type: 'text', defaultValue: 'Кемерово' },
            { name: 'heroHeadline', type: 'text', defaultValue: 'Техника для съёмки без залога' },
            {
              name: 'heroSubtext',
              type: 'textarea',
              defaultValue: 'Камеры Sony и Canon, объективы, свет, стедикамы, дроны, звук и аксессуары — весь парк для съёмочной группы любого масштаба, в Кемерове.',
            },
          ],
        },
        {
          label: 'Главная — факты и шаги',
          fields: [
            { name: 'depositLabel', type: 'text', defaultValue: '0 ₽', admin: { description: 'Statistic tile value (deposit amount).' } },
            { name: 'depositCaption', type: 'text', defaultValue: 'Залог' },
            { name: 'pickupTimeLabel', type: 'text', defaultValue: '10 мин', admin: { description: 'Statistic tile value (pickup turnaround).' } },
            { name: 'pickupTimeCaption', type: 'text', defaultValue: 'Выдача по паспорту' },
            {
              name: 'howItWorksSteps',
              type: 'array',
              minRows: 1,
              maxRows: 6,
              defaultValue: [
                { title: 'Выбираете даты', text: 'Каталог сразу показывает, что свободно на выбранные даты.' },
                { title: 'Оставляете заявку', text: 'Имя и телефон — без регистрации. Перезвоним и подтвердим бронь.' },
                { title: 'Забираете технику', text: 'Приезжаете по адресу, получаете оборудование, короткий инструктаж.' },
                { title: 'Возвращаете', text: 'В оговорённый срок, по тому же адресу.' },
              ],
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'text', type: 'text', required: true },
              ],
            },
          ],
        },
        {
          label: 'Главная — блок «Нужен совет»',
          fields: [
            { name: 'ctaKicker', type: 'text', defaultValue: 'Нужен совет' },
            { name: 'ctaHeadline', type: 'text', defaultValue: 'Не знаете, что взять на съёмку?' },
            {
              name: 'ctaSubtext',
              type: 'textarea',
              defaultValue: 'Опишите задачу — соберём комплект под неё и посчитаем стоимость на ваши даты.',
            },
          ],
        },
        {
          label: 'Контакты',
          fields: [
            { name: 'contactPhone', type: 'text', defaultValue: '+7 (996) 527-0026' },
            { name: 'contactEmail', type: 'text', defaultValue: 'PlaybackRental@yandex.ru' },
            { name: 'contactTelegram', type: 'text', defaultValue: '@Playbackrental_admin', admin: { description: 'Handle shown in the UI (e.g. "@name").' } },
            { name: 'contactTelegramUrl', type: 'text', defaultValue: 'https://t.me/Playbackrental_admin' },
            { name: 'contactVkUrl', type: 'text', defaultValue: 'https://vk.com/playbackrental' },
            { name: 'contactAddress', type: 'text', defaultValue: 'г. Кемерово, ул. Демьяна Бедного, 6' },
            { name: 'contactHours', type: 'text', defaultValue: '10:00 — 21:00' },
            { name: 'yandexMapsUrl', type: 'text', defaultValue: 'https://yandex.ru/maps/-/CHvDmII7' },
            { name: 'twoGisUrl', type: 'text', defaultValue: 'https://go.2gis.com/2y9MJ' },
          ],
        },
      ],
    },
  ],
}
