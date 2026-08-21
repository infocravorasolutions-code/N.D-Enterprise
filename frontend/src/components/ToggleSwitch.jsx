import React from 'react';

const ToggleSwitch = ({ 
  checked, 
  onChange, 
  labelOn = "ON", 
  labelOff = "OFF", 
  disabled = false,
  showLabel = true,
  title = "" 
}) => {
  return (
    <div 
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '8px', 
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none' 
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onChange) {
          onChange(!checked);
        }
      }}
      title={title || (checked ? "Auto Punch is ON. Click to turn OFF" : "Auto Punch is OFF. Click to turn ON")}
    >
      <div
        style={{
          width: '50px',
          height: '26px',
          borderRadius: '13px',
          backgroundColor: checked ? '#10b981' : '#cbd5e1',
          boxShadow: checked ? '0 0 12px rgba(16, 185, 129, 0.5)' : 'none',
          position: 'relative',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          opacity: disabled ? 0.6 : 1,
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
            position: 'absolute',
            left: '3px',
            transform: checked ? 'translateX(24px)' : 'translateX(0px)',
            transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: checked ? '#047857' : '#64748b',
            letterSpacing: '0.3px',
            minWidth: '28px'
          }}
        >
          {checked ? labelOn : labelOff}
        </span>
      )}
    </div>
  );
};

export default ToggleSwitch;
