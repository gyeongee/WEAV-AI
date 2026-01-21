import React from 'react';

export const WelcomeScreen: React.FC = () => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center -mt-20 px-4">
        <div className="mb-8 text-center animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-500 mb-3">
                안녕하세요, 크리에이터님.
            </h2>
            <p className="text-neutral-500 text-lg">
                오늘은 무엇을 도와드릴까요?
            </p>
        </div>
    </div>
  );
};