import axios from "axios";

export const api = axios.create({
  // baseURL: "http://127.0.0.1:1976",
  baseURL: "https://dot.most.red",
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
