import React from 'react';

export default function GlassCard({ children, style = {}, ...props }) {
  return (
    <div
      {...props}
      style={{
        borderRadius: 24,
        background: 'rgba(30,30,30,0.55)',
        border: '1.5px solid rgba(255,255,255,0.13)',
        boxShadow: '0 6px 32px 0 rgba(0,0,0,0.22)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: 24,
        marginBottom: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
