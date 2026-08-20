import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/components/motion/Reveal";
import { getApiErrorMessage, isUnverifiedAccountError } from "@/lib/apiError";
import { getSafeInternalPath } from "@/lib/authRedirect";
import { VerifyEmailPanel } from "@/components/auth/VerifyEmailPanel";
import { ForgotPasswordPanel } from "@/components/auth/ForgotPasswordPanel";

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10 sm:py-12 relative overflow-hidden" data-testid="page-auth">
      {/* Floating decorative shapes — animated parallax */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { c: "top-[10%] left-[8%] w-16 h-16 rounded-full bg-primary/10 blur-sm", d: 0, m: 14 },
          { c: "top-[20%] right-[12%] w-12 h-12 rounded-lg bg-primary/10 rotate-12 blur-sm", d: 0.4, m: -10 },
          { c: "bottom-[15%] left-[15%] w-10 h-10 rounded-full bg-primary/10 blur-sm", d: 0.8, m: 12 },
          { c: "bottom-[25%] right-[8%] w-14 h-14 rounded-lg bg-primary/10 -rotate-12 blur-sm", d: 0.2, m: -16 },
          { c: "top-[50%] left-[5%] w-8 h-8 rounded-full bg-muted-foreground/10 blur-sm", d: 0.6, m: 8 },
          { c: "top-[40%] right-[5%] w-20 h-20 rounded-full bg-primary/5 blur-md", d: 1, m: -20 },
        ].map((s, i) => (
          <motion.div
            key={i}
            className={`absolute ${s.c}`}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: [0, s.m, 0],
              x: [0, s.m / 2, 0],
            }}
            transition={{
              opacity: { duration: 0.8, delay: s.d * 0.4 },
              scale: { duration: 0.8, delay: s.d * 0.4, ease: [0.22, 1, 0.36, 1] },
              y: { duration: 7 + i, repeat: Infinity, ease: "easeInOut", delay: s.d },
              x: { duration: 9 + i, repeat: Infinity, ease: "easeInOut", delay: s.d },
            }}
          />
        ))}
      </div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <motion.div variants={staggerItem} className="text-center mb-8">
          <Link to="/" className="inline-block transition-transform duration-300 hover:scale-[1.03]">
            <Logo size="lg" />
          </Link>
          <p className="text-muted-foreground mt-2 text-sm font-body">
            Create events people actually want to attend
          </p>
        </motion.div>

        {/* Auth card */}
        <motion.div variants={staggerItem} className="bg-card rounded-2xl border border-border shadow-lg p-6 sm:p-7">
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
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted p-1 mb-6">
              <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm font-medium">
                Log in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm font-medium">
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
                    className="rounded-full h-11 px-4 border-input"
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
                    className="rounded-full h-11 px-4 border-input"
                    data-testid="login-password"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full h-11 bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] transition-transform font-medium" disabled={loading} data-testid="login-submit">
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
                className="w-full mt-5 rounded-full h-11 border-input hover:bg-muted font-medium"
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
                    placeholder="Jane Doe"
                    required
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    className="rounded-full h-11 px-4 border-input"
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
                    className="rounded-full h-11 px-4 border-input"
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
                    className="rounded-full h-11 px-4 border-input"
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
                    className="rounded-full h-11 px-4 border-input"
                    data-testid="signup-password-confirm"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full h-11 bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] transition-transform font-medium" disabled={loading} data-testid="signup-submit">
                  {loading ? "Creating account…" : "Create account"}
                </Button>
              </form>

              <div className="mt-5 relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground">Or</span></div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-5 rounded-full h-11 border-input hover:bg-muted font-medium"
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

        <motion.p variants={staggerItem} className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </motion.p>
        <motion.p variants={staggerItem} className="text-center text-xs text-muted-foreground mt-3">
          Hosting events?{" "}
          <Link to="/organizer/login" className="hover:underline">Organizer Portal</Link>
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Auth;
