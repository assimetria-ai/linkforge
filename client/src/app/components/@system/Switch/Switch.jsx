// @system — Switch component stub
export function Switch({ checked, onCheckedChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        height: '24px',
        width: '44px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: '12px',
        border: 'none',
        backgroundColor: checked ? 'var(--color-primary, #3b82f6)' : '#ccc',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color 0.2s',
        padding: 0,
      }}
    >
      <span
        style={{
          display: 'block',
          height: '20px',
          width: '20px',
          borderRadius: '50%',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          transform: checked ? 'translateX(22px)' : 'translateX(2px)',
          transition: 'transform 0.2s',
          marginTop: '2px',
        }}
      />
    </button>
  )
}

export default Switch
