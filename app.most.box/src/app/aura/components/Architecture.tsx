"use client";
import React from "react";

const steps = [
  {
    title: "区块链身份认证",
    desc: "基于去中心化身份（DID）的跨平台认证，无需中央服务器存储用户信息，确保身份安全。",
    color: "purple",
  },
  {
    title: "P2P 网络传输",
    desc: "采用点对点网络协议进行消息传输，消除中心瓶颈，提高抗审查能力与可靠性。",
    color: "teal",
  },
  {
    title: "端到端加密",
    desc: "使用现代密码学确保消息全程加密，防止中间人攻击与数据泄露。",
    color: "primary",
  },
  {
    title: "分布式存储",
    desc: "利用 IPFS/Arweave 等分布式存储，实现媒体内容的安全存储与高效访问。",
    color: "orange",
  },
  {
    title: "智能合约治理",
    desc: "通过智能合约执行治理规则，公开透明且不可篡改，保障网络自治与安全。",
    color: "indigo",
  },
];

export default function ArchitectureSection() {
  return (
    <section className="architecture">
      <div className="container">
        <div className="section-head">
          <h2>去中心化技术架构</h2>
          <p>我们将强健的密码学与去中心化协议栈融合，确保安全与可靠性</p>
        </div>
        <div className="timeline">
          {steps.map((s, idx) => (
            <div key={s.title} className={`step ${idx % 2 === 0 ? "left" : "right"}`}>
              <div className="content">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
              <div className={`marker ${s.color}`}>
                <span className="dot" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
