"use client";
import React from "react";
import "./aura.scss";
import HeroSection from "@/app/aura/components/Hero";
import FeaturesSection from "@/app/aura/components/Features";
import ArchitectureSection from "@/app/aura/components/Architecture";
import FooterSection from "@/app/aura/components/Footer";
import StatsSection from "@/app/aura/components/Stats";
import PlatformsSection from "@/app/aura/components/Platforms";
import FAQSection from "@/app/aura/components/FAQ";
import JoinSection from "@/app/aura/components/Join";

export default function AuraPage() {
  return (
    <div className="aura">
      <main className="aura-main">
        <HeroSection />
        <FeaturesSection />
        <ArchitectureSection />
        <StatsSection />
        <PlatformsSection />
        <FAQSection />
        <JoinSection />
      </main>
      <FooterSection />
    </div>
  );
}
