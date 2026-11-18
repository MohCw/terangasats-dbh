export function BrandLogo() {
  return (
    <svg className="brand__logo" viewBox="0 0 36 36" aria-hidden="true">
      <rect width="36" height="36" rx="10" fill="#0b6b4d" />
      <path d="M20 6L10 20h7l-1 10 10-14h-7z" fill="#fff" />
    </svg>
  );
}

export function Brand() {
  return (
    <a className="brand" href="#/" aria-label="TerangaSats">
      <BrandLogo />
      <span className="brand__name" aria-hidden="true" />
    </a>
  );
}