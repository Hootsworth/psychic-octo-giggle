export default function BrandLogo({
  className = "",
  full = false,
  priority = false,
}: {
  className?: string;
  full?: boolean;
  priority?: boolean;
}) {
  return (
    <img
      alt="In Other Words"
      className={`block object-contain ${className}`}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      src="/logo.png"
    />
  );
}
