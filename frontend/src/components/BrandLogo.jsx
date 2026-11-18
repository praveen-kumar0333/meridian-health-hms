export default function BrandLogo({
  size = 'md',
  showSubtitle = true,
  showTagline = false,
  tone = 'dark',
}) {
  return (
    <div className={`brand-lockup brand-lockup--${size} brand-lockup--${tone}`}>
      <div className="brand-emblem" aria-hidden="true">
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="meridianLogoGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0F4C81" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
          </defs>
          <rect width="36" height="36" rx="9" fill="url(#meridianLogoGrad)" />
          <path
            d="M15.6 8.5H20.4V15.6H27.5V20.4H20.4V27.5H15.6V20.4H8.5V15.6H15.6V8.5Z"
            fill="rgba(255,255,255,0.96)"
          />
          <path
            d="M9.5 18H13.6L15.8 14.2L19.2 21.8L21.5 18H26.5"
            stroke="#0F4C81"
            strokeWidth="1.65"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="brand-text">
        <span className="brand-name">Meridian Health</span>
        {showSubtitle && <span className="brand-subtitle">Hospital Management System</span>}
        {showTagline && <span className="brand-tagline">Modern Healthcare. Connected Care.</span>}
      </div>
    </div>
  );
}
