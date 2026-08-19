import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type VerifyEmailPanelProps = {
  email: string;
  loading: boolean;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
};

export function VerifyEmailPanel({
  email,
  loading,
  onVerify,
  onResend,
  onBack,
}: VerifyEmailPanelProps) {
  const [code, setCode] = useState("");
  const [resending, setResending] = useState(false);

  return (
    <form
      className="space-y-4"
      data-testid="verify-email-form"
      onSubmit={async (e) => {
        e.preventDefault();
        await onVerify(code);
      }}
    >
      <div className="space-y-1.5 text-center">
        <h2 className="text-lg font-display font-semibold">Check your email</h2>
        <p className="text-sm text-muted-foreground">
          Enter the 4-digit code we sent to <span className="text-foreground font-medium">{email}</span>
        </p>
      </div>
      <div className="flex justify-center">
        <InputOTP
          maxLength={4}
          value={code}
          onChange={setCode}
          disabled={loading}
          data-testid="verify-code"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} className="h-11 w-11 rounded-xl first:rounded-l-xl" />
            <InputOTPSlot index={1} className="h-11 w-11" />
            <InputOTPSlot index={2} className="h-11 w-11" />
            <InputOTPSlot index={3} className="h-11 w-11 last:rounded-r-xl" />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <Button
        type="submit"
        className="w-full rounded-full h-11 bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] transition-transform font-medium"
        disabled={loading || code.length !== 4}
        data-testid="verify-submit"
      >
        {loading ? "Verifying…" : "Verify email"}
      </Button>
      <button
        type="button"
        className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        disabled={loading || resending}
        onClick={async () => {
          setResending(true);
          try {
            await onResend();
          } finally {
            setResending(false);
          }
        }}
      >
        {resending ? "Sending a new code…" : "Resend code"}
      </button>
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
