import { api } from "./api";

/**
 * 后端文件接口参数
 */
export interface FileAddParams {
  cid: string;
  file_name: string;
  file_size: number;
  file_type: string;
  tx_hash?: string;
  path?: string;
  expired_at?: number;
}

/**
 * Most.Box API 服务封装
 */
export const mostApi = {
  // --- 文件接口 ---

  /**
   * 添加/更新文件记录
   */
  addFile: async (params: FileAddParams) => {
    return api.post(`/file.add`, params);
  },

  /**
   * 获取文件列表
   */
  listFiles: async (path: string = "/") => {
    return api.post(`/file.list`, { path });
  },

  /**
   * 删除文件记录
   */
  deleteFile: async (cid: string) => {
    return api.post(`/file.delete`, { cid });
  },

  // --- 用户接口 ---

  /**
   * 设置/更新用户信息
   */
  setUser: async (username: string) => {
    return api.post(`/user.set`, { username });
  },

  /**
   * 获取当前用户信息
   */
  getUser: async () => {
    return api.post(`/user.get`, {});
  },

  /**
   * 删除当前用户
   */
  deleteUser: async () => {
    return api.post(`/user.delete`, {});
  },

  // --- 管理接口 (受 authMiddleware 保护，通常只有节点管理员或特定地址可访问) ---

  /**
   * 获取所有用户 (Admin)
   */
  getAdminUsers: async () => {
    return api.get(`/admin.users`);
  },

  /**
   * 清空所有表 (Admin)
   */
  clearAdminTables: async () => {
    return api.post(`/admin.clear.tables`, {});
  },
};
