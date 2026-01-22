const Footer = () => {
  return (
    <footer className="py-12 pl-[calc(1.25rem+env(safe-area-inset-left))] pr-[calc(1.25rem+env(safe-area-inset-right))] md:px-8 bg-charcoal text-primary-foreground/70">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center">
              <img
                src="/images/butler-inc-trans-logo.webp"
                alt="Butler Inc."
                className="h-9 w-auto brightness-150"
              />
            </a>
            <p className="text-sm mt-4 leading-relaxed">
              Your personal butler, on demand – across England.
            </p>
          </div>

          <div>
            <h4 className="font-medium text-primary-foreground mb-4">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Busy Butler</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Baby Butler</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Bougie Butler</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Base Butler</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Budget Butler</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-primary-foreground mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">About</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Trust & Safety</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Memberships</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium text-primary-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Cookie Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">© 2025 Butler Inc. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-sm">Cambridge & London</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;