import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { useOrganizer } from "@/contexts/OrganizerContext";
import { getApiErrorMessage } from "@/lib/apiError";

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
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground">Organizer profile and password.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-muted rounded-full p-1">
          <TabsTrigger value="profile" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Profile</TabsTrigger>
          <TabsTrigger value="appearance" className="rounded-full data-[state=active]:bg-card data-[state=active]:shadow-sm">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="bg-card rounded-xl p-6 space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Business name</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="rounded-full" />
              </div>
              <div className="space-y-2">
                <Label>Contact name</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="rounded-full" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-full" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+252…" className="rounded-full" />
            </div>
            <Button onClick={handleSave} disabled={savingProfile} className="rounded-full">
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </div>

          <div className="bg-card rounded-xl p-6 space-y-5">
            <div>
              <h3 className="font-display font-semibold text-lg mb-1">Password</h3>
              <p className="text-sm text-muted-foreground">Use a password at least 8 characters long.</p>
            </div>
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="rounded-full" />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-full" />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input type="password" minLength={8} value={newPasswordConfirmation} onChange={(e) => setNewPasswordConfirmation(e.target.value)} className="rounded-full" />
              </div>
            </div>
            <Button onClick={handlePassword} disabled={savingPassword || !currentPassword || !newPassword} className="rounded-full">
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <div className="bg-card rounded-xl p-6 space-y-6">
            <div>
              <h3 className="font-display font-semibold text-lg mb-1">Theme</h3>
              <p className="text-sm text-muted-foreground">Choose how the application looks for you.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([
                { value: "light", label: "Light", icon: Sun, desc: "Clean and bright interface" },
                { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
                { value: "system", label: "System", icon: Monitor, desc: "Match your device settings" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setTheme(opt.value); toast.success(`Theme set to ${opt.label}`); }}
                  className={`relative flex flex-col items-center gap-3 rounded-xl p-6 transition-all cursor-pointer ${
                    theme === opt.value
                      ? "bg-muted ring-2 ring-foreground shadow-sm"
                      : "bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    theme === opt.value ? "bg-foreground text-background" : "bg-background text-muted-foreground"
                  }`}>
                    <opt.icon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
