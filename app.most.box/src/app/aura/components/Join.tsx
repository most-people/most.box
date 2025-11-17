"use client";
import React, { useState } from "react";
import { Icon } from "@/components/Icon";

export default function JoinSection() {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("开发者");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    alert(`已订阅：${email}（意向：${reason}）`);
    setEmail("");
    setReason("开发者");
  }

  return (
    <section className="aura-join">
      <div className="card">
        <div className="left">
          <h2>加入DecentralChat社区</h2>
          <p>成为去中心化通信革命的一部分，保护你的隐私和数据主权。</p>
          <form className="form" onSubmit={submit}>
            <label className="label">电子邮箱</label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label className="label">您为什么想要？</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>开发者</option>
              <option>贡献者</option>
              <option>设计师</option>
              <option>普通用户</option>
            </select>
            <button type="submit">
              <Icon name="Telegram" size={14} />
              订阅更新
            </button>
          </form>
          <small>我们重视你的隐私，不会向第三方分享你的信息。</small>
        </div>
        <div className="right">
          <img src="/img/aura/chat-bg.png" alt="Community" />
        </div>
      </div>
    </section>
  );
}
