import React, { useState, useEffect } from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

interface OnboardingStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  position: 'center' | 'top-left' | 'top-right';
}

export const OnboardingWalkthrough: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      // Show onboarding after a brief delay for smooth entry
      setTimeout(() => setIsVisible(true), 500);
    }
  }, []);

  const steps: OnboardingStep[] = [
    {
      title: 'Welcome to AquaMind',
      description: 'Your intelligent irrigation control system powered by AI. Let\'s take a quick tour of the key features.',
      icon: <SparklesIcon className="w-12 h-12 text-blue-600" />,
      position: 'center'
    },
    {
      title: 'System Status Overview',
      description: 'Monitor your system health, zone status, and active schedules at a glance. The dashboard provides real-time updates on all irrigation activities.',
      icon: (
        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      position: 'top-left'
    },
    {
      title: 'Voice & Chat Controls',
      description: 'Use the AI Assistant in the bottom-right corner to control your system with natural language. Enable voice mode for hands-free operation!',
      icon: (
        <svg className="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      ),
      position: 'top-right'
    },
    {
      title: 'AI Suggestions & Memory',
      description: 'AquaMind learns from your preferences and proactively suggests optimizations. Check the suggestions panel for smart recommendations tailored to your landscape.',
      icon: (
        <svg className="w-12 h-12 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      position: 'center'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const step = steps[currentStep];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 pointer-events-none"
      />

      {/* Onboarding Card */}
      <div className={`fixed z-[60] transition-all duration-500 pointer-events-auto ${
        step.position === 'center' 
          ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' 
          : step.position === 'top-left'
          ? 'top-24 left-8'
          : 'top-24 right-8'
      }`}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md animate-slide-up">
          {/* Step Indicator */}
          <div className="flex gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'bg-blue-600' 
                    : index < currentStep 
                    ? 'bg-blue-300' 
                    : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center">
              {step.icon}
            </div>
          </div>

          {/* Content */}
          <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">
            {step.title}
          </h2>
          <p className="text-gray-600 text-center mb-8 leading-relaxed">
            {step.description}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
      `}</style>
    </>
  );
};
