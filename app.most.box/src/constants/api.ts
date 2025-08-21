import axios from "axios";

export const isDev = process.env.NODE_ENV !== "production";

export const SupabaseURL = isDev
  ? "http://localhost:2025/auth/callback"
  : "https://most.box/auth/callback";

export const api = axios.create({
  baseURL: "",
});

// 由客户端组件注入的路由跳转函数 useRouter().push
let routerPush: ((url: string) => void) | null = null;
export const setRouterPush = (push: (url: string) => void) => {
  routerPush = push;
};

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
    if (routerPush) {
      routerPush("/dot");
    }
    return Promise.reject(error);
  }
);
