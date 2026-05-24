type PlaceholderPageProps = {
  title: string;
  subtitle: string;
  body?: string;
};

export function PlaceholderPage({ title, subtitle, body }: PlaceholderPageProps) {
  return (
    <main className="min-h-screen bg-charcoal flex items-center justify-center px-6 py-24">
      <div className="max-w-xl text-center">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-optical-white mb-6">
          {title}
        </h1>
        <p className="text-lg md:text-xl text-optical-white/90 font-serif italic mb-3">
          {subtitle}
        </p>
        {body && (
          <p className="text-warm-gray text-sm">{body}</p>
        )}
      </div>
    </main>
  );
}
