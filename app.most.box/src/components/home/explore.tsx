"use client";
import "./explore.scss";
import { useEffect, useState, useRef, useCallback } from "react";
import { bubbleColors } from "@/constants/bubble";
import { useUserStore } from "@/stores/userStore";
import Link from "next/link";

// 计算字符串哈希值
const hashString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// 计算气泡数量
const calculateBubbleCount = () => {
  const width = window.innerWidth;
  const baseCount = 6;
  const increment = Math.floor((width - 768) / 300) * 4;
  return Math.min(Math.max(baseCount + increment, 8), 36);
};

// 气泡组件
interface Bubble {
  address: string;
  username: string;
}
interface BubbleProps extends Bubble {
  size: [number, number];
}

const Bubble = ({ username, address, size }: BubbleProps) => {
  const bubbleRef = useRef<HTMLAnchorElement>(null);
  const [w, h] = size;
  const sizeFactor = w < 768 ? Math.max(w, h) / 1000 : Math.min(w, h) / 1000;

  // 根据名称生成一个固定的随机大小
  const nameHash = hashString(username);
  const originalSize = 120 + (nameHash % 36);
  const adjustedSize = Math.round(originalSize * sizeFactor);

  // 随机位置
  const initialX = Math.random() * (w - adjustedSize);
  const initialY = Math.random() * (h - adjustedSize);

  // 根据地址生成一个固定的随机颜色
  const colorIndex = hashString(address) % bubbleColors.length;
  const backgroundColor = bubbleColors[colorIndex];

  // 动画参数
  const duration = 20 + Math.random() * 40;
  const delay = Math.random() * 5;

  // 气泡样式
  const bubbleStyle = {
    width: `${adjustedSize}px`,
    height: `${adjustedSize}px`,
    left: `${initialX}px`,
    top: `${initialY}px`,
    background: backgroundColor,
    fontSize: `${Math.max(14, adjustedSize / 5)}px`,
    padding: `${(adjustedSize / 14).toFixed(0)}px`,
    animation: `float ${duration}s ease-in-out ${delay}s infinite`,
  };

  useEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble) return;

    const size = adjustedSize;
    const maxX = w - size;
    const maxY = h - size - 64;

    // 根据屏幕大小调整移动速度
    const speedFactor = Math.min(w, h) / 1500;

    // 随机速度和方向，屏幕越小速度越慢
    let speedX = (Math.random() - 0.5) * 0.5 * speedFactor;
    let speedY = (Math.random() - 0.5) * 0.5 * speedFactor;

    let x = initialX;
    let y = initialY;

    let animationFrameId: number;

    function updatePosition() {
      // 更新位置
      x += speedX;
      y += speedY;

      // 碰到边界反弹
      if (x <= 0 || x >= maxX) {
        speedX = -speedX;
        x = Math.max(0, Math.min(x, maxX));
      }

      if (y <= 0 || y >= maxY) {
        speedY = -speedY;
        y = Math.max(0, Math.min(y, maxY));
      }

      // 应用新位置
      if (bubble) {
        bubble.style.left = `${x}px`;
        bubble.style.top = `${y}px`;
      }

      // 继续动画
      animationFrameId = requestAnimationFrame(updatePosition);
    }

    // 开始动画
    updatePosition();

    // 清理函数
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [adjustedSize, initialX, initialY]);

  return (
    <Link
      href={{
        pathname: "/friend",
        hash: address,
      }}
      ref={bubbleRef}
      className="bubble"
      style={bubbleStyle}
    >
      {username}
    </Link>
  );
};

export default function HomeExplore() {
  const onlinePeople = useUserStore((state) => state.onlinePeople);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [size, setSize] = useState<[number, number]>([0, 0]);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 处理窗口大小变化（添加防抖）
  const handleResize = useCallback(() => {
    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置新的定时器，1秒后执行
    debounceTimerRef.current = setTimeout(() => {
      setSize([window.innerWidth, window.innerHeight]);
    }, 1000);
  }, []);

  // 初始化气泡数据
  useEffect(() => {
    if (Object.keys(onlinePeople).length === 0) return;

    const bubbleCount = calculateBubbleCount();
    const selectedBubbles = Object.keys(onlinePeople)
      .map((key) => {
        return { address: key, username: onlinePeople[key].value };
      })
      .sort(() => Math.random() - 0.5)
      .slice(0, bubbleCount);

    // 测试数据
    // const selectedBubbles = bubbleNames
    //   .map((key) => {
    //     return { address: key, username: key };
    //   })
    //   .sort(() => Math.random() - 0.5)
    //   .slice(0, bubbleCount);

    setBubbles(selectedBubbles);
    // 渲染
    setSize([window.innerWidth, window.innerHeight]);
  }, [onlinePeople, handleResize]);

  // 监听窗口大小变化
  useEffect(() => {
    window.addEventListener("resize", handleResize);
    // 监听屏幕方向变化
    window.addEventListener("orientationchange", handleResize);

    return () => {
      // 清理事件监听和定时器
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleResize]);

  return (
    <div className="bubbles-container" id="bubblesContainer">
      {size.some((e) => e) &&
        bubbles.map((bubble) => (
          <Bubble
            key={bubble.address}
            username={bubble.username}
            address={bubble.address}
            size={size}
          />
        ))}
    </div>
  );
}
