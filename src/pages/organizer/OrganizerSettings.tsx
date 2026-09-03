import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { IconMonitor, IconMoon, IconSun } from "@/components/organizer-console/orgIcons";
import { useTheme } from "next-themes";
import { OrgButton } from "@/components/organizer-console/OrgButton";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { getApiErrorMessage } from "@/lib/apiError";
import { cn } from "@/lib/utils";

const fieldLabel = "block text-xs font-semibold text-oc-ink mb-1.5";
const inputBox =
  "flex items-center gap-2 rounded-[12px] bg-oc-well px-3.5 py-3 transition-shadow focus-within:ring-2 focus-within:ring-oc-brand/40";
const inputEl = "w-full bg-transparent text-sm text-oc-ink placeholder:text-oc-faint outline-none";

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

export default function OrganizerSettings() {
  const { theme, setTheme } = useTheme();
  const { organizer, updateProfile, changePassword } = useOrganizer();
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");

  useEffect(() => {
    if (!organizer) return;
    setBusinessName(organizer.business_name || "");
    setContactName(organizer.contact_name || "");
    setEmail(organizer.email || "");
    setPhone(organizer.phone || "");
  }, [organizer]);

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        business_name: businessName.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
      });
      toast.success("Profile updated!");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async () => {
    if (newPassword !== newPasswordConfirmation) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: newPasswordConfirmation,
      });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      toast.success("Password changed.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not change your password."));
    } finally {
      setSavingPassword(false);
    }
  };

  if (!organizer) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-oc-brand" /></div>;
  }

  return (
    <div className="flex flex-col gap-4 max-w-3xl" data-testid="page-account">
      <div className="px-2 pt-1 lg:pt-0">
        <h1 className="font-head text-[22px] lg:text-2xl font-semibold text-oc-ink tracking-tight">Account</h1>
      </div>

      {/* Organizer profile */}
      <div className="org-card p-5 flex flex-col gap-4">
        <h2 className="font-head text-[17px] font-semibold text-oc-ink">Organizer profile</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="acct-business" label="Business name">
            <div className={inputBox}>
              <input id="acct-business" className={inputEl} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
          </Field>
          <Field id="acct-contact" label="Contact name">
            <div className={inputBox}>
              <input id="acct-contact" className={inputEl} value={contactName} onChange={(e) => setContactName(e.target.value)} />
            </div>
          </Field>
        </div>
        <Field id="acct-email" label="Email">
          <div className={inputBox}>
            <input id="acct-email" type="email" className={inputEl} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
        </Field>
        <div>
          <label htmlFor="acct-phone" className={fieldLabel}>Payout phone</label>
          <p className="text-xs text-oc-faint mb-1.5">
            Approved payouts are sent to this WaafiPay (EVC Plus) number.
          </p>
          <div className={inputBox}>
            <input id="acct-phone" className={cn(inputEl, "font-data")} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+252…" />
          </div>
        </div>
        <div>
          <OrgButton onClick={handleSave} disabled={savingProfile} data-testid="account-save">
            {savingProfile ? <Loader2 className="animate-spin" /> : null}
            {savingProfile ? "Saving…" : "Save changes"}
          </OrgButton>
        </div>
      </div>

      {/* Appearance */}
      <div className="org-card p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-head text-[17px] font-semibold text-oc-ink">Appearance</h2>
        </div>
        <div className="flex gap-1 rounded-full bg-oc-well p-1 w-fit">
          {([
            { value: "light", label: "Light", icon: IconSun },
            { value: "dark", label: "Dark", icon: IconMoon },
            { value: "system", label: "System", icon: IconMonitor },
          ] as const).map((opt) => {
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                aria-pressed={active}
                onClick={() => { setTheme(opt.value); toast.success(`Theme set to ${opt.label}`); }}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                  active
                    ? "bg-oc-surface text-oc-ink font-semibold ring-1 ring-oc-line"
                    : "text-oc-muted font-medium hover:text-oc-ink",
                )}
              >
                <opt.icon className={cn("w-[15px] h-[15px]", active ? "text-oc-brand" : "text-oc-muted")} />
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-oc-faint">
          Brand color <span className="font-data font-semibold text-oc-muted">#0F6E56</span> · set by platform
        </p>
      </div>

      {/* Password */}
      <div className="org-card p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-head text-[17px] font-semibold text-oc-ink">Password</h2>
          <p className="text-sm text-oc-muted mt-0.5">Use a password at least 8 characters long.</p>
        </div>
        <Field id="acct-pass-current" label="Current password">
          <div className={inputBox}>
            <input id="acct-pass-current" type="password" className={inputEl} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
        </Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="acct-pass-new" label="New password">
            <div className={inputBox}>
              <input id="acct-pass-new" type="password" minLength={8} className={inputEl} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </Field>
          <Field id="acct-pass-confirm" label="Confirm new password">
            <div className={inputBox}>
              <input id="acct-pass-confirm" type="password" minLength={8} className={inputEl} value={newPasswordConfirmation} onChange={(e) => setNewPasswordConfirmation(e.target.value)} />
            </div>
          </Field>
        </div>
        <div>
          <OrgButton
            variant="dark"
            onClick={handlePassword}
            disabled={savingPassword || !currentPassword || !newPassword}
          >
            {savingPassword ? <Loader2 className="animate-spin" /> : null}
            {savingPassword ? "Updating…" : "Update password"}
          </OrgButton>
        </div>
      </div>
    </div>
  );
}
