import { describe, expect, it } from 'vitest'
import { decideTrust } from '../../src/shared/certs'

describe('decideTrust', () => {
  const trusted = { 'nas:8920': 'sha256/AAA' }

  it('lets in a server that shows the certificate you trusted', () => {
    expect(decideTrust(trusted, 'nas:8920', 'sha256/AAA')).toBe('trusted')
  })

  it('asks about a server it has not seen', () => {
    expect(decideTrust(trusted, 'other:8920', 'sha256/AAA')).toBe('ask')
    expect(decideTrust({}, 'nas:8920', 'sha256/AAA')).toBe('ask')
  })

  it('asks again, more strongly, when a trusted server shows a different certificate', () => {
    expect(decideTrust(trusted, 'nas:8920', 'sha256/BBB')).toBe('ask-changed')
  })
})
