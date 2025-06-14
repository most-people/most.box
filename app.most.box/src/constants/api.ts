import axios from "axios";

export const isDev = process.env.NODE_ENV !== "production";

export const DotAPI = isDev ? "http://localhost:1976" : "https://dot.most.red";
export const DotCID = isDev ? "http://localhost:8080" : "https://cid.most.red";

export const api = axios.create({
  baseURL: DotAPI,
});

// 添加请求拦截器，自动在 header 中加载 Authorization
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
