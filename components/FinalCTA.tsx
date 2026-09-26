const WHATSAPP_LINK = "https://wa.me/923317668600";

export default function FinalCTA() {
  return (
    <section
      id="contact"
      className="scroll-mt-24 bg-black px-6 py-28 text-center text-white"
    >
      <p className="text-sm text-neutral-400">Ready when you are</p>
      <h2 className="mt-4 text-5xl font-semibold tracking-tight sm:text-6xl">
        Book Your Detail
      </h2>
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 inline-flex items-center justify-center rounded-full bg-white px-9 py-4 text-sm font-medium text-black transition-transform hover:scale-[1.03]"
      >
        Book on WhatsApp
      </a>
    </section>
  );
}
