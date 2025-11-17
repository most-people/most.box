"use client";
import React from "react";
import AuraHeader from "@/app/aura/components/Header";
import "./aura.scss";

export default function AuraLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aura">
      <AuraHeader />
      <main className="aura-main">{children}</main>
    </div>
  );
}