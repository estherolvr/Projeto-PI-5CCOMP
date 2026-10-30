interface FecapLogoProps {
  size?: number
  className?: string
  variant?: 'auto' | 'green' | 'white'
}

export default function FecapLogo({ size = 32, className = '', variant = 'auto' }: FecapLogoProps) {
  if (variant === 'green') {
    return (
      <img
        src="/fecap-green.png"
        alt="FECAP"
        width={size}
        height={size}
        className={`object-contain select-none ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  if (variant === 'white') {
    return (
      <img
        src="/fecap-white.png"
        alt="FECAP"
        width={size}
        height={size}
        className={`object-contain select-none ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  // Auto variant: renders green in light mode and white in dark mode
  return (
    <>
      <img
        src="/fecap-green.png"
        alt="FECAP"
        width={size}
        height={size}
        className={`dark:hidden object-contain select-none ${className}`}
        style={{ width: size, height: size }}
      />
      <img
        src="/fecap-white.png"
        alt="FECAP"
        width={size}
        height={size}
        className={`hidden dark:block object-contain select-none ${className}`}
        style={{ width: size, height: size }}
      />
    </>
  )
}

export function FecapLogoDark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <img
      src="/fecap-white.png"
      alt="FECAP"
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
