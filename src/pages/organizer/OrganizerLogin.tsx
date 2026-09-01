import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/components/motion/Reveal";
import { getApiErrorMessage, isOrganizerSuspendedError } from "@/lib/apiError";
import { getSafeOrganizerInternalPath } from "@/lib/authRedirect";
import { ContinueWithGoogleButton } from "@/components/auth/ContinueWithGoogleButton";

export default function OrganizerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeOrganizerInternalPath(searchParams.get("redirect"));
  const { isAuthenticated, isLoading, login, loginWithGoogle } = useOrganizer();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [suspendedMessage, setSuspendedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast.error("Your organizer session expired. Please sign in again.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    navigate(redirectTo, { replace: true });
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuspendedMessage(null);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (isOrganizerSuspendedError(error)) {
        const msg = getApiErrorMessage(
          error,
          "This organizer account is suspended. Contact support or wait for reactivation.",
        );
        setSuspendedMessage(msg);
        toast.error(msg, { duration: 8000 });
      } else {
        toast.error(getApiErrorMessage(error, "Invalid email or password."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setSuspendedMessage(null);
    try {
      await loginWithGoogle();
      toast.success("Signed in with Google.");
      navigate(redirectTo, { replace: true });
    } catch (error) {
      if (isOrganizerSuspendedError(error)) {
        const msg = getApiErrorMessage(
          error,
          "This organizer account is suspended. Contact support or wait for reactivation.",
        );
        setSuspendedMessage(msg);
        toast.error(msg, { duration: 8000 });
      } else {
        toast.error(getApiErrorMessage(error, "Google sign-in failed."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center px-4 py-6 sm:py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm relative z-10"
      >
        <motion.div variants={staggerItem} className="text-center mb-5">
          <Link to="/" className="inline-block">
            <Logo size="sm" />
          </Link>
          <p className="mt-2 text-xs font-medium text-primary">Organizer</p>
          <p className="text-muted-foreground mt-1 text-sm">Sign in to manage your events</p>
        </motion.div>

        <motion.div variants={staggerItem} className="bg-card rounded-xl border border-border p-4 sm:p-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {suspendedMessage && (
                <div className="rounded-2xl border border-destructive/20 bg-destructive/8 p-4 text-sm text-destructive leading-relaxed">
                  {suspendedMessage}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="org-email">Email</Label>
                <Input
                  id="org-email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-password">Password</Label>
                <Input
                  id="org-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          )}

          {!isLoading && (
            <>
              <div className="mt-5 relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">Or</span>
                </div>
              </div>
              <ContinueWithGoogleButton onClick={handleGoogle} disabled={loading} />
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            New organizer?{" "}
            <Link to="/organizer/register" className="text-foreground font-medium hover:underline">
              Create an account
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-3">
            Attending an event?{" "}
            <Link to="/auth" className="hover:underline">Participant sign in</Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
