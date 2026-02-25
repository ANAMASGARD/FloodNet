import { SignUp } from "@clerk/nextjs";
import { ShieldAlert } from "lucide-react";

export default function Page() {
  return (
    <section className="relative min-h-screen w-full overflow-hidden">
      {/* Full Screen Background Image via CSS */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2000&auto=format&fit=crop')",
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
                  <ShieldAlert className="h-7 w-7 text-emerald-600" />
                </div>
                <span className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">
                  FloodNet
                </span>
              </div>
            </a>

            <div className="space-y-4">
              <h2 className="text-5xl font-bold text-white leading-tight drop-shadow-lg">
                Join the FloodNet network.
              </h2>

              <p className="text-xl leading-relaxed text-white/95 drop-shadow-md">
                Create an account to coordinate flood alerts, safe zones, and
                AI-assisted response workflows with your team.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Sign Up Form Overlay */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Mobile Header */}
            <div className="mb-6 lg:hidden text-center">
              <a
                className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-white/95 backdrop-blur-sm shadow-lg mb-4 hover:shadow-xl transition-all"
                href="/"
              >
                <ShieldAlert className="h-7 w-7 text-emerald-600" />
              </a>

              <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                Create your FloodNet account
              </h1>

              <p className="mt-2 text-white/90 drop-shadow-md">
                For emergency teams, coordinators, and agencies
              </p>
            </div>

            {/* Sign Up Component with glass effect */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 lg:p-8 border-0">
              <SignUp
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none bg-transparent w-full border-0",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    socialButtonsBlockButton:
                      "bg-white hover:bg-gray-50 border-0 shadow-sm",
                    formButtonPrimary:
                      "bg-emerald-600 hover:bg-emerald-700 text-sm normal-case shadow-md border-0",
                    footerAction: "hidden",
                    formFieldInput:
                      "border border-gray-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-200 rounded-lg",
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

