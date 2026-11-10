import { MAX_BYTES, MAX_IMAGES, sizeLabel, validateImages } from './evidence'

const file = (name: string, type: string, size = 1000) => new File([new Uint8Array(size)], name, { type })

describe('validateImages (EVD-01/02)', () => {
  it('accepts PNG, JPG, GIF and WebP', () => {
    const { accepted, issues } = validateImages([file('a.png', 'image/png'), file('b.jpg', 'image/jpeg'), file('c.gif', 'image/gif'), file('d.webp', 'image/webp')], 0)
    expect(accepted).toHaveLength(4)
    expect(issues).toEqual([])
  })
  it('rejects other formats and files over 10 MB, naming each file', () => {
    const { accepted, issues } = validateImages([file('doc.pdf', 'application/pdf'), file('huge.png', 'image/png', MAX_BYTES + 1), file('ok.png', 'image/png')], 0)
    expect(accepted.map((f) => f.name)).toEqual(['ok.png'])
    expect(issues).toEqual([{ kind: 'type', name: 'doc.pdf' }, { kind: 'size', name: 'huge.png' }])
  })
  it('stops at 10 images in total', () => {
    const files = Array.from({ length: 4 }, (_, i) => file(`${i}.png`, 'image/png'))
    const { accepted, issues } = validateImages(files, MAX_IMAGES - 2)
    expect(accepted).toHaveLength(2)
    expect(issues).toEqual([{ kind: 'limit', name: '2.png' }, { kind: 'limit', name: '3.png' }])
  })
  it('formats sizes', () => {
    expect([sizeLabel(284 * 1024), sizeLabel(200), sizeLabel(2.5 * 1024 * 1024)]).toEqual(['284 KB', '1 KB', '2.5 MB'])
  })
})
