import React from 'react';

export default function GlassInput({ style = {}, ...props }) {
  return (
    <input
      {...props}
      style={{
        borderRadius: 12,
        background: 'rgba(40,40,40,0.35)',
        color: '#fff',
        border: '1.5px solid rgba(255,255,255,0.18)',
        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        fontWeight: 500,
        fontSize: 18,
        padding: '8px 16px',
        outline: 'none',
        ...style,
      }}
    />
  );
}
