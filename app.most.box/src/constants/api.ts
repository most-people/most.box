import axios from "axios";

export const isDev = process.env.NODE_ENV !== "production";

export const DotAPI = isDev ? "http://localhost:1976" : "https://dot.most.red";
export const DotCID = isDev ? "http://localhost:8080" : "https://cid.most.red";

export const SupabaseURL = isDev
  ? "http://localhost:2025/auth/callback"
  : "https://most.box/auth/callback";

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

// 添加响应拦截器，自动处理 token 失效
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 网络错误
    if (error.code === "ERR_NETWORK") {
      window.location.href = "/dot";
    }
    return Promise.reject(error);
  }
);
