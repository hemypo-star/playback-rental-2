import { test } from 'node:test'
import assert from 'node:assert/strict'
import { typo, typoFields } from './typography'

const NBSP = ' '

test('non-breaking space after short words and before a dash, real dash and quotes', () => {
  assert.equal(
    typo('Техника для съёмки в аренду - быстро и без "сюрпризов"'),
    `Техника для${NBSP}съёмки в${NBSP}аренду${NBSP}— быстро и${NBSP}без${NBSP}«сюрпризов»`,
  )
})

test('abbreviations', () => {
  assert.equal(typo('г. Кемерово, ул. Демьяна Бедного'), `г.${NBSP}Кемерово, ул.${NBSP}Демьяна Бедного`)
})

test('leaves phones, e-mails and links alone and emits no HTML', () => {
  const out = typo('Звоните +7 (996) 527-00-26, почта site@example.ru, сайт https://playbackrental.ru')
  assert.ok(out.includes('+7 (996) 527-00-26'))
  assert.ok(out.includes('site@example.ru'))
  assert.ok(out.includes('https://playbackrental.ru'))
  assert.ok(!/[<>]|&\w+;/.test(out))
})

test('keeps model numbers and thread sizes as typed', () => {
  const out = typo('Аккумулятор 10000 мАч, резьба 1/4')
  assert.ok(out.includes('10000'))
  assert.ok(out.includes('1/4'))
})

test('is idempotent and passes empty values through', () => {
  const once = typo('Камера и штатив в одном наборе')
  assert.equal(typo(once), once)
  assert.equal(typo(''), '')
  assert.equal(typo(null), null)
  assert.equal(typo(undefined), undefined)
})

test('typoFields touches only the listed string fields', () => {
  const src = { title: 'Камера и штатив', phone: '+7 900 000-00-00', price: 1500 }
  const out = typoFields(src, ['title', 'price'])
  assert.equal(out.title, `Камера и${NBSP}штатив`)
  assert.equal(out.phone, src.phone)
  assert.equal(out.price, 1500)
  assert.equal(src.title, 'Камера и штатив')
})
