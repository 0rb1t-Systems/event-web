import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/components/motion/Reveal";
import { getApiErrorMessage, isUnverifiedAccountError } from "@/lib/apiError";
import { getSafeInternalPath } from "@/lib/authRedirect";
import { VerifyEmailPanel } from "@/components/auth/VerifyEmailPanel";
import { ForgotPasswordPanel } from "@/components/auth/ForgotPasswordPanel";
import { PublicSiteHeader } from "@/components/layout/PublicSiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

type AuthPanel = "tabs" | "verify" | "forgot";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = getSafeInternalPath(searchParams.get("redirect"));
  const {
    user,
    isLoading: authLoading,
    login,
    loginWithGoogle,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState<AuthPanel>("tabs");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast.error("Your session expired. Please sign in again.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (authLoading || !user) return;
    navigate(redirectTo, { replace: true });
  }, [user, authLoading, navigate, redirectTo]);

  const finishAuthenticated = async (email: string, password: string) => {
    await login(email, password);
    toast.success("Welcome back!");
    navigate(redirectTo, { replace: true });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await finishAuthenticated(loginEmail, loginPassword);
    } catch (error) {
      if (isUnverifiedAccountError(error)) {
        setPendingEmail(loginEmail);
        setPendingPassword(loginPassword);
        setPanel("verify");
        toast.error("Please verify your email before signing in.");
      } else {
        toast.error(getApiErrorMessage(error, "Invalid email or password."));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupPassword !== signupPasswordConfirm) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(signupName, signupEmail, signupPassword, signupPasswordConfirm);
      setPendingEmail(signupEmail);
      setPendingPassword(signupPassword);
      setPanel("verify");
      toast.success("Account created! Check your email for a verification code.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not create your account."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Signed in with Google.");
      navigate(redirectTo || "/dashboard/home");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Google sign-in failed."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="house-page min-h-[100dvh] flex flex-col" data-testid="page-auth">
    <PublicSiteHeader />
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-8">

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm relative z-10"
      >
        <motion.h1 variants={staggerItem} className="mb-4 text-center font-display text-base font-semibold tracking-tight">
          Log in or sign up
        </motion.h1>

        <motion.div variants={staggerItem} className="house-card bg-card rounded-2xl border border-border p-4 sm:p-5">
          {authLoading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : panel === "verify" ? (
            <VerifyEmailPanel
              email={pendingEmail}
              loading={loading}
              onVerify={async (code) => {
                setLoading(true);
                try {
                  await verifyEmail(pendingEmail, code);
                  toast.success("Email verified.");
                  if (pendingPassword) {
                    await finishAuthenticated(pendingEmail, pendingPassword);
                  } else {
                    setPanel("tabs");
                    setLoginEmail(pendingEmail);
                    toast.success("You can sign in now.");
                  }
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "That verification code is invalid or expired."));
                } finally {
                  setLoading(false);
                }
              }}
              onResend={async () => {
                try {
                  await resendVerification(pendingEmail);
                  toast.success("A new verification code is on its way.");
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "Could not resend the verification code."));
                }
              }}
              onBack={() => setPanel("tabs")}
            />
          ) : panel === "forgot" ? (
            <ForgotPasswordPanel
              initialEmail={loginEmail}
              loading={loading}
              onSendCode={async (email) => {
                setLoading(true);
                try {
                  await forgotPassword(email);
                  setPendingEmail(email);
                  toast.success("Check your email for a reset code.");
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "Could not send a reset code."));
                  throw error;
                } finally {
                  setLoading(false);
                }
              }}
              onReset={async ({ email, resetCode, password, passwordConfirmation }) => {
                if (password !== passwordConfirmation) {
                  toast.error("Passwords do not match.");
                  return;
                }
                setLoading(true);
                try {
                  await resetPassword(email, resetCode, password, passwordConfirmation);
                  toast.success("Password updated. Sign in with your new password.");
                  setLoginEmail(email);
                  setLoginPassword("");
                  setPanel("tabs");
                } catch (error) {
                  toast.error(getApiErrorMessage(error, "That reset code is invalid."));
                } finally {
                  setLoading(false);
                }
              }}
              onBack={() => setPanel("tabs")}
            />
          ) : (
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">
                Log in
              </TabsTrigger>
              <TabsTrigger value="signup">
                Sign up
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-4" data-testid="login-form">
                <div className="space-y-1.5">
                  <Label htmlFor="email-login" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    data-testid="login-email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-login" className="text-sm font-medium text-foreground">Password</Label>
                  <Input
                    id="password-login"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    data-testid="login-password"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={loading} data-testid="login-submit">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <button
                  type="button"
                  className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setPanel("forgot")}
                >
                  Forgot password?
                </button>
              </form>

              <div className="mt-5 relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">Or</span></div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-5 rounded-full"
                onClick={handleGoogle}
                disabled={loading}
                type="button"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSignup} className="space-y-4" data-testid="signup-form">
                <div className="space-y-1.5">
                  <Label htmlFor="name-signup" className="text-sm font-medium text-foreground">Full name</Label>
                  <Input
                    id="name-signup"
                    placeholder="Your name"
                    required
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    data-testid="signup-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email-signup" className="text-sm font-medium text-foreground">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="you@company.com"
                    required
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    data-testid="signup-email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-signup" className="text-sm font-medium text-foreground">Password</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    data-testid="signup-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password-signup-confirm" className="text-sm font-medium text-foreground">Confirm password</Label>
                  <Input
                    id="password-signup-confirm"
                    type="password"
                    placeholder="••••••••"
                    required
                    minLength={8}
                    value={signupPasswordConfirm}
                    onChange={e => setSignupPasswordConfirm(e.target.value)}
                    data-testid="signup-password-confirm"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={loading} data-testid="signup-submit">
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>

              <div className="mt-5 relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">Or</span></div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-5 rounded-full"
                onClick={handleGoogle}
                disabled={loading}
                type="button"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </TabsContent>
          </Tabs>
          )}
        </motion.div>

        <motion.p variants={staggerItem} className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </motion.p>
        <motion.p variants={staggerItem} className="text-center text-xs text-muted-foreground mt-2">
          Hosting events?{" "}
          <Link to="/organizer/login" className="hover:underline">Organizer</Link>
        </motion.p>
      </motion.div>
    </div>
    <SiteFooter />
    </div>
  );
};

export default Auth;
