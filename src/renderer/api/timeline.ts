/**
 * 时间轴相关 API
 */

import { API_BASE_URL } from './config';

export const timelineApi = {
  getEvents(): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/timeline/events`);
  },

  addEvent(event: Omit<any, 'id'>): Promise<Response> {
    return fetch(`${API_BASE_URL}/api/timeline/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
  },
};
