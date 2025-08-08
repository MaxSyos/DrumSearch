import React from 'react';

export default function GlassButton({ children, style = {}, ...props }) {
  return (
    <button
      {...props}
      style={{
        borderRadius: 16,
        background: 'rgba(40,40,40,0.45)',
        color: '#fff',
        border: '1.5px solid rgba(255,255,255,0.18)',
        boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        fontWeight: 700,
        fontSize: 18,
        padding: '10px 32px',
        cursor: 'pointer',
        transition: 'background 0.2s, color 0.2s, border 0.2s',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
