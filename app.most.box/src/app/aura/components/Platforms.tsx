"use client";
import React from "react";

export default function PlatformsSection() {
  return (
    <section className="aura-platforms">
      <div className="content">
        <div className="text">
          <h2>多平台支持</h2>
          <p>
            在任意设备上使用AuraChat，保持跨端的隐私安全体验。支持Web、移动端和桌面端。
          </p>
          <div className="badges">
            <span className="badge">App Store</span>
            <span className="badge">Google Play</span>
            <span className="badge">Windows</span>
            <span className="badge">Linux</span>
            <span className="badge">Web</span>
          </div>
        </div>
        <div className="visual">
          <img src="/img/aura/aura-bg.png" alt="aura" />
        </div>
      </div>
    </section>
  );
}
