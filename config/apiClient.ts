import axios from "axios";
import * as sessionStorage from "@/utils/sessionStorage";

const ACTIVATION_CODE_KEY = "syncnox_activation_code";
const rawUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8000/api";

export const API_BASE_URL = rawUrl;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Use the same persisted credential as login on both web and native.
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const code = await sessionStorage.getItemAsync(ACTIVATION_CODE_KEY);
      if (code) {
        config.headers["activation-code"] = code;
      }
    } catch (e) {
      console.warn("apiClient interceptor error:", e);
    }
    return config;
  },
  (error) => Promise.reject(error),
);
