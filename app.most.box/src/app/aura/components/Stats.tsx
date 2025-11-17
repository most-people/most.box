"use client";
import React from "react";

export default function StatsSection() {
  return (
    <section className="aura-stats">
      <h2>网络使用数据</h2>
      <p className="desc">AuraChat网络持续增长，全球用户和节点分布</p>
      <div className="stats-grid">
        <div className="stats-card">
          <div className="title">活跃用户</div>
          <div className="value">158,421</div>
          <div className="sub">较上月增长</div>
          <div className="progress">
            <div style={{ width: "78%" }} />
          </div>
          <div className="trend up">+ 12.5%</div>
        </div>
        <div className="stats-card">
          <div className="title">网络节点</div>
          <div className="value">3,742</div>
          <div className="sub">全球分布式节点</div>
          <div className="progress">
            <div style={{ width: "66%" }} />
          </div>
          <div className="trend up">+ 8.3%</div>
        </div>
        <div className="stats-card">
          <div className="title">每日消息</div>
          <div className="value">2.8M+</div>
          <div className="sub">端到端加密消息</div>
          <div className="progress">
            <div style={{ width: "84%" }} />
          </div>
          <div className="trend up">+ 15.2%</div>
        </div>
        <div className="donut-card">
          <div className="toolbar">
            <button className="active">月度</button>
            <button>季度</button>
            <button>年度</button>
          </div>
          <div className="donut">
            <svg viewBox="0 0 120 120" width="220" height="220">
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="#E9EDF5"
                strokeWidth="18"
                fill="none"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="#6C8CF0"
                strokeWidth="18"
                fill="none"
                strokeDasharray="140 314"
                strokeDashoffset="-10"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="#FF6B6B"
                strokeWidth="18"
                fill="none"
                strokeDasharray="70 384"
                strokeDashoffset="-155"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                stroke="#33D6A6"
                strokeWidth="18"
                fill="none"
                strokeDasharray="110 344"
                strokeDashoffset="-240"
              />
            </svg>
          </div>
          <ul className="legend">
            <li>
              <span className="dot blue" /> 北美
            </li>
            <li>
              <span className="dot red" /> 欧洲
            </li>
            <li>
              <span className="dot green" /> 亚洲
            </li>
            <li>
              <span className="dot gray" /> 其他
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
