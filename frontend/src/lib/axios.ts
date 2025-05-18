import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

export const getErrMsg = (e: unknown): string => {
  if (axios.isAxiosError(e)) return e.response?.data?.message ?? e.message;
  return (e as Error)?.message ?? "Unknown error";
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

const request = async <T = unknown>(
  method: AxiosRequestConfig["method"],
  endpoint: string,
  data?: unknown,
  isFormData = false,
): Promise<any> => {
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

  const res: AxiosResponse<T> = await axiosInstance.request<T>(cfg);
  return res.data;
};

const fetchApi = {
  get: <T = unknown>(endpoint: string) => request<T>("get", endpoint),
  post: <T = unknown>(endpoint: string, data?: unknown, isFormData = false) =>
    request<T>("post", endpoint, data, isFormData),
  put: <T = unknown>(endpoint: string, data?: unknown, isFormData = false) =>
    request<T>("put", endpoint, data, isFormData),
  patch: <T = unknown>(endpoint: string, data?: unknown, isFormData = false) =>
    request<T>("patch", endpoint, data, isFormData),
  delete: <T = unknown>(endpoint: string, data?: unknown) =>
    request<T>("delete", endpoint, data),
};

export default fetchApi;
