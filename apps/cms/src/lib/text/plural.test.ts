import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { pluralRu } from './plural'

const positions = (n: number) => `${n} ${pluralRu(n, 'позиция', 'позиции', 'позиций')}`

describe('pluralRu', () => {
  it('uses the singular for 1 and anything ending in 1', () => {
    assert.equal(positions(1), '1 позиция')
    assert.equal(positions(21), '21 позиция')
    assert.equal(positions(101), '101 позиция')
  })

  it('uses the few form for 2-4 and anything ending in them', () => {
    for (const n of [2, 3, 4, 22, 34, 103]) assert.equal(positions(n).split(' ')[1], 'позиции')
  })

  it('uses the many form for 5-9, 0 and the teens', () => {
    for (const n of [0, 5, 9, 20, 100]) assert.equal(positions(n).split(' ')[1], 'позиций')
    // The teens are the exception the last digit alone gets wrong.
    for (const n of [11, 12, 13, 14, 111, 114]) assert.equal(positions(n).split(' ')[1], 'позиций')
  })
})
