import React from 'react';

type GlassSwitchProps = {
  checked: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  style?: React.CSSProperties;
  [key: string]: any;
};

export default function GlassSwitch({ checked, onChange, style = {}, ...props }: GlassSwitchProps) {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', ...style }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{ display: 'none' }}
        {...props}
      />
      <span
        style={{
          width: 44,
          height: 24,
          borderRadius: 16,
          background: checked ? 'rgba(0,255,128,0.25)' : 'rgba(80,80,80,0.25)',
          border: checked ? '1.5px solid #0f8' : '1.5px solid #888',
          display: 'inline-block',
          position: 'relative',
          transition: 'background 0.2s, border 0.2s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: checked ? 22 : 2,
            top: 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: checked ? '#0f8' : '#ccc',
            boxShadow: '0 1px 4px #0004',
            transition: 'left 0.2s, background 0.2s',
          }}
        />
      </span>
    </label>
  );
}
