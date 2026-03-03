/**
 * PIN 相关 API
 */

import { apiRequest } from './client'
import type {
  PinVerifyRequest,
  PinChangeRequest,
  PinDeleteRequest,
  PinSetupRequest,
} from '../lib/pin/types'

export const pinApi = {
  status(): Promise<Response> {
    return apiRequest('/api/pin/status')
  },

  setup(pin: string): Promise<Response> {
    return apiRequest('/api/pin/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin } as PinSetupRequest),
    })
  },

  verify(pin: string): Promise<Response> {
    return apiRequest('/api/pin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin } as PinVerifyRequest),
    })
  },

  change(oldPin: string, newPin: string): Promise<Response> {
    return apiRequest('/api/pin/change', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        old_pin: oldPin,
        new_pin: newPin,
      } as PinChangeRequest),
    })
  },

  delete(pin: string): Promise<Response> {
    return apiRequest('/api/pin', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin } as PinDeleteRequest),
    })
  },
}
