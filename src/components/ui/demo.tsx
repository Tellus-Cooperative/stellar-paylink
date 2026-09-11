// This is a file with a demo for your component.
// That's what users will see in the preview.
// Create new files in this directory to add more demos.

import SiteFooter from "@/components/site-footer";

// ONLY DEFAULT EXPORT WILL BE TREATED AS A DEMO
export default function DemoOne() {
  return (
    <div className="flex min-h-full flex-col">
      {/* The reveal needs at least a band-height of scroll above the footer,
          otherwise the glow starts out already half-risen. */}
      <div className="flex h-[55vh] shrink-0 items-center justify-center px-6 text-center text-sm text-muted-foreground">
        Bajá hasta el footer ↓
      </div>

      <SiteFooter />
    </div>
  );
}