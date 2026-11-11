import { readFileSync } from 'node:fs'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { addDoc, deleteDoc, doc, getDoc, getDocs, collection, increment, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment
const asUser = (uid: string) => env.authenticatedContext(uid).firestore()
const asGuest = () => env.unauthenticatedContext().firestore()
const milestone = (uid: string) => ({ name: 'Release 1', description: '', startOn: '', dueOn: '2026-12-01', isCompleted: false, createdBy: uid, createdAt: serverTimestamp(), updatedBy: uid, updatedAt: serverTimestamp() })
const project = (uid: string, workspaceId = 'alpha-qa') => ({ workspaceId, name: 'Store', description: '', color: '#E08A00', createdBy: uid, createdAt: serverTimestamp() })

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-casebook',
    firestore: { rules: readFileSync(new URL('../../../firebase/firestore.rules', import.meta.url), 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'projects/p1'), { workspaceId: 'alpha-qa', name: 'Store', description: '', color: '#E08A00', createdBy: 'alice', createdAt: new Date(0) })
    await setDoc(doc(ctx.firestore(), 'users/alice'), { name: 'Alice', workspaceId: 'alpha-qa' })
    await setDoc(doc(ctx.firestore(), 'users/bob'), { name: 'Bob', workspaceId: 'alpha-qa' })
    await setDoc(doc(ctx.firestore(), 'users/dave'), { name: 'Dave', workspaceId: 'beta-squad' })
  })
})

describe('projects', () => {
  it('every user in the workspace can read, create, update and delete its projects', async () => {
    const bob = asUser('bob')
    await assertSucceeds(getDocs(query(collection(bob, 'projects'), where('workspaceId', '==', 'alpha-qa'))))
    await assertSucceeds(setDoc(doc(bob, 'projects/p2'), project('bob')))
    await assertSucceeds(updateDoc(doc(bob, 'projects/p1'), { name: 'Renamed' }))
    await assertSucceeds(updateDoc(doc(bob, 'projects/p1'), { pinned: true }))
    await assertSucceeds(deleteDoc(doc(bob, 'projects/p1')))
  })

  it('users in another workspace cannot see or touch them', async () => {
    const dave = asUser('dave')
    await assertFails(getDoc(doc(dave, 'projects/p1')))
    await assertFails(getDocs(query(collection(dave, 'projects'), where('workspaceId', '==', 'alpha-qa'))))
    await assertFails(updateDoc(doc(dave, 'projects/p1'), { name: 'Renamed' }))
    await assertFails(deleteDoc(doc(dave, 'projects/p1')))
    await assertFails(setDoc(doc(dave, 'projects/p2'), project('dave', 'alpha-qa')))
    await assertSucceeds(setDoc(doc(dave, 'projects/p3'), project('dave', 'beta-squad')))
    await assertFails(updateDoc(doc(asUser('alice'), 'projects/p1'), { workspaceId: 'beta-squad' }))
  })

  it('guests cannot read or write', async () => {
    await assertFails(getDoc(doc(asGuest(), 'projects/p1')))
    await assertFails(setDoc(doc(asGuest(), 'projects/p2'), project('bob')))
    await assertFails(deleteDoc(doc(asGuest(), 'projects/p1')))
  })

  it('rejects invalid projects and spoofed authors', async () => {
    const bob = asUser('bob')
    await assertFails(setDoc(doc(bob, 'projects/p2'), project('alice')))
    await assertFails(setDoc(doc(bob, 'projects/p2'), { ...project('bob'), name: '' }))
    await assertFails(setDoc(doc(bob, 'projects/p2'), { ...project('bob'), name: 'x'.repeat(121) }))
    await assertFails(setDoc(doc(bob, 'projects/p2'), { ...project('bob'), color: 'red' }))
    await assertFails(setDoc(doc(bob, 'projects/p2'), { ...project('bob'), extra: true }))
    await assertFails(updateDoc(doc(bob, 'projects/p1'), { createdBy: 'bob' }))
    await assertFails(updateDoc(doc(bob, 'projects/p1'), { pinned: 'yes' }))
  })
})

describe('milestones', () => {
  const path = 'projects/p1/milestones/m1'
  beforeEach(() => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), { ...milestone('alice'), createdAt: new Date(0), updatedAt: new Date(0) })))

  it('every user in the workspace can read, create, update and delete them', async () => {
    const bob = asUser('bob')
    await assertSucceeds(getDocs(collection(bob, 'projects/p1/milestones')))
    await assertSucceeds(setDoc(doc(bob, 'projects/p1/milestones/m2'), milestone('bob')))
    await assertSucceeds(updateDoc(doc(bob, path), { isCompleted: true, completedOn: '2026-11-10', updatedBy: 'bob', updatedAt: serverTimestamp() }))
    // Completed terkunci: tidak bisa dibuka lagi atau diedit.
    await assertFails(updateDoc(doc(bob, path), { isCompleted: false, completedOn: '', updatedBy: 'bob', updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(bob, path), { name: 'Renamed', updatedBy: 'bob', updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(doc(bob, path)))
  })

  it('other workspaces and guests are locked out', async () => {
    const dave = asUser('dave')
    await assertFails(getDoc(doc(dave, path)))
    await assertFails(setDoc(doc(dave, 'projects/p1/milestones/m2'), milestone('dave')))
    await assertFails(updateDoc(doc(dave, path), { name: 'x', updatedBy: 'dave', updatedAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(dave, path)))
    await assertFails(getDoc(doc(asGuest(), path)))
    await assertFails(setDoc(doc(asGuest(), 'projects/p1/milestones/m2'), milestone('bob')))
  })

  it('rejects invalid fields and spoofed authors', async () => {
    const bob = asUser('bob')
    const create = (data: object) => setDoc(doc(bob, 'projects/p1/milestones/m2'), data)
    await assertFails(create(milestone('alice')))
    await assertFails(create({ ...milestone('bob'), name: '' }))
    await assertFails(create({ ...milestone('bob'), dueOn: '01/12/2026' }))
    await assertFails(create({ ...milestone('bob'), startOn: '2027-01-01' }))
    await assertFails(create({ ...milestone('bob'), isCompleted: 'no' }))
    await assertFails(create({ ...milestone('bob'), extra: true }))
    await assertFails(create({ ...milestone('bob'), isCompleted: true }))
    await assertFails(create({ ...milestone('bob'), completedOn: '2026-11-10' }))
    await assertFails(create({ ...milestone('bob'), updatedAt: new Date(0) }))
    await assertFails(updateDoc(doc(bob, path), { createdBy: 'bob', updatedBy: 'bob', updatedAt: serverTimestamp() }))
  })
})

describe('plans', () => {
  const plan = (uid: string, o: object = {}) => ({ name: 'Regression', milestoneId: 'm1', createdBy: uid, createdAt: serverTimestamp(), updatedBy: uid, updatedAt: serverTimestamp(), ...o })
  beforeEach(() => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'projects/p1/milestones/m1'), { ...milestone('alice'), createdAt: new Date(0), updatedAt: new Date(0) })))

  it('every user in the workspace can read, create, rename and delete them', async () => {
    const bob = asUser('bob')
    await assertSucceeds(setDoc(doc(bob, 'projects/p1/plans/pl1'), plan('bob')))
    await assertSucceeds(getDocs(collection(bob, 'projects/p1/plans')))
    await assertSucceeds(updateDoc(doc(asUser('alice'), 'projects/p1/plans/pl1'), { name: 'Smoke', updatedBy: 'alice', updatedAt: serverTimestamp() }))
    await assertSucceeds(deleteDoc(doc(bob, 'projects/p1/plans/pl1')))
  })

  it('rejects other workspaces, unknown milestones and spoofed authors', async () => {
    const bob = asUser('bob')
    await assertFails(setDoc(doc(asUser('dave'), 'projects/p1/plans/pl1'), plan('dave')))
    await assertFails(setDoc(doc(bob, 'projects/p1/plans/pl1'), plan('bob', { milestoneId: 'nope' })))
    await assertFails(setDoc(doc(bob, 'projects/p1/plans/pl1'), plan('alice')))
    await assertFails(setDoc(doc(bob, 'projects/p1/plans/pl1'), plan('bob', { name: '' })))
    await assertFails(setDoc(doc(bob, 'projects/p1/plans/pl1'), plan('bob', { extra: true })))
  })
})

describe('runs', () => {
  const counts = (o: object = {}) => ({ passed: 0, failed: 0, blocked: 0, retest: 0, untested: 2, ...o })
  const run = (uid: string, o: object = {}) => ({
    name: 'Smoke', description: '', milestoneId: null, planId: null, assignee: 'RS', status: 'draft', counts: counts(),
    createdBy: uid, createdAt: serverTimestamp(), updatedBy: uid, updatedAt: serverTimestamp(), ...o,
  })
  const test = { number: 1, caseId: 'c1', sectionId: 's1', sectionOrder: 0, assignee: 'RS', status: 'untested', snapshot: { title: 'Login' } }
  const touch = (uid: string, o: object) => ({ ...o, updatedBy: uid, updatedAt: serverTimestamp() })
  const seed = (id: string, o: object = {}) =>
    env.withSecurityRulesDisabled(async (ctx) => {
      const d = ctx.firestore()
      await setDoc(doc(d, `projects/p1/runs/${id}`), { ...run('alice'), createdAt: new Date(0), updatedAt: new Date(0), ...o })
      await setDoc(doc(d, `projects/p1/runs/${id}/tests/t1`), test)
    })
  const path = 'projects/p1/runs/r1'
  beforeEach(() => env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'projects/p1/milestones/m1'), { ...milestone('alice'), createdAt: new Date(0), updatedAt: new Date(0) })))

  it('a run is optional to link to a milestone, and can be linked or unlinked later', async () => {
    const bob = asUser('bob')
    await assertSucceeds(setDoc(doc(bob, 'projects/p1/runs/free'), run('bob')))
    await assertSucceeds(setDoc(doc(bob, 'projects/p1/runs/linked'), run('bob', { milestoneId: 'm1' })))
    await assertFails(setDoc(doc(bob, 'projects/p1/runs/ghost'), run('bob', { milestoneId: 'nope' })))
    await assertSucceeds(updateDoc(doc(bob, 'projects/p1/runs/free'), touch('bob', { milestoneId: 'm1' })))
    await assertFails(updateDoc(doc(bob, 'projects/p1/runs/free'), touch('bob', { milestoneId: 'nope' })))
    await assertSucceeds(updateDoc(doc(bob, 'projects/p1/runs/linked'), touch('bob', { milestoneId: null })))
  })

  it('a run can join a test plan only of its own milestone', async () => {
    const bob = asUser('bob')
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'projects/p1/plans/pl1'), { name: 'Regression', milestoneId: 'm1', createdBy: 'alice', createdAt: new Date(0), updatedBy: 'alice', updatedAt: new Date(0) }))
    await assertSucceeds(setDoc(doc(bob, 'projects/p1/runs/inplan'), run('bob', { milestoneId: 'm1', planId: 'pl1' })))
    await assertFails(setDoc(doc(bob, 'projects/p1/runs/wrongms'), run('bob', { milestoneId: null, planId: 'pl1' })))
    await assertFails(setDoc(doc(bob, 'projects/p1/runs/ghost'), run('bob', { milestoneId: 'm1', planId: 'nope' })))
  })

  it('other workspaces and guests are locked out', async () => {
    await seed('r1')
    const dave = asUser('dave')
    await assertFails(getDoc(doc(dave, path)))
    await assertFails(setDoc(doc(dave, 'projects/p1/runs/r2'), run('dave')))
    await assertFails(deleteDoc(doc(dave, path)))
    await assertFails(getDoc(doc(asGuest(), path)))
  })

  it('rejects bad fields, spoofed authors and a non-Draft start', async () => {
    const create = (data: object) => setDoc(doc(asUser('bob'), 'projects/p1/runs/r2'), data)
    await assertFails(create(run('alice')))
    await assertFails(create(run('bob', { name: '' })))
    await assertFails(create(run('bob', { status: 'active' })))
    await assertFails(create(run('bob', { counts: counts({ passed: -1 }) })))
    await assertFails(create(run('bob', { counts: { passed: 0 } })))
    await assertFails(create(run('bob', { extra: true })))
  })

  it('status moves Draft -> Active -> Done -> Active, never back to Draft', async () => {
    await seed('r1')
    const bob = doc(asUser('bob'), path)
    await assertFails(updateDoc(bob, touch('bob', { status: 'done', counts: counts({ untested: 0 }) })))
    await assertSucceeds(updateDoc(bob, touch('bob', { status: 'active' })))
    await assertFails(updateDoc(bob, touch('bob', { status: 'draft' })))
    await assertFails(updateDoc(bob, touch('bob', { status: 'done', counts: counts({ untested: 1, passed: 1 }) })))
    await assertSucceeds(updateDoc(bob, touch('bob', { status: 'done', counts: counts({ untested: 0, passed: 2 }) })))
    await assertFails(updateDoc(bob, touch('bob', { status: 'active', counts: counts({ untested: 0, passed: 2 }) })))
    await assertSucceeds(updateDoc(bob, touch('bob', { status: 'active', counts: counts({ untested: 0, passed: 1, retest: 1 }) })))
  })

  it('tests can be added while the run exists; results only once the run is open and never change', async () => {
    await seed('r1')
    const bob = asUser('bob')
    const result = { status: 'passed', comment: '', createdBy: 'bob', createdAt: serverTimestamp() }
    await assertSucceeds(setDoc(doc(bob, `${path}/tests/t2`), test))
    await assertFails(setDoc(doc(bob, `${path}/tests/t3`), { ...test, status: 'passed' }))
    await assertFails(addDoc(collection(bob, `${path}/tests/t1/results`), result))
    await seed('r1', { status: 'active' })
    await assertSucceeds(setDoc(doc(bob, `${path}/tests/t4`), test))
    await assertFails(setDoc(doc(asUser('dave'), `${path}/tests/t5`), test))
    const ref = await assertSucceeds(addDoc(collection(bob, `${path}/tests/t1/results`), result))
    await assertSucceeds(updateDoc(doc(bob, `${path}/tests/t1`), { status: 'passed', lastResultBy: 'bob', lastResultAt: serverTimestamp() }))
    await assertFails(addDoc(collection(bob, `${path}/tests/t1/results`), { ...result, createdBy: 'alice' }))
    await assertFails(updateDoc(ref, { comment: 'edited' }))
    await assertFails(deleteDoc(ref))
  })

  it('a test and its results can be removed from a run, but not by another workspace', async () => {
    await seed('r1', { status: 'active' })
    const res = `${path}/tests/t1/results/x`
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), res), { status: 'passed', comment: '', createdBy: 'alice', createdAt: new Date(0) }))
    await assertFails(deleteDoc(doc(asUser('dave'), res)))
    await assertFails(deleteDoc(doc(asUser('dave'), `${path}/tests/t1`)))
    await assertSucceeds(deleteDoc(doc(asUser('bob'), res)))
    await assertSucceeds(deleteDoc(doc(asUser('bob'), `${path}/tests/t1`)))
  })

  it('deleting a run lets its tests and results be swept afterwards', async () => {
    await seed('r1', { status: 'active' })
    const bob = asUser('bob')
    await assertSucceeds(deleteDoc(doc(bob, path)))
    await assertSucceeds(deleteDoc(doc(bob, `${path}/tests/t1`)))
  })
})

describe('daily', () => {
  const path = 'projects/p1/daily/2026-11-09'

  it('workspace members can read it and bump one status by exactly 1', async () => {
    const bob = asUser('bob')
    await assertSucceeds(setDoc(doc(bob, path), { passed: increment(1) }, { merge: true }))
    await assertSucceeds(setDoc(doc(bob, path), { failed: increment(1) }, { merge: true }))
    await assertSucceeds(setDoc(doc(bob, path), { passed: increment(1) }, { merge: true }))
    await assertSucceeds(getDocs(collection(bob, 'projects/p1/daily')))
  })

  it('rejects jumps, decrements, unknown keys and bad ids', async () => {
    const bob = asUser('bob')
    await assertFails(setDoc(doc(bob, path), { passed: 2 }))
    await assertFails(setDoc(doc(bob, path), { untested: 1 }))
    await assertFails(setDoc(doc(bob, 'projects/p1/daily/today'), { passed: 1 }))
    await assertSucceeds(setDoc(doc(bob, path), { passed: 1 }))
    await assertFails(setDoc(doc(bob, path), { passed: increment(2) }, { merge: true }))
    await assertFails(setDoc(doc(bob, path), { passed: 0, failed: 2 }))
    await assertFails(deleteDoc(doc(bob, path)))
  })

  it('other workspaces and guests are locked out', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), { passed: 1 }))
    await assertFails(getDoc(doc(asUser('dave'), path)))
    await assertFails(setDoc(doc(asUser('dave'), path), { passed: increment(1) }, { merge: true }))
    await assertFails(getDoc(doc(asGuest(), path)))
  })
})

describe('users', () => {
  it('a user cannot read another profile', async () => {
    await assertFails(getDoc(doc(asUser('bob'), 'users/alice')))
  })

  it('a user cannot change workspace or invent one', async () => {
    await assertFails(updateDoc(doc(asUser('alice'), 'users/alice'), { workspaceId: 'beta-squad' }))
    await assertFails(setDoc(doc(asUser('carol'), 'users/carol'), { name: 'Carol', workspaceId: 'my-own' }))
    await assertFails(setDoc(doc(asUser('carol'), 'users/carol'), { name: 'Carol', role: 'lead' }))
    await assertFails(deleteDoc(doc(asUser('alice'), 'users/alice')))
  })

  it('register can still create the profile', async () => {
    await assertSucceeds(setDoc(doc(asUser('carol'), 'users/carol'), { name: 'Carol', workspaceId: 'gamma-labs' }))
  })
})

describe('cases and sections', () => {
  const kase = (uid: string, o: object = {}) => ({
    number: 1001, sectionId: 's1', title: 'Login', status: 'draft', priority: 'High', type: 'Functional', refs: '', estimate: '', automation: 'Manual',
    preconditions: [], steps: [], expected: [], author: 'Bob', reviewer: null, history: [], createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...o,
  })
  const path = 'projects/p1/cases/C1001'

  it('every user in the workspace can read and write them; other workspaces and guests cannot', async () => {
    const bob = asUser('bob')
    await assertSucceeds(setDoc(doc(bob, path), kase('bob')))
    await assertSucceeds(updateDoc(doc(bob, path), { status: 'under_review', updatedAt: serverTimestamp() }))
    await assertSucceeds(getDocs(query(collection(bob, 'projects/p1/cases'), where('status', '==', 'under_review'))))
    await assertSucceeds(setDoc(doc(bob, 'projects/p1/sections/s1'), { name: 'Login', parentId: null }))
    const dave = asUser('dave')
    await assertFails(getDoc(doc(dave, path)))
    await assertFails(setDoc(doc(dave, 'projects/p1/cases/C1002'), kase('dave', { number: 1002 })))
    await assertFails(setDoc(doc(dave, 'projects/p1/sections/s2'), { name: 'x', parentId: null }))
    await assertFails(getDoc(doc(asGuest(), path)))
    await assertSucceeds(deleteDoc(doc(bob, path)))
  })

  it('rejects bad fields, mismatched ids and spoofed authors', async () => {
    const bob = asUser('bob')
    await assertFails(setDoc(doc(bob, path), kase('alice')))
    await assertFails(setDoc(doc(bob, path), kase('bob', { number: 7 })))
    await assertFails(setDoc(doc(bob, path), kase('bob', { title: '' })))
    await assertFails(setDoc(doc(bob, path), kase('bob', { status: 'approved' })))
    await assertFails(setDoc(doc(bob, path), kase('bob', { extra: true })))
    await assertFails(setDoc(doc(bob, path), kase('bob', { updatedAt: new Date(0) })))
    await assertSucceeds(setDoc(doc(bob, path), kase('bob')))
    await assertFails(updateDoc(doc(bob, path), { number: 5, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(bob, path), { createdBy: 'bob', updatedAt: serverTimestamp() }))
  })

  it('a project keeps its case counter', async () => {
    const bob = asUser('bob')
    await assertSucceeds(updateDoc(doc(bob, 'projects/p1'), { nextCaseNumber: 1002 }))
    await assertFails(updateDoc(doc(bob, 'projects/p1'), { nextCaseNumber: 'x' }))
  })
})
