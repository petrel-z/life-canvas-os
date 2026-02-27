/**
 * PIN 相关 API
 */

import { API_BASE_URL } from './config';
import type {
  PinVerifyRequest,
  PinChangeRequest,
  PinDeleteRequest,
  PinSetupRequest,
} from '~/renderer/lib/pin/types';

export const pinApi = {
  status(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/pin/status`);
  },

  setup(pin: string): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/pin/setup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin } as PinSetupRequest),
    });
  },

  verify(pin: string): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/pin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin } as PinVerifyRequest),
    });
  },

  change(oldPin: string, newPin: string): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/pin/change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        old_pin: oldPin,
        new_pin: newPin,
      } as PinChangeRequest),
    });
  },

  delete(pin: string): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/pin`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin } as PinDeleteRequest),
    });
  },
};
