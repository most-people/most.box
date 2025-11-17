"use client";
import React, { useState } from "react";

const QA = [
  {
    q: "AuraChat如何保证端到端隐私安全?",
    a: "所有消息使用端到端加密，仅客户端完成解密。消息无法被第三方或服务器读取。我们使用现代密码学与密钥交换协议确保传输安全。",
  },
  {
    q: "什么是去中心化聊天，它与传统IM有什么不同?",
    a: "去中心化聊天不依赖中心化服务器，网络由用户节点共同维护，消息与身份可以在不同节点中自由迁移，抵抗单点故障与审查。",
  },
  {
    q: "认证加入AuraChat网络?",
    a: "通过去中心化身份（DID）完成注册，生成密钥并绑定你的设备。你可以选择开启社交恢复以避免密钥丢失造成的风险。",
  },
  {
    q: "如果遇到异常，在哪里寻求帮助?",
    a: "你可以加入社区Discord或Telegram，也可以在GitHub提交Issue，社区会在第一时间响应与修复。",
  },
  {
    q: "AuraChat支持文件或媒体传输吗?",
    a: "支持。通过分布式存储（如IPFS或Arweave）进行内容的去中心化存储，消息体只传递索引与加密元信息，上传与下载在端侧完成。",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="aura-faq">
      <h2>常见问题</h2>
      <p className="desc">关于AuraChat的常见问答</p>
      <div className="faq-list">
        {QA.map((item, idx) => (
          <div key={idx} className={`faq-item ${open === idx ? "open" : ""}`}>
            <button
              className="question"
              onClick={() => setOpen(open === idx ? null : idx)}
            >
              {item.q}
              <span className="arrow">{open === idx ? "−" : "+"}</span>
            </button>
            {open === idx && <div className="answer">{item.a}</div>}
          </div>
        ))}
      </div>
    </section>
  );
}
