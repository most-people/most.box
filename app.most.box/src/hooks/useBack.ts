// 导入 Next.js 的路由相关 hooks
import { usePathname, useRouter } from "next/navigation";
// 导入全局状态管理 store
import { useUserStore } from "@/stores/userStore";

// 自定义 hook，用于处理返回逻辑
export const useBack = () => {
  // 获取首次访问的路径
  const firstPath = useUserStore((state) => state.firstPath);
  // 获取更新状态的方法
  const setItem = useUserStore((state) => state.setItem);
  // 获取路由实例
  const router = useRouter();
  // 获取当前路径
  const pathname = usePathname();

  // 返回处理函数
  const back = () => {
    // 如果当前路径是首次访问的路径
    if (firstPath === pathname) {
      // 重置首页路径为根路径
      setItem("firstPath", "/");
      // 重定向到首页
      router.replace("/");
    } else {
      // 否则执行普通的返回操作
      router.back();
    }
  };

  return back;
};
