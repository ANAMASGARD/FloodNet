import { SignIn } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

export default function Page() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Full Screen Background Image via CSS */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=2000&auto=format&fit=crop')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Dark overlay for better readability */}
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 flex min-h-screen">
        {/* Left Side - Welcome Text */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-lg space-y-8">
            <a className="inline-block" href="/">
              <div className="flex items-center gap-3">
                <div className="bg-white/95 backdrop-blur-sm p-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <ShieldAlert className="h-7 w-7 text-sky-600" />
                </div>
                <span className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">
                  FloodNet
                </span>
              </div>
            </a>

            <div className="space-y-4">
              <h2 className="text-5xl font-bold text-white leading-tight drop-shadow-lg">
                Coordinate faster. Save lives.
              </h2>

              <p className="text-xl leading-relaxed text-white/95 drop-shadow-md">
                Sign in to access FloodNet’s AI-powered flood and disaster
                response command center.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Sign In Form Overlay */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="mb-6 lg:hidden text-center">
              <a
                className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg mb-4 hover:shadow-xl transition-all"
                href="/"
              >
                <ShieldAlert className="h-7 w-7 text-sky-600" />
              </a>

              <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                FloodNet Command Center
              </h1>

              <p className="mt-2 text-white/90 drop-shadow-md">
                Secure access for responders and coordinators
              </p>
            </div>

            {/* Sign In Component with glass effect */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 lg:p-8 border-0">
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none bg-transparent w-full border-0",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton:
                      "bg-white hover:bg-gray-50 border-0 shadow-sm",
                    formButtonPrimary:
                      "bg-sky-700 hover:bg-sky-800 text-sm normal-case shadow-md border-0",
                    footerAction: "hidden",
                    formFieldInput:
                      "border border-gray-300 focus:border-sky-600 focus:ring-2 focus:ring-sky-200 rounded-lg",
                    identityPreviewEditButton: "border-0",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

