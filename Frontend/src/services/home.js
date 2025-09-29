import { authenticatedApi, api1 } from "./index";

// export const getPublicData = (id, params) => {
//   return authenticatedApi.get(`/locations/${id}/parents/visitors`, { params });
// };

export const getPublicData = (id, params) => {
  return api1.get(`api/crowd/live`, { params });
};

export const getPlacesData = (id, params) => {
  return api1.get(`api/places`, { params });
};

export const getPastData = (id, params) => {
  return api1.get(`api/crowd`, { params });
};

export const getPublicDataPerMinute = (params) => {
  return api1.get(`api/crowd/mongo/recent`, { params });
};

export const getAllHourlyHistoryData = (params) =>
  api1.get(`api/crowd/hourly-history-all`, { params });

export const getHourlyHistoryData = (params) =>
  api1.get(`api/crowd/hourly-history`, { params });

export const getNowNextData = (params) =>
  api1.get(`api/recommendations/now-next`, { params });

// export const getDurationsData = (id, params) =>
//   authenticatedApi.get(`/locations/${id}/durations`, { params });

// export const getAreaDurationsData = (id, params) =>
//   authenticatedApi.get(`/locations/${id}/areas/durations`, { params });

// export const getParentVisitorsData = (id, params) =>
//   authenticatedApi.get(`/locations/${id}/parents/visitors`, { params });

// export const getParentDurationsData = (id, params) =>
//   authenticatedApi.get(`/locations/${id}/parents/durations`, { params });

// export const getTrajectoryData = (id, params) =>
//   authenticatedApi.get(`/locations/${id}/trajectory`, { params });

// export const getOptinData = (id, params) =>
//   authenticatedApi.get(`/locations/${id}/optin`, { params });

// export const getTransitionsData = (id, params) =>
//   authenticatedApi.get(`/locations/${id}/transitions`, { params });

// export const getLocations = (id, params) =>
//   authenticatedApi.get(`/locations`, { params });

// export const getParents = (id, params) =>
//   authenticatedApi.get(`/locations/${id}/parents`);
