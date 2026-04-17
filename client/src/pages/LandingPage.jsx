import React, { lazy, Suspense } from 'react';
import '../styles/landing.css';
import Navbar from '../components/landing/Navbar';
import HeroSection from '../components/landing/HeroSection';

const ProblemSection = lazy(() => import('../components/landing/ProblemSection'));
const FeaturesSection = lazy(() => import('../components/landing/FeaturesSection'));
const HowItWorksSection = lazy(() => import('../components/landing/HowItWorksSection'));
const CTASection = lazy(() => import('../components/landing/CTASection'));
const Footer = lazy(() => import('../components/landing/Footer'));

export default function LandingPage() {
  return (
    <div className="landing-page" style={{ fontFamily: "'Inter', sans-serif" }}>
      <Navbar />
      <HeroSection />
      <Suspense fallback={<div style={{ height: 200 }} />}>
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CTASection />
        <Footer />
      </Suspense>
    </div>
  );
}
