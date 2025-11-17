"use client";
import React from "react";

export default function FooterSection() {
  return (
    <footer className="aura-footer">
      <div className="container">
        <div className="left">© {new Date().getFullYear()} AuraChat</div>
        <div className="right">
          <a href="#">隐私</a>
          <a href="#">条款</a>
          <a href="#">联系</a>
        </div>
      </div>
    </footer>
  );
}
