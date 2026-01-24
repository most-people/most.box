import axios from "axios";

export const isDev = process.env.NODE_ENV !== "production";

export const api = axios.create({
  baseURL: "",
});

// 添加请求拦截器，自动在 header 中加载 Authorization
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// 添加响应拦截器，自动处理 token 失效
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  },
);
