import React from 'react';

export default function GlassSlider({ style = {}, ...props }) {
  return (
    <input
      type="range"
      {...props}
      style={{
        WebkitAppearance: 'none',
        width: '100%',
        height: 8,
        borderRadius: 8,
        background: 'rgba(60,60,60,0.35)',
        boxShadow: '0 1px 4px 0 rgba(0,0,0,0.10)',
        outline: 'none',
        transition: 'background 0.2s',
        ...style,
      }}
    />
  );
}
