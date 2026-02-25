import axios from "axios";

export const { VITE_API_TOKEN } = import.meta.env;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/";

export const api = axios.create({
  baseURL: "https://api.ariadne.inc/api/v2",
  timeout: 50000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const api1 = axios.create({
  baseURL: API_BASE_URL,
  timeout: 50000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const authenticated = (apiInstance) => {
  const token = VITE_API_TOKEN;
  const authenticatedInstance = axios.create(apiInstance.defaults);

  authenticatedInstance.interceptors.request.use(
    (config) => {
      if (token) {
        config.params = {
          ...config.params,
          token: token,
        };
      } else {
        console.error("VITE_API_TOKEN is not defined in environment variables");
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  return authenticatedInstance;
};

export const authenticatedApi = authenticated(api);
export default authenticatedApi;
