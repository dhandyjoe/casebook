import type { CaseStatus, CaseType, HistoryEntry, Priority, Section, TestCase } from './domain'

// Data contoh dari canvas (artboard Test Cases + Test Runs). Diganti Firestore di fase backend.

const MIN = 60_000
const DAY = 24 * 60 * MIN

const AUTHORS = ['Sari Wulandari', 'Dimas Pratama', 'Budi Santoso', 'Rina Saputra']
const LEAD = 'Budi Santoso'
const TYPES: CaseType[] = ['Functional', 'Regression', 'UI', 'Smoke']
const PRS: Priority[] = ['High', 'Medium', 'Medium', 'Low', 'High', 'Medium']

// [id, nama, jumlah case, jumlah yang belum Approved, judul]
type Leaf = [string, string, number, number, string[]]
const TREE: { id: string; name: string; kids: Leaf[] }[] = [
  { id: 'akun', name: 'Account & Login', kids: [
    ['reg', 'Sign-up', 8, 1, ['Sign up with a valid email', 'Sign up with an email already in use', 'Password strength check on sign-up', 'Verify email via activation link']],
    ['login', 'Login', 10, 1, ['Sign in with a valid email and password', 'Sign in with a wrong password', 'Account locks after 5 failed sign-ins', 'Sign in with Google', 'Stay signed in after closing the browser']],
    ['lupa', 'Forgot password', 6, 0, ['Request a password reset link', 'Reset password with an expired link', 'Sign in with the new password after reset']],
  ] },
  { id: 'katalog', name: 'Product Catalog', kids: [
    ['cari', 'Search', 16, 2, ['Search products with an exact keyword', 'Search products with a typo', 'Search suggestions appear while typing', 'Empty results show product suggestions', 'Search by brand name', 'Search history is saved', 'Clear search history', 'Search products with special characters']],
    ['filter', 'Filter & sort', 12, 1, ['Filter products by price range', 'Filter by category', 'Sort by lowest price', 'Sort by best-selling', 'Combine several filters at once', 'Reset all filters']],
    ['detail', 'Product details', 18, 2, ['Product page shows price and stock', 'Choose color and size variants', 'Product photos can be zoomed', 'Sold-out product shows an Out of stock label', 'Share a product via link', 'Add a product to the wishlist', 'Shipping estimate matches location', 'Related products appear below', 'Strikethrough price shows during a discount']],
    ['ulasan', 'Reviews', 12, 1, ['Write a review after the order completes', 'Submit a review with photos', 'Filter reviews by star rating', 'Average rating is calculated correctly', 'Can’t review a product you haven’t bought', 'Report an inappropriate review']],
  ] },
  { id: 'keranjang', name: 'Cart', kids: [
    ['tambah', 'Add to cart', 12, 1, ['Add a product from its detail page', 'Add a product with variants', 'Add more than the available stock', 'Guest cart is kept after signing in', 'Item count badge in the header increases', 'Add the same product twice']],
    ['jumlah', 'Change quantity', 9, 0, ['Increase item quantity in the cart', 'Quantity 0 removes the item', 'Remove an item from the cart', 'Subtotal recalculates when quantity changes', 'Quantity is limited by stock']],
    ['promo', 'Promos & vouchers', 10, 1, ['Apply a valid voucher code', 'Voucher with a minimum spend', 'Remove an applied voucher', 'New-customer-only voucher', 'Two vouchers can’t be combined']],
  ] },
  { id: 'checkout', name: 'Checkout', kids: [
    ['alamat', 'Address & Shipping', 14, 2, ['Add a new shipping address', 'Change the primary address', 'Choose a courier and shipping service', 'Shipping cost matches weight and destination', 'Address outside courier coverage', 'Postal code validation', 'Pick a location pin on the map']],
    ['pay', 'Payment', 0, 0, []],
    ['konfirmasi', 'Order Confirmation', 11, 1, ['Order summary matches the cart', 'Change address from the confirmation page', 'Order confirmation email is sent', 'A unique order number is generated', 'Note to seller is saved', 'Stock decreases after the order is placed']],
  ] },
  { id: 'pesanan', name: 'My Orders', kids: [
    ['daftar', 'Order list', 13, 1, ['Orders sorted newest first', 'Filter orders by status', 'Open order details', 'Buy again from a past order', 'No orders yet shows a call to shop', 'Download an order invoice', 'Search orders by order number']],
    ['lacak', 'Shipment tracking', 12, 1, ['Shipping status updates from the courier', 'Tracking number can be copied', 'Notification when the parcel ships', 'Notification when the parcel is delivered', 'Confirm order received', 'Order completes automatically after 3 days']],
    ['retur', 'Cancellations & returns', 12, 2, ['Cancel an order before it ships', 'Can’t cancel an order that has shipped', 'Request a return with photo proof', 'Refund after the return is approved', 'Track return request status', 'Cancellation reason is required']],
  ] },
  { id: 'admin', name: 'Store Admin', kids: [
    ['produk', 'Manage products', 20, 3, ['Add a new product with photos', 'Change a product price', 'Archive a product', 'Bulk upload products via CSV', 'Required product field validation', 'Set up product variants', 'Set weight for shipping', 'Preview a product before publishing', 'Delete a product photo', 'Duplicate a product']],
    ['stok', 'Manage stock', 14, 1, ['Change stock manually', 'Low stock alert', 'Stock change history', 'Stock returns when an order is cancelled', 'Import stock via CSV', 'Stock per variant', 'Stock can’t go negative']],
    ['laporan', 'Sales reports', 18, 2, ['Daily sales chart', 'Filter reports by date', 'Export reports to CSV', 'Best-selling products this month', 'Total revenue from completed orders', 'Cancellation report', 'Compare with the previous period', 'Report by category', 'Empty report when there are no sales yet']],
  ] },
]

type Ev = [action: HistoryEntry['action'], who: string, minutesAgo: number, note?: string]

// Case Payment: persis seperti di canvas (C1041–C1050).
const PAYMENT: {
  number: number; title: string; priority: Priority; type: CaseType; author: string
  refs: string; estimate: string; automation: 'Manual' | 'Automated'; pre: string
  steps: [string, string][]; events: Ev[]
}[] = [
  { number: 1041, title: 'Pay with a valid credit card', priority: 'High', type: 'Functional', author: 'Dimas Pratama', refs: 'JIRA-498', estimate: '4 min', automation: 'Automated', pre: 'Customer is signed in and has 1 product in the cart.',
    steps: [['Open Checkout and choose Credit card.', 'The credit card form appears.'], ['Enter test card 4111 1111 1111 1111, then click Pay.', 'The success page shows the order number.']],
    events: [['approved', LEAD, 3 * DAY / MIN], ['submitted', 'Dimas Pratama', 3 * DAY / MIN + 90], ['created', 'Dimas Pratama', 3 * DAY / MIN + 240]] },
  { number: 1042, title: 'Declined credit card shows an error message', priority: 'High', type: 'Functional', author: 'Dimas Pratama', refs: 'JIRA-499', estimate: '5 min', automation: 'Manual', pre: 'Customer is signed in and has 1 product in the cart.',
    steps: [['Choose Credit card and enter test card 4000 0000 0000 0002.', 'The form accepts the input.'], ['Click Pay.', 'The message “Payment declined by the bank” appears with a Try again button.'], ['Open My Orders.', 'No new order is created.']],
    events: [['approved', LEAD, 3 * DAY / MIN], ['submitted', 'Dimas Pratama', 3 * DAY / MIN + 60], ['created', 'Dimas Pratama', 3 * DAY / MIN + 200]] },
  { number: 1043, title: 'Pay by virtual account transfer', priority: 'Medium', type: 'Functional', author: 'Sari Wulandari', refs: 'JIRA-501', estimate: '6 min', automation: 'Manual', pre: 'The staging bank simulator is running.',
    steps: [['Choose BCA virtual account transfer.', 'The VA number and a 24-hour deadline appear.'], ['Pay through the bank simulator.', 'Order status changes to Paid within 1 minute.']],
    events: [['approved', LEAD, 2 * DAY / MIN], ['submitted', 'Sari Wulandari', 2 * DAY / MIN + 80], ['created', 'Sari Wulandari', 2 * DAY / MIN + 220]] },
  { number: 1044, title: 'VA payment deadline expires (24 hours)', priority: 'Medium', type: 'Regression', author: 'Sari Wulandari', refs: 'JIRA-502', estimate: '10 min', automation: 'Manual', pre: 'There is an order with an unpaid VA.',
    steps: [['Place an order with VA and leave it unpaid.', 'Status is Awaiting payment.'], ['Wait for the deadline to pass.', 'The order is cancelled automatically.']],
    events: [['returned', LEAD, DAY / MIN, 'Step 2 isn’t practical to test manually over 24 hours. Use data with a backdated deadline.'], ['submitted', 'Sari Wulandari', 2 * DAY / MIN], ['created', 'Sari Wulandari', 2 * DAY / MIN + 180]] },
  { number: 1045, title: 'Guest checkout without signing in', priority: 'High', type: 'Functional', author: 'Sari Wulandari', refs: 'JIRA-505', estimate: '5 min', automation: 'Manual', pre: 'Visitor is not signed in and has products in the cart.',
    steps: [['Open the cart without signing in, then click Checkout.', 'The Continue as guest option appears.'], ['Enter an email and address, then pay.', 'The order is created and a confirmation email is sent.']],
    events: [['approved', LEAD, 10], ['submitted', 'Sari Wulandari', 150], ['created', 'Sari Wulandari', 400]] },
  { number: 1046, title: 'Use an expired promo code', priority: 'Low', type: 'Functional', author: 'Dimas Pratama', refs: 'JIRA-509', estimate: '3 min', automation: 'Manual', pre: 'Promo code SAVE10 has expired.',
    steps: [['Enter promo code SAVE10.', 'The message “This promo code is no longer valid” appears.'], ['Check the payment total.', 'The total doesn’t change.']],
    events: [['submitted', 'Dimas Pratama', 60], ['created', 'Dimas Pratama', 200]] },
  { number: 1047, title: 'Pay with e-wallet when the balance is too low', priority: 'High', type: 'Functional', author: 'Sari Wulandari', refs: 'JIRA-512', estimate: '5 min', automation: 'Manual', pre: 'Active customer account with a linked e-wallet and a balance of Rp 10,000.',
    steps: [['Sign in as a customer with an e-wallet balance of Rp 10,000.', 'The home page appears.'], ['Add a product priced at Rp 150,000, then open Checkout.', 'The order summary shows a total of Rp 150,000.'], ['Choose e-wallet, then click Pay.', 'The message “Insufficient e-wallet balance” appears with other payment options.'], ['Open My Orders.', 'No new order is created.']],
    events: [['edited_review', 'Sari Wulandari', 25], ['returned', LEAD, 120, 'Step 3 should say which payment options must appear after the error.'], ['submitted', 'Sari Wulandari', DAY / MIN], ['created', 'Sari Wulandari', 2 * DAY / MIN]] },
  { number: 1048, title: 'Payment page on a 360 px screen', priority: 'Medium', type: 'UI', author: 'Sari Wulandari', refs: 'JIRA-513', estimate: '4 min', automation: 'Manual', pre: 'Browser set to a 360 px screen width.',
    steps: [['Open the payment page.', 'All payment methods are visible without horizontal scrolling.'], ['Check the Pay button.', 'The button is fully visible and clickable.']],
    events: [['submitted', 'Sari Wulandari', 25], ['created', 'Sari Wulandari', 90]] },
  { number: 1050, title: 'Save card for future payments', priority: 'Medium', type: 'Functional', author: 'Rina Saputra', refs: 'JIRA-517', estimate: '4 min', automation: 'Manual', pre: 'Customer is signed in and has no saved card.',
    steps: [['Pay by credit card with Save card ticked.', 'Payment succeeds.'], ['Check out again and choose Credit card.', 'The saved card appears with its last 4 digits.']],
    events: [['created', 'Rina Saputra', 5]] },
  { number: 1049, title: 'Payment receipt can be downloaded as PDF', priority: 'Medium', type: 'Functional', author: 'Budi Santoso', refs: 'JIRA-515', estimate: '3 min', automation: 'Manual', pre: 'There is a paid order.',
    steps: [['Open the paid order.', 'The Download receipt button appears.'], ['Click Download receipt.', 'A PDF with the payment details downloads.']],
    events: [['approved', LEAD, 4 * DAY / MIN], ['submitted', 'Budi Santoso', 4 * DAY / MIN + 60], ['created', 'Budi Santoso', 4 * DAY / MIN + 180]] },
]

export function buildSeed(now: Date): { sections: Section[]; cases: TestCase[]; nextNumber: number } {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * MIN).toISOString()
  const sections: Section[] = []
  const cases: TestCase[] = []

  const payment = PAYMENT.map((p): TestCase => {
    const history: HistoryEntry[] = p.events.map(([action, who, minutes, note]) => ({ who, action, at: ago(minutes), ...(note ? { note } : {}) }))
    const last = history[0]!
    const first = history[history.length - 1]!
    const status: CaseStatus =
      last.action === 'approved' ? 'active' : last.action === 'submitted' || last.action === 'edited_review' ? 'under_review' : 'draft'
    return {
      id: `C${p.number}`, number: p.number, sectionId: 'pay', title: p.title, status, priority: p.priority, type: p.type,
      refs: p.refs, estimate: p.estimate, automation: p.automation, preconditions: [p.pre],
      steps: p.steps.map(([s]) => s), expected: p.steps.map(([, e]) => e),
      author: p.author, createdAt: first.at, updatedAt: last.at, history,
    }
  })

  let num = 1101
  for (const parent of TREE) {
    sections.push({ id: parent.id, parentId: null, name: parent.name })
    for (const [id, name, count, notApproved, pool] of parent.kids) {
      sections.push({ id, parentId: parent.id, name })
      for (let i = 0; i < count; i++) {
        const number = num + i
        const author = AUTHORS[(i + number) % AUTHORS.length]!
        const title = i < pool.length ? pool[i]! : `${pool[i % pool.length]!} (Mobile web)`
        const status: CaseStatus = i < count - notApproved ? 'active' : i % 2 === 0 ? 'under_review' : 'draft'
        const updated = (2 + ((i * 3) % 12)) * DAY / MIN
        const history: HistoryEntry[] =
          status === 'active'
            ? [{ who: LEAD, action: 'approved', at: ago(updated) }, { who: author, action: 'submitted', at: ago(updated + 120) }, { who: author, action: 'created', at: ago(updated + 300) }]
            : status === 'under_review'
              ? [{ who: author, action: 'submitted', at: ago(updated) }, { who: author, action: 'created', at: ago(updated + 180) }]
              : [{ who: author, action: 'created', at: ago(updated) }]
        cases.push({
          id: `C${number}`, number, sectionId: id, title, status,
          priority: PRS[(i + pool.length) % PRS.length]!, type: TYPES[i % TYPES.length]!,
          refs: `JIRA-${400 + (number % 200)}`, estimate: '4 min', automation: i % 4 === 3 ? 'Automated' : 'Manual',
          preconditions: ['Tester has access to the staging environment.'],
          steps: [`Open ${name} in the staging app.`, `Run the scenario: ${title}.`],
          expected: ['The behaviour matches the acceptance criteria.'],
          author, createdAt: history[history.length - 1]!.at, updatedAt: history[0]!.at, history,
        })
      }
      if (id !== 'pay') num += count + 3
    }
  }

  cases.push(...payment)
  cases.sort((a, b) => a.number - b.number)
  return { sections, cases, nextNumber: Math.max(...cases.map((c) => c.number)) + 1 }
}
