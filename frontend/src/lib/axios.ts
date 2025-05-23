import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ApiError, ApiResponse } from "../types/api.types";

export const getErrMsg = (e: unknown): string => {
  if (axios.isAxiosError(e)) {
    const axiosError = e as AxiosError<ApiError>;
    return axiosError.response?.data?.message ?? axiosError.message;
  }
  if (e instanceof Error) return e.message;
  return String(e) || "Unknown error";
};


const axiosInstance: AxiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5001/api"
      : "/api",
  withCredentials: true,
  headers: {
    Accept: "*/*",
  },
});

const request = async <T = any>(
  method: AxiosRequestConfig["method"],
  endpoint: string,
  data?: unknown,
  isFormData = false,
): Promise<ApiResponse<T>> => {
  const headers: Record<string, string> = {};
  if (!isFormData && ["post", "put", "patch"].includes(method!)) {
    headers["Content-Type"] = "application/json";
  }
  if (isFormData) headers["Content-Type"] = "multipart/form-data";

  const cfg: AxiosRequestConfig = {
    url: endpoint,
    method,
    data,
    headers,
  };

  try {
    const res: AxiosResponse<ApiResponse<T>> = await axiosInstance.request<ApiResponse<T>>(cfg);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw error;
    }
    throw new Error(getErrMsg(error));
  }
};

const fetchApi = {
  get: <T = any>(endpoint: string): Promise<ApiResponse<T>> =>
    request<T>("get", endpoint),

  post: <T = any>(endpoint: string, data?: unknown, isFormData = false): Promise<ApiResponse<T>> =>
    request<T>("post", endpoint, data, isFormData),

  put: <T = any>(endpoint: string, data?: unknown, isFormData = false): Promise<ApiResponse<T>> =>
    request<T>("put", endpoint, data, isFormData),

  patch: <T = any>(endpoint: string, data?: unknown, isFormData = false): Promise<ApiResponse<T>> =>
    request<T>("patch", endpoint, data, isFormData),

  delete: <T = any>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> =>
    request<T>("delete", endpoint, data),
};

export default fetchApi;
