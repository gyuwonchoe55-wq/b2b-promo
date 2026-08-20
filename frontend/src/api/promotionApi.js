import request from './httpClient';

export function getPromotions() {
  return request('/api/promotions');
}

export function getPromotion(id) {
  return request(`/api/promotions/${id}`);
}

export function createPromotion(data) {
  return request('/api/promotions', { method: 'POST', body: JSON.stringify(data) });
}

export function updatePromotion(id, data) {
  return request(`/api/promotions/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

export function deletePromotion(id) {
  return request(`/api/promotions/${id}`, { method: 'DELETE' });
}
