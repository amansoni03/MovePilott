"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Users, Bus, ArrowRight } from 'lucide-react';

export default function SplashAndLogin() {
  const router = useRouter();
  const [phase, setPhase] = useState<'splash' | 'transition' | 'login'>('splash');

  useEffect(() => {
    // Show splash for 2.5 seconds, then transition to login
    const splashTimer = setTimeout(() => {
      setPhase('transition');

      const loginTimer = setTimeout(() => {
        setPhase('login');
      }, 800); // 800ms for transition blur effect

      return () => clearTimeout(loginTimer);
    }, 2500);

    return () => clearTimeout(splashTimer);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-900 flex items-center justify-center">

      {/* Background Image Container */}
      <div
        className={`absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out
          ${phase === 'splash' ? 'scale-100 opacity-100 filter-none' : ''}
          ${phase === 'transition' ? 'scale-105 opacity-80 blur-sm' : ''}
          ${phase === 'login' ? 'scale-110 opacity-70 blur-md' : ''}
        `}
      >
        <img
          src="/481211017_966591918899069_2194720222859782441_n.jpg"
          alt="School of Management Sciences Lucknow"
          className={`w-full h-full object-cover transition-transform duration-[3000ms] ease-out
            ${phase === 'splash' ? 'scale-105' : 'scale-110'}
          `}
          // Fallback if image doesn't exist yet
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      </div>

      {/* Splash Screen Content */}
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center transition-all duration-700 ease-in-out
          ${phase === 'splash' ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
      >
        {/* Top Right Logo */}
        <div className="absolute top-4 right-4 md:top-6 md:right-8 bg-white p-2 md:p-3 rounded-lg shadow-lg">
          <img src="/image1.png" alt="School Logo" className="h-16 md:h-20 object-contain" />
        </div>

        {/* Center Title */}
        <h1
          className="text-5xl md:text-7xl font-bold text-center px-4 tracking-wide leading-tight mb-8"
          style={{
            background: 'linear-gradient(to bottom, #fef08a 0%, #b45309 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.8)) drop-shadow(0px 1px 2px rgba(0,0,0,1))'
          }}
        >
          MOVE_PILOT <br />School Mobility Safety Console
        </h1>

        {/* === OPTION 1: PROFESSIONAL CIRCULAR SPINNER (ACTIVE) === */}
        <div className="flex flex-col items-center mt-2 mb-6">
          <div className="w-12 h-12 border-4 border-white/20 border-t-yellow-500 rounded-full animate-spin mb-4 drop-shadow-lg"></div>
          <div className="bg-black/50 backdrop-blur-md px-6 py-2 rounded-full border border-white/10 shadow-lg">
            <span className="text-white font-medium tracking-wide">Initializing Systems...</span>
          </div>
        </div>

        {/* === OPTION 2: PROGRESS BAR (COMMENTED OUT) === */}
        {/* 
        <div className="w-[85%] max-w-lg h-5 md:h-6 rounded-full border border-white/60 bg-black/40 backdrop-blur-sm overflow-hidden mb-6 shadow-[0_0_15px_rgba(255,255,255,0.2)] p-[2px]">
          <div className="h-full rounded-full bg-gradient-to-r from-slate-700 via-blue-800 to-yellow-300 w-0 animate-[fillProgress_2.5s_ease-in-out_forwards]" />
        </div>

        <div className="bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700 px-8 py-2 rounded-full text-black font-semibold text-sm md:text-base shadow-xl mb-3 border border-yellow-300/50">
          Pre-initialization in progress...
        </div>

        <p className="text-white font-medium text-sm md:text-base tracking-wide drop-shadow-md">
          Checking System Integrity...
        </p>
        */}

        {/* Injecting keyframes for the progress bar directly */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes fillProgress {
            0% { width: 0%; }
            100% { width: 95%; }
          }
        `}} />
      </div>

      {/* Login Screen Content */}
      <div
        className={`absolute inset-0 z-20 flex items-center justify-center p-4 md:p-12 transition-all duration-1000 ease-out delay-300
          ${phase === 'login' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20 pointer-events-none'}
        `}
      >
        {/* Floating Buses (Right side) */}
        <div className="absolute top-0 right-0 w-1/3 h-full overflow-hidden pointer-events-none">
          <svg className="absolute top-[20%] right-[10%] w-24 h-12 text-slate-200/50 animate-[float_6s_ease-in-out_infinite]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 11V8C4 5.79086 5.79086 4 8 4H16C18.2091 4 20 5.79086 20 8V11M4 11H20M4 11V16C4 17.1046 4.89543 18 6 18H7M20 11V16C20 17.1046 19.1046 18 18 18H17M7 18H17M7 18C7 19.6569 8.34315 21 10 21C11.6569 21 13 19.6569 13 18M17 18C17 19.6569 15.6569 21 14 21C12.3431 21 11 19.6569 11 18" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
          <svg className="absolute top-[40%] right-[25%] w-32 h-16 text-slate-200/60 animate-[float_8s_ease-in-out_infinite_1s]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 11V8C4 5.79086 5.79086 4 8 4H16C18.2091 4 20 5.79086 20 8V11M4 11H20M4 11V16C4 17.1046 4.89543 18 6 18H7M20 11V16C20 17.1046 19.1046 18 18 18H17M7 18H17M7 18C7 19.6569 8.34315 21 10 21C11.6569 21 13 19.6569 13 18M17 18C17 19.6569 15.6569 21 14 21C12.3431 21 11 19.6569 11 18" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
          <svg className="absolute bottom-[30%] right-[5%] w-20 h-10 text-slate-200/40 animate-[float_7s_ease-in-out_infinite_2s]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 11V8C4 5.79086 5.79086 4 8 4H16C18.2091 4 20 5.79086 20 8V11M4 11H20M4 11V16C4 17.1046 4.89543 18 6 18H7M20 11V16C20 17.1046 19.1046 18 18 18H17M7 18H17M7 18C7 19.6569 8.34315 21 10 21C11.6569 21 13 19.6569 13 18M17 18C17 19.6569 15.6569 21 14 21C12.3431 21 11 19.6569 11 18" stroke="currentColor" strokeWidth="1" fill="none" />
          </svg>
        </div>

        {/* Wavy Lines Background (Left Side) */}
        <div className="absolute top-1/2 -left-20 transform -translate-y-1/2 pointer-events-none opacity-30 mix-blend-overlay">
          <svg width="400" height="400" viewBox="0 0 400 400" fill="none">
            <path d="M0 200 Q 100 50 200 200 T 400 200" stroke="white" strokeWidth="2" fill="none" />
            <path d="M0 220 Q 100 70 200 220 T 400 220" stroke="white" strokeWidth="2" fill="none" />
            <path d="M0 240 Q 100 90 200 240 T 400 240" stroke="white" strokeWidth="2" fill="none" />
            <path d="M0 260 Q 100 110 200 260 T 400 260" stroke="white" strokeWidth="2" fill="none" />
            <path d="M0 180 Q 100 30 200 180 T 400 180" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        </div>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">

          {/* Admin Login Card */}
          <div
            onClick={() => router.push('/admin')}
            className="group relative overflow-hidden bg-slate-900/40 backdrop-blur-md border border-white/20 rounded-[2rem] p-8 md:p-10 cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl shadow-black/50 h-[380px] flex flex-col justify-between"
          >
            {/* Circuit Board Pattern */}
            <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{
              backgroundImage: 'radial-gradient(circle at 100% 100%, white 2px, transparent 2px), radial-gradient(circle at 0% 0%, white 2px, transparent 2px), linear-gradient(45deg, transparent 48%, white 48%, white 52%, transparent 52%), linear-gradient(-45deg, transparent 48%, white 48%, white 52%, transparent 52%)',
              backgroundSize: '40px 40px'
            }}></div>

            <div className="relative z-10">
              <div className="w-12 h-12 border border-white/50 rounded-xl flex items-center justify-center mb-8 bg-white/5 backdrop-blur-sm relative">
                <div className="absolute inset-0 border border-white/20 rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <ShieldCheck className="w-6 h-6 text-white/90" />
              </div>

              <h2 className="text-3xl font-bold mb-4 tracking-wide drop-shadow-md" style={{ color: '#ecd599' }}>Admin Portal</h2>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed pr-6 drop-shadow-sm font-medium">
                Access the central dashboard to monitor fleet, manage routes, and respond to live emergencies.
              </p>
            </div>

            <div className="flex items-center gap-2 text-blue-400 text-sm font-semibold group-hover:gap-4 transition-all duration-300 relative z-10">
              <span>Enter Portal</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

          {/* Parent Login Card */}
          <div
            onClick={() => router.push('/parent')}
            className="group relative overflow-hidden bg-slate-900/40 backdrop-blur-md border border-white/20 rounded-[2rem] p-8 md:p-10 cursor-pointer transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl shadow-black/50 h-[380px] flex flex-col justify-between"
          >
            {/* Nodes/Tree Pattern */}
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none flex items-end justify-end p-4">
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none">
                <circle cx="150" cy="50" r="20" stroke="white" strokeWidth="4" />
                <circle cx="150" cy="50" r="8" fill="white" />
                <path d="M150 70 V 100 M150 100 L 100 150 M150 100 L 180 130 M100 150 V 180 M180 130 V 180 M100 150 L 70 120" stroke="white" strokeWidth="4" />
                <circle cx="100" cy="180" r="10" stroke="white" strokeWidth="3" />
                <circle cx="180" cy="180" r="10" stroke="white" strokeWidth="3" />
                <circle cx="70" cy="120" r="10" stroke="white" strokeWidth="3" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="w-12 h-12 border border-white/50 rounded-xl flex items-center justify-center mb-8 bg-white/5 backdrop-blur-sm relative">
                <div className="absolute inset-0 border border-white/20 rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <Users className="w-6 h-6 text-white/90" />
              </div>

              <h2 className="text-3xl font-bold mb-4 tracking-wide drop-shadow-md" style={{ color: '#ecd599' }}>Parent Portal</h2>
              <p className="text-slate-300 text-sm md:text-base leading-relaxed pr-6 drop-shadow-sm font-medium">
                Track your child's bus in real-time, view boarding status, and manage notification preferences.
              </p>
            </div>

            <div className="flex items-center gap-2 text-slate-200 text-sm font-semibold group-hover:gap-4 transition-all duration-300 relative z-10">
              <span>Enter Portal</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>

        </div>

        {/* Float Animation Keyframes */}
        <style dangerouslySetInnerHTML={{
          __html: `
          @keyframes float {
            0%, 100% { transform: translateY(0) translateX(0); }
            50% { transform: translateY(-20px) translateX(10px); }
          }
        `}} />
      </div>
    </div>
  );
}
