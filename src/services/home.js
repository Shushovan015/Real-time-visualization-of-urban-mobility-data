import { authenticatedApi } from "./index";

export const getPublicData = (id, params) => {
  return authenticatedApi.get(`/locations/${id}/parents/visitors`, { params });
};
