import assert from 'node:assert/strict'
import test from 'node:test'
import type { Category } from '../payload-types'
import { filterNonEmptyCategories } from './categoryTree'

const cat = (id: number, parent: number | null = null) => ({ id, name: `c${id}`, slug: `c${id}`, parent }) as unknown as Category

// 1 (root) -> 2 -> 3 ; 4 (root, empty) ; 5 (root) with its own products
const all = [cat(1), cat(2, 1), cat(3, 2), cat(4), cat(5)]
const counts = new Map<number, number>([
  [3, 2], // only the grandchild has products
  [5, 1],
])
const ids = (list: Category[]) => list.map((c) => c.id)

test('filterNonEmptyCategories drops categories with no products in their subtree', () => {
  assert.deepEqual(ids(filterNonEmptyCategories(all, all, counts)), [1, 2, 3, 5])
})

test('a parent whose products all sit in its children stays', () => {
  assert.deepEqual(ids(filterNonEmptyCategories([cat(1)], all, counts)), [1])
})

test('candidate order is preserved and an empty counts map yields nothing', () => {
  assert.deepEqual(ids(filterNonEmptyCategories([cat(5), cat(3), cat(1)], all, counts)), [5, 3, 1])
  assert.deepEqual(filterNonEmptyCategories(all, all, new Map()), [])
})
