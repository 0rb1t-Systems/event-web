import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type ForgotPasswordPanelProps = {
  initialEmail: string;
  loading: boolean;
  onSendCode: (email: string) => Promise<void>;
  onReset: (payload: {
    email: string;
    resetCode: string;
    password: string;
    passwordConfirmation: string;
  }) => Promise<void>;
  onBack: () => void;
};

export function ForgotPasswordPanel({
  initialEmail,
  loading,
  onSendCode,
  onReset,
  onBack,
}: ForgotPasswordPanelProps) {
  const [step, setStep] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  if (step === "reset") {
    return (
      <form
        className="space-y-4"
        data-testid="reset-password-form"
        onSubmit={async (e) => {
          e.preventDefault();
          await onReset({
            email,
            resetCode: code,
            password,
            passwordConfirmation,
          });
        }}
      >
        <div className="space-y-1.5 text-center">
          <h2 className="text-base font-display font-semibold">Reset password</h2>
          <p className="text-sm text-muted-foreground">
            Enter the 4-digit code sent to <span className="text-foreground font-medium">{email}</span>
          </p>
        </div>
        <div className="flex justify-center">
          <InputOTP maxLength={4} value={code} onChange={setCode} disabled={loading}>
            <InputOTPGroup>
              <InputOTPSlot index={0} className="h-10 w-10 rounded-xl first:rounded-l-xl" />
              <InputOTPSlot index={1} className="h-10 w-10" />
              <InputOTPSlot index={2} className="h-10 w-10" />
              <InputOTPSlot index={3} className="h-10 w-10 last:rounded-r-xl" />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password" className="text-sm font-medium text-foreground">New password</Label>
          <Input
            id="reset-password"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password-confirm" className="text-sm font-medium text-foreground">Confirm password</Label>
          <Input
            id="reset-password-confirm"
            type="password"
            placeholder="••••••••"
            required
            minLength={8}
            value={passwordConfirmation}
            onChange={(e) => setPasswordConfirmation(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full rounded-full"
          disabled={loading || code.length !== 4}
        >
          {loading ? "Saving…" : "Update password"}
        </Button>
        <button
          type="button"
          className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={onBack}
        >
          Back to log in
        </button>
      </form>
    );
  }

  return (
    <form
      className="space-y-4"
      data-testid="forgot-password-form"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSendCode(email);
          setStep("reset");
        } catch {
          // Parent already showed a human-readable error.
        }
      }}
    >
      <div className="space-y-1.5 text-center">
        <h2 className="text-base font-display font-semibold">Forgot password</h2>
        <p className="text-sm text-muted-foreground">
          We'll email you a 4-digit code to reset your password.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="forgot-email" className="text-sm font-medium text-foreground">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          placeholder="you@company.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        className="w-full rounded-full"
        disabled={loading}
      >
        {loading ? "Sending…" : "Send reset code"}
      </Button>
      <button
        type="button"
        className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={onBack}
      >
        Back to log in
      </button>
    </form>
  );
}
