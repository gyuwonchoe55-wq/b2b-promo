import request from './httpClient';

export function applyToPromotion(promotionId) {
  return request(`/api/promotions/${promotionId}/applications`, { method: 'POST' });
}

export function getApplicationStatus(promotionId) {
  return request(`/api/promotions/${promotionId}/applications`);
}

export function cancelApplication(promotionId) {
  return request(`/api/promotions/${promotionId}/applications/me`, { method: 'DELETE' });
}
