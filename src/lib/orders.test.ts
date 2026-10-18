import { describe, expect, it } from 'vitest'
import { validateCheckout } from './orders'

describe('customer checkout validation', () => {
  it('normalizes a valid customer phone number', () => {
    expect(validateCheckout({ name: 'Asha Rao', phone: '+91 98765 43210' }).phone).toBe('9876543210')
  })

  it('rejects an invalid phone number before any database call', () => {
    expect(() => validateCheckout({ name: 'Asha Rao', phone: '123' })).toThrow('valid 10-digit')
  })

  it('rejects malformed optional email', () => {
    expect(() => validateCheckout({ name: 'Asha Rao', phone: '9876543210', email: 'bad' })).toThrow('valid email')
  })
})
