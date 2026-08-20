import type { Category } from '@playback-rental/shared-types'

// `parent` comes back as a bare id at depth:0 and a populated Category at
// depth:1+ — every call site here only cares about the id, never the
// populated fields, so normalize once instead of repeating the check.
function parentId(c: Category): number | null {
  if (c.parent == null) return null
  return typeof c.parent === 'object' ? c.parent.id : c.parent
}

export interface CategoryNode {
  category: Category
  depth: number
  children: CategoryNode[]
}

// Nests the flat list under each category's parent, sorted by `order`
// within each level — same sort key the flat admin/storefront lists
// already used before hierarchy existed, so existing manual ordering
// carries over unchanged into per-level ordering.
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byId = new Map<number, CategoryNode>(categories.map((c) => [c.id, { category: c, depth: 0, children: [] }]))
  const roots: CategoryNode[] = []

  for (const node of byId.values()) {
    const pid = parentId(node.category)
    // A parent id that no longer resolves (deleted category, or one from a
    // depth:0 fetch scoped smaller than the full set) degrades to a root
    // rather than silently dropping the category from every list.
    const parentNode = pid != null ? byId.get(pid) : undefined
    if (parentNode) parentNode.children.push(node)
    else roots.push(node)
  }

  const sortAndSetDepth = (nodes: CategoryNode[], depth: number) => {
    nodes.sort((a, b) => a.category.order - b.category.order)
    for (const n of nodes) {
      n.depth = depth
      sortAndSetDepth(n.children, depth + 1)
    }
  }
  sortAndSetDepth(roots, 0)

  return roots
}

// Depth-first flatten of the tree — the shape both the admin category list
// and the storefront sidebar actually render (an indented, ordered list),
// so they can share one traversal instead of each re-deriving it.
export function flattenCategoryTree(nodes: CategoryNode[]): { category: Category; depth: number }[] {
  const out: { category: Category; depth: number }[] = []
  const walk = (list: CategoryNode[]) => {
    for (const n of list) {
      out.push({ category: n.category, depth: n.depth })
      walk(n.children)
    }
  }
  walk(nodes)
  return out
}

// Every id in the subtree rooted at `categoryId`, itself included — used to
// widen a parent category's product filter to its children's products too,
// and to keep the admin "parent" picker from letting a category become its
// own descendant's descendant (a cycle).
export function getSubtreeIds(categoryId: number, categories: Category[]): number[] {
  const childrenByParent = new Map<number, number[]>()
  for (const c of categories) {
    const pid = parentId(c)
    if (pid == null) continue
    const list = childrenByParent.get(pid)
    if (list) list.push(c.id)
    else childrenByParent.set(pid, [c.id])
  }

  const ids: number[] = [categoryId]
  const queue = [categoryId]
  while (queue.length) {
    const current = queue.pop()!
    for (const childId of childrenByParent.get(current) ?? []) {
      ids.push(childId)
      queue.push(childId)
    }
  }
  return ids
}
