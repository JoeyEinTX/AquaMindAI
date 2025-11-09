import React, { ReactNode } from 'react';
import { RippleContainer } from './RippleEffect';

export interface GlassyCardProps {
  title?: string;
  accent?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const GlassyCard: React.FC<GlassyCardProps> = ({
  title,
  accent,
  children,
  footer,
  className = '',
  onClick,
}) => {
  const accentColor = accent || 'var(--accent-color)';
  
  return (
    <RippleContainer
      onClick={onClick}
      disabled={!onClick}
      className={`glass-card rounded-2xl p-4 sm:p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border border-white/20 backdrop-blur-xl relative overflow-hidden ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div style={{ background: 'var(--glass-bg)' }} className="absolute inset-0 -z-10 rounded-2xl" />
      {/* Subtle top-left light reflection */}
      <div
        className="absolute -top-20 -left-20 w-40 h-40 rounded-full opacity-20 pointer-events-none blur-3xl"
        style={{
          background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
        }}
      />

      {/* Accent border glow on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          boxShadow: `inset 0 0 20px ${accentColor}22`,
        }}
      />

      {/* Title section */}
      {title && (
        <div className="relative z-10 mb-4 pb-3 border-b border-white/10">
          <h3
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: 'var(--text-primary)' }}
          >
            <span
              className="w-1 h-6 rounded-full"
              style={{ backgroundColor: accentColor }}
            />
            {title}
          </h3>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10" style={{ color: 'var(--text-primary)' }}>
        {children}
      </div>

      {/* Footer section */}
      {footer && (
        <div className="relative z-10 mt-4 pt-3 border-t border-white/10">
          {footer}
        </div>
      )}

      {/* Hover gradient sweep */}
      <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div
          className="absolute inset-0 animate-gradient-sweep"
          style={{
            background: `linear-gradient(135deg, transparent 0%, ${accentColor}08 50%, transparent 100%)`,
          }}
        />
      </div>
    </RippleContainer>
  );
};

export default GlassyCard;
