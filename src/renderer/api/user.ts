/**
 * 用户相关 API
 */

import { API_BASE_URL } from './config';

export interface UserProfile {
  id: string;
  name: string;
  mbti: string;
  lifespan: number;
  email?: string;
  avatar?: string;
}

export const userApi = {
  getProfile(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/user/profile`);
  },

  updateProfile(data: Partial<UserProfile>): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/user/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
};
