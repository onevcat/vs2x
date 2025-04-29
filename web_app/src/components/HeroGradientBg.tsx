// Hero 渐变背景装饰，模仿 yourware.so 首页的柔光氛围
import React from 'react';

const HeroGradientBg: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute left-1/2 top-[-120px] -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-br from-[#e0e7ff] via-[#c7d2fe] to-white opacity-90 blur-3xl rounded-full" />
    <div className="absolute left-1/2 top-[180px] -translate-x-1/2 w-[700px] h-[300px] bg-gradient-to-tr from-[#fbc2eb] via-[#a6c1ee] to-white opacity-60 blur-2xl rounded-full" />
  </div>
);

export default HeroGradientBg;
