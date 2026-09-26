const WHATSAPP_LINK = "https://wa.me/923317668600";

export default function StatementSection() {
  return (
    <section className="bg-black px-6 py-32 text-center text-white">
      <p className="mx-auto max-w-3xl text-3xl font-medium leading-snug tracking-tight sm:text-5xl">
        A car should feel cared for before it ever leaves the bay.
      </p>
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 inline-block text-sm text-neutral-400 underline underline-offset-4 transition-colors hover:text-white"
      >
        Get in touch
      </a>
    </section>
  );
}
