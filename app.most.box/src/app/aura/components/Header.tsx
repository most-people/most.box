"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AuraHeader() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/aura";
  const isChat = pathname?.startsWith("/aura/chat");

  return (
    <header className="aura-header">
      <div className="container">
        <div className="brand">
          <div className="logo">AR</div>
          <span className="title">AuraChat</span>
        </div>
        <nav className="nav">
          <Link className={`nav-item ${isHome ? "active" : ""}`} href="/aura">
            首页
          </Link>
          <Link
            className={`nav-item ${isChat ? "active" : ""}`}
            href="/aura/chat"
          >
            聊天
          </Link>
          <a className="nav-item" href="#">
            群组
          </a>
          <a className="nav-item" href="#">
            频道
          </a>
        </nav>
        <div className="user">
          <div
            className="avatar"
            aria-label="用户头像"
            onClick={() => setShowUserMenu((s) => !s)}
          />
          <button
            className="icon-btn"
            onClick={() => setShowMobile((s) => !s)}
            aria-label="打开移动菜单"
          >
            ☰
          </button>
        </div>
      </div>
      {showMobile && (
        <div className="mobile-menu">
          <Link
            href="/aura"
            className={`mobile-item ${isHome ? "active" : ""}`}
          >
            首页
          </Link>
          <Link
            href="/aura/chat"
            className={`mobile-item ${isChat ? "active" : ""}`}
          >
            聊天
          </Link>
          <a href="#" className="mobile-item">
            群组
          </a>
          <a href="#" className="mobile-item">
            频道
          </a>
        </div>
      )}
      {showUserMenu && (
        <div className="user-menu">
          <a href="#" className="user-item">
            个人资料
          </a>
          <a href="#" className="user-item">
            安全中心
          </a>
          <a href="#" className="user-item">
            设置
          </a>
          <div className="divider" />
          <a href="#" className="user-item danger">
            退出登录
          </a>
        </div>
      )}
    </header>
  );
}
