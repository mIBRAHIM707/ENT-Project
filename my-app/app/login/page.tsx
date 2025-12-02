import { GikiLoginForm } from "@/components/auth/giki-login-form";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      {/* Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white dark:bg-black">
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_60%,transparent_100%)]"></div>
      </div>

      {/* Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 blur-[150px] rounded-full -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-teal-500/15 blur-[120px] rounded-full -z-10" />
      <div className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full -z-10" />

      {/* Login Form */}
      <GikiLoginForm />

      {/* Footer */}
      <div className="absolute bottom-6 text-center w-full">
        <p className="text-sm text-zinc-400 dark:text-zinc-600">
          CrowdServe • Made for GIKI Students
        </p>
      </div>
    </div>
  );
}
