import { approve, ancestorIds, caseGroups, editCase, newCase, pendingReturn, returnToDraft, sectionPath, sectionWithDescendants, submitForReview, type CaseEdit, type Section, type TestCase } from './domain'

const now = new Date('2026-11-06T10:00:00Z')
const later = new Date('2026-11-06T11:00:00Z')
const fields: CaseEdit = { title: 'Pay with QRIS', sectionId: 'pay', type: 'Functional', priority: 'Medium', refs: '', preconditions: ['Signed in'], steps: ['Open Checkout'], expected: ['QR appears'] }

const draft = () => newCase({ ...fields, number: 1200, status: 'draft' }, 'Sari', now)
const review = () => submitForReview(draft(), 'Sari', now)
const approved = () => approve(review(), 'Budi', now)

describe('case status flow (APR-01…04)', () => {
  it('starts as Draft with a created entry', () => {
    const c = draft()
    expect(c).toMatchObject({ id: 'C1200', status: 'draft' })
    expect(c.history.map((h) => h.action)).toEqual(['created'])
  })
  it('"Save & send for review" creates the case Under Review', () => {
    const c = newCase({ ...fields, number: 1201, status: 'under_review' }, 'Sari', now)
    expect(c.status).toBe('under_review')
    expect(c.history.map((h) => h.action)).toEqual(['submitted', 'created'])
  })
  it('only Draft can be sent for review; only Under Review can be approved', () => {
    expect(submitForReview(review(), 'x', later).history).toHaveLength(3 - 1)
    expect(approve(draft(), 'Budi', later).status).toBe('draft')
    expect(approve(approved(), 'Budi', later).history).toHaveLength(approved().history.length)
  })
  it('return to Draft needs a note (APR-03)', () => {
    expect(returnToDraft(review(), 'Budi', '   ', later).status).toBe('under_review')
    const c = returnToDraft(review(), 'Budi', ' Step 2 is unclear ', later)
    expect(c.status).toBe('draft')
    expect(c.history[0]).toMatchObject({ action: 'returned', note: 'Step 2 is unclear' })
  })
  it('editing main content of an Approved case sends it back to Under Review (APR-04)', () => {
    const c = editCase(approved(), { ...fields, steps: ['Open Checkout', 'Pick QRIS'] }, 'Sari', later)
    expect(c.status).toBe('under_review')
    expect(c.history[0]?.action).toBe('edited_review')
  })
  it('editing minor fields of an Approved case keeps it Active', () => {
    const c = editCase(approved(), { ...fields, priority: 'High', refs: 'JIRA-9', type: 'UI' }, 'Sari', later)
    expect(c.status).toBe('active')
    expect(c.history[0]?.action).toBe('edited')
  })
  it('Draft can be edited freely and a no-op edit changes nothing', () => {
    expect(editCase(draft(), { ...fields, title: 'New title' }, 'Sari', later).status).toBe('draft')
    const c = draft()
    expect(editCase(c, fields, 'Sari', later)).toBe(c)
  })
  it('shows the reviewer note only until the case is sent for review again', () => {
    const returned = returnToDraft(review(), 'Budi', 'Fix step 2', later)
    expect(pendingReturn(returned)?.note).toBe('Fix step 2')
    expect(pendingReturn(submitForReview(returned, 'Sari', later))).toBeUndefined()
  })
})

describe('section tree helpers', () => {
  const sections: Section[] = [
    { id: 'co', parentId: null, name: 'Checkout' },
    { id: 'pay', parentId: 'co', name: 'Payment' },
    { id: 'qr', parentId: 'pay', name: 'QRIS' },
    { id: 'cart', parentId: null, name: 'Cart' },
  ]
  it('builds a path, ancestors and descendants at any depth', () => {
    expect(sectionPath(sections, 'qr')).toBe('Checkout › Payment › QRIS')
    expect(ancestorIds(sections, 'qr')).toEqual(['pay', 'co'])
    expect([...sectionWithDescendants(sections, 'co')].sort()).toEqual(['co', 'pay', 'qr'])
  })
  it('groups cases by section in tree order; "all" skips branches without cases', () => {
    const c = (id: string, sectionId: string) => ({ id, sectionId }) as TestCase
    const cases = [c('C1', 'qr'), c('C2', 'co')]
    const shape = (rootId: string) => caseGroups(sections, cases, rootId).map((g) => [g.section.id, g.depth, g.cases.map((x) => x.id)])
    expect(shape('all')).toEqual([['co', 0, ['C2']], ['pay', 1, []], ['qr', 2, ['C1']]])
    expect(shape('pay')).toEqual([['pay', 0, []], ['qr', 1, ['C1']]])
    expect(shape('cart')).toEqual([['cart', 0, []]])
  })
})
