"use client";
import React from "react";

export default function HeroSection() {
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-inner">
          <div className="hero-text">
            <h1>
              去中心化
              <br />
              安全聊天系统
            </h1>
            <p>
              基于区块链技术的端到端加密聊天平台，保护您的隐私和数据主权，让通信真正属于您自己。
            </p>
            <div className="cta">
              <a className="btn primary" href="#">
                立即开始
              </a>
              <a className="btn ghost" href="#">
                观看演示
              </a>
            </div>
            <div className="rating">
              <div className="stars">★★★★☆</div>
              <span className="score">4.8/5</span>
              <span className="desc">来自全球 10,000+ 用户的信赖</span>
            </div>
          </div>
          <div className="hero-art">
            <div className="art-card" />
            <div className="decor decor-a" />
            <div className="decor decor-b" />
          </div>
        </div>
      </div>
    </section>
  );
}
