export default function BrandLogo({
  className = "",
  full = false,
  priority = false,
}: {
  className?: string;
  full?: boolean;
  priority?: boolean;
}) {
  const base = import.meta.env.BASE_URL ?? "/";
  const logoSrc = `${base.endsWith("/") ? base : `${base}/`}logo.png`;

  return (
    <img
      alt="In Other Words"
      className={`block object-contain ${className}`}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      src={logoSrc}
    />
  );
}
