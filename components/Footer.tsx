const WHATSAPP_LINK = "https://wa.me/923317668600";

const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Services", href: "#services" },
  { label: "Our Work", href: "#work" },
  { label: "Contact", href: "#contact" },
];

const LEGAL_LINKS = [
  { label: "Privacy", href: "#" },
  { label: "Terms", href: "#" },
];

export default function Footer() {
  return (
    <footer className="bg-black py-16 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 text-center">
        <p className="text-lg font-medium tracking-tight">
          Attention to Detail Studios
        </p>

        <nav className="flex flex-wrap items-center justify-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-300 transition-colors hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3.5 text-sm text-neutral-200 transition-colors hover:border-white/40 hover:text-white"
        >
          Message us on WhatsApp
        </a>

        <div className="flex items-center gap-4 text-xs text-neutral-500">
          {LEGAL_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-neutral-300"
            >
              {link.label}
            </a>
          ))}
        </div>

        <a
          href="#top"
          className="text-xs text-neutral-500 underline underline-offset-4 transition-colors hover:text-neutral-300"
        >
          Back to top
        </a>

        <p className="text-xs text-neutral-600">
          © {new Date().getFullYear()} Attention to Detail Studios
        </p>
      </div>
    </footer>
  );
}
