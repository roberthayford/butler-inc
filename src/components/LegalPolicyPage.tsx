import type { LegalPolicy } from "@/data/legal-policies";

type LegalPolicyPageProps = {
  policy: LegalPolicy;
};

function getLineKind(line: string, versionLine: string) {
  if (line === versionLine) {
    return "version";
  }

  if (line === "Contact") {
    return "section";
  }

  if (/^\d+\.\s/.test(line)) {
    return "section";
  }

  if (/^\d+\.\d+\s/.test(line)) {
    return "subsection";
  }

  return "paragraph";
}

export function LegalPolicyPage({ policy }: LegalPolicyPageProps) {
  return (
    <main className="min-h-screen bg-charcoal text-optical-white">
      <section className="border-b border-primary-foreground/10 px-6 pb-12 pt-32 md:pb-16 md:pt-40">
        <div className="mx-auto max-w-4xl">
          <p className="mb-4 text-sm font-semibold text-brass-text">
            {policy.eyebrow}
          </p>
          <h1 className="font-serif text-4xl font-bold leading-tight md:text-6xl">
            {policy.title}
          </h1>
          <p className="mt-6 max-w-3xl text-base leading-7 text-optical-white/80 md:text-lg md:leading-8">
            {policy.description}
          </p>
          <p className="mt-5 text-sm text-warm-gray">{policy.versionLine}</p>
        </div>
      </section>

      <section className="px-6 py-12 md:py-16">
        <article className="mx-auto max-w-3xl">
          {policy.content.map((line, index) => {
            const kind = getLineKind(line, policy.versionLine);

            if (kind === "version") {
              return (
                <p
                  key={`${line}-${index}`}
                  className="mt-10 border-t border-primary-foreground/10 pt-6 text-sm leading-6 text-warm-gray"
                >
                  {line}
                </p>
              );
            }

            if (kind === "section") {
              return (
                <h2
                  key={`${line}-${index}`}
                  className="mt-12 font-serif text-2xl font-semibold leading-tight text-optical-white first:mt-0 md:text-3xl"
                >
                  {line}
                </h2>
              );
            }

            if (kind === "subsection") {
              return (
                <h3
                  key={`${line}-${index}`}
                  className="mt-8 text-lg font-semibold leading-7 text-optical-white"
                >
                  {line}
                </h3>
              );
            }

            return (
              <p
                key={`${line}-${index}`}
                className="mt-4 text-base leading-7 text-optical-white/80"
              >
                {line}
              </p>
            );
          })}
        </article>
      </section>
    </main>
  );
}
