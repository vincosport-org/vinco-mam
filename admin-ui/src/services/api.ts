import axios from 'axios';

const apiRoot = window.vincoMAM?.apiRoot || '/wp-json/vinco-mam/v1/';

const api = axios.create({
  baseURL: apiRoot,
  headers: {
    'X-WP-Nonce': window.vincoMAM?.nonce || '',
    'Content-Type': 'application/json',
  },
});

// Images API
export const images = {
  list: (params?: any) => api.get('images', { params }),
  get: (imageId: string) => api.get(`images/${imageId}`),
  update: (imageId: string, data: any) => api.put(`images/${imageId}`, data),
  saveEdits: (imageId: string, edits: any) => api.post(`images/${imageId}/edits`, { edits }),
  getVersions: (imageId: string) => api.get(`images/${imageId}/versions`),
  revert: (imageId: string, versionTimestamp: string) =>
    api.post(`images/${imageId}/revert/${versionTimestamp}`),
  export: (imageId: string, settings: any) => api.post(`images/${imageId}/export`, settings),
  download: (imageId: string) => api.get(`images/${imageId}/download/original`),
  getExportPresets: () => api.get('export-presets'),
};

// Albums API
export const albums = {
  list: () => api.get('albums'),
  create: (data: any) => api.post('albums', data),
  update: (albumId: string, data: any) => api.put(`albums/${albumId}`, data),
  addImages: (albumId: string, imageIds: string[]) => 
    api.post(`albums/${albumId}/images`, { addImageIds: imageIds }),
  share: (albumId: string, expiryDays?: number) => 
    api.post(`albums/${albumId}/share`, { expiryDays }),
};

// Athletes API
export const athletes = {
  list: (params?: any) => api.get('athletes', { params }),
  create: (data: any) => api.post('athletes', data),
  update: (athleteId: string, data: any) => api.put(`athletes/${athleteId}`, data),
  uploadHeadshot: (athleteId: string, file: File) => {
    const formData = new FormData();
    formData.append('headshot', file);
    return api.post(`athletes/${athleteId}/headshot`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  lookup: (source: string, externalId: string) => 
    api.get('athletes/lookup', { params: { source, externalId } }),
};

// Validation API
export const validation = {
  getQueue: (params?: any) => api.get('validation/queue', { params }),
  claim: (queueItemId: string) => api.post(`validation/${queueItemId}/claim`),
  approve: (queueItemId: string) => api.post(`validation/${queueItemId}/approve`),
  reject: (queueItemId: string) => api.post(`validation/${queueItemId}/reject`),
  reassign: (queueItemId: string, newAthleteId: string) => 
    api.post(`validation/${queueItemId}/reassign`, { newAthleteId }),
  bulk: (actions: any[]) => api.post('validation/bulk', { actions }),
};

// Videos API
export const videos = {
  list: (params?: any) => api.get('videos', { params }),
  get: (mediaId: string) => api.get(`videos/${mediaId}`),
};

// Events API
export const events = {
  list: (params?: any) => api.get('events', { params }),
  getSchedule: (eventId: string) => api.get(`events/${eventId}/schedule`),
  getResults: (eventId: string, scheduleId: string) => 
    api.get(`events/${eventId}/schedule/${scheduleId}/results`),
};

// Users API
export const users = {
  list: () => api.get('users'),
  create: (data: any) => api.post('users', data),
  photographers: {
    list: () => api.get('photographers'),
    create: (data: any) => api.post('photographers', data),
  },
};

// Search API
export const search = {
  unified: (query: string, types?: string[]) => 
    api.get('search', { params: { query, types } }),
};

export { api };
