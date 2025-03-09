import axios, { AxiosResponse } from "axios";

// axios.defaults.validateStatus = (err: any) => {
//   return true;
// }

export const getErrMsg = (e: any) => e?.response?.data?.message || e?.message

const axiosInstance = axios.create({
  baseURL: "http://localhost:5001/api",
  withCredentials: true,
  headers: {
    Accept: "*/*",
    "Access-Control-Allow-Origin": "*",
  },
});

const fetchPostRequest = async (
  endpoint: string,
  data?: any,
  isFormData: boolean = false,
): Promise<any> => {
  const response: AxiosResponse<any> = await axiosInstance.post(
    endpoint,
    data,
    {
      headers: {
        ...(isFormData
          ? { "Content-Type": "multipart/form-data" }
          : { "Content-Type": "application/json" }),
      },
    },
  );
  return response.data;
};

const fetchPutRequest = async (
  endpoint: string,
  data: any,
  isFormData: boolean = false,
): Promise<any> => {
  const response: AxiosResponse<any> = await axiosInstance.put(endpoint, data, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
    },
  });
  return response.data;
};

const fetchPatchRequest = async (
  endpoint: string,
  data: any,
  isFormData: boolean = false,
): Promise<any> => {
  const response: AxiosResponse<any> = await axiosInstance.patch(
    endpoint,
    data,
    {
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
      },
    },
  );
  return response.data;
};

const fetchDeleteRequest = async (
  endpoint: string,
  data: any,
): Promise<any> => {
  const response: AxiosResponse<any> = await axiosInstance.delete(endpoint, {
    data,
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

const fetchGetRequest = async (endpoint: string): Promise<any> => {
  const response: AxiosResponse<any> = await axiosInstance.get(endpoint, {
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

const fetchApi = {
  get: fetchGetRequest,
  post: fetchPostRequest,
  put: fetchPutRequest,
  patch: fetchPatchRequest,
  delete: fetchDeleteRequest,
};

export default fetchApi;
