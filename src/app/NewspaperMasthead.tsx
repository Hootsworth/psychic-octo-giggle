import BrandLogo from "./BrandLogo";

export type NewspaperMastheadSettings = {
  mastheadStyle?: "brand" | "custom-logo" | "text";
  mastheadLogo?: string;
  mastheadTitle?: string;
};

export default function NewspaperMasthead({
  settings,
  className = "",
}: {
  settings?: NewspaperMastheadSettings;
  className?: string;
}) {
  const style = settings?.mastheadStyle ?? "text";
  return (
    <div className={`flex min-h-16 items-center justify-center py-3 text-center sm:min-h-20 ${className}`}>
      {style === "brand" ? (
        <BrandLogo className="max-h-20 w-auto max-w-full object-contain" />
      ) : style === "custom-logo" && settings?.mastheadLogo ? (
        <img alt={settings.mastheadTitle || "Publication logo"} className="max-h-20 max-w-full object-contain" src={settings.mastheadLogo} />
      ) : (
        <h1 className="font-serif text-[clamp(2.5rem,7vw,5.5rem)] font-black uppercase leading-[0.82] tracking-[-0.075em]">
          {settings?.mastheadTitle?.trim() || "The Campus Gazette"}
        </h1>
      )}
    </div>
  );
}
