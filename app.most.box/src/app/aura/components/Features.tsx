"use client";
import React from "react";

export default function FeaturesSection() {
  return (
    <section className="features">
      <div className="container">
        <div className="section-head">
          <h2>为什么选择 AuraChat?</h2>
          <p>
            我们的去中心化聊天系统提供传统聊天应用无法比拟的安全性和隐私保护
          </p>
        </div>
        <div className="grid">
          <div className="card">
            <div className="icon" />
            <h3>端到端加密</h3>
            <p>
              所有消息默认采用端到端加密技术，确保只有接收方能够解密和阅读您的信息。
            </p>
          </div>
          <div className="card">
            <div className="icon" />
            <h3>去中心化架构</h3>
            <p>
              没有中央服务器存储您的数据，采用分布式节点网络，抗审查且高可用。
            </p>
          </div>
          <div className="card">
            <div className="icon" />
            <h3>用户数据主权</h3>
            <p>
              您完全控制自己的数据，支持自毁消息和本地存储清理，避免永久留存。
            </p>
          </div>
          <div className="card">
            <div className="icon" />
            <h3>群组与频道</h3>
            <p>支持公开频道与私密群组，权限透明可控，体验轻量但强大。</p>
          </div>
          <div className="card">
            <div className="icon" />
            <h3>分布式文件存储</h3>
            <p>使用 IPFS/Arweave 存储媒体文件，传输安全且抗审查，缓存可控。</p>
          </div>
          <div className="card">
            <div className="icon" />
            <h3>去中心化 Bot 生态</h3>
            <p>接入链上 Bot，权限由用户授权，数据交互透明可审计。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
