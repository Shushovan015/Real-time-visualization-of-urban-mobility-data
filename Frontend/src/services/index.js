import axios from "axios";

// Get environment variables
export const { VITE_API_TOKEN } = import.meta.env;

// Create base API instance
export const api = axios.create({
  baseURL: "https://api.ariadne.inc/api/v2",
  timeout: 50000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const api1 = axios.create({
  baseURL: "http://localhost:3000/",
  timeout: 50000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export const authenticated = (apiInstance) => {
  const token = VITE_API_TOKEN;

  // Create a new instance to avoid modifying the original
  const authenticatedInstance = axios.create(apiInstance.defaults);

  // Add request interceptor to append token to all requests
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
    (error) => {
      return Promise.reject(error);
    }
  );

  return authenticatedInstance;
};

export const authenticatedApi = authenticated(api);

export default authenticatedApi;
