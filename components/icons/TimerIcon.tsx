
import React from 'react';

export const TimerIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <line x1="10" y1="2" x2="14" y2="2"/>
        <line x1="12" y1="22" x2="12" y2="18"/>
        <path d="M19 12a7 7 0 1 0-7 7"/>
    </svg>
);
