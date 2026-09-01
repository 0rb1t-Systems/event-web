import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/components/motion/Reveal";
import { getApiErrorMessage } from "@/lib/apiError";
import { DEFAULT_ORGANIZER_HOME } from "@/lib/authRedirect";
import { ContinueWithGoogleButton } from "@/components/auth/ContinueWithGoogleButton";

export default function OrganizerRegister() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, register, loginWithGoogle } = useOrganizer();
  const [loading, setLoading] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    navigate(DEFAULT_ORGANIZER_HOME, { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== passwordConfirmation) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register({
        business_name: businessName.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        password,
        password_confirmation: passwordConfirmation,
      });
      toast.success("Organizer account created!");
      navigate(DEFAULT_ORGANIZER_HOME, { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not create your organizer account."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Signed in with Google.");
      navigate(DEFAULT_ORGANIZER_HOME, { replace: true });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Google sign-in failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center px-4 py-6 sm:py-8 overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
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
          <p className="text-muted-foreground mt-1 text-sm">Create your organizer account</p>
        </motion.div>

        <motion.div variants={staggerItem} className="bg-card rounded-xl border border-border p-4 sm:p-5">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="business-name">Business name</Label>
                <Input
                  id="business-name"
                  placeholder="Your organization"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact-name">Contact name</Label>
                <Input
                  id="contact-name"
                  placeholder="Contact name"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-reg-email">Email</Label>
                <Input
                  id="org-reg-email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-phone">Phone <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="org-phone"
                  type="tel"
                  placeholder="+252…"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-reg-password">Password</Label>
                <Input
                  id="org-reg-password"
                  type="password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="org-reg-password-confirm">Confirm password</Label>
                <Input
                  id="org-reg-password-confirm"
                  type="password"
                  minLength={8}
                  required
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating account…" : "Create organizer account"}
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
              <p className="text-center text-[11px] text-muted-foreground mt-3 leading-relaxed">
                Google creates your organizer account using your Google name. You can edit business details later in Settings.
              </p>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/organizer/login" className="text-foreground font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
