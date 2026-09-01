import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getApiErrorMessage } from "@/lib/apiError";
import { getMediaUrl } from "@/lib/mediaUrl";

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const { user, updateProfile, updateProfilePicture, changePassword } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setAddress(user.address || "");
  }, [user]);

  const handleSave = async () => {
    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      toast.success("Profile updated!");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update profile"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploadingPhoto(true);
    try {
      await updateProfilePicture(file);
      toast.success("Photo updated!");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not update your photo."));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePassword = async () => {
    if (newPassword !== newPasswordConfirmation) {
      toast.error("New passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword, newPasswordConfirmation);
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

  if (!user) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <p className="text-sm text-muted-foreground">Home / Settings</p>
        <h1 className="mt-1.5 text-2xl font-display font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-6">
          <div className="house-card bg-card rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile photo"
              >
                <Avatar className="h-16 w-16">
                  <AvatarImage src={getMediaUrl(user.profile_image)} alt={user.name} />
                  <AvatarFallback className="bg-foreground text-background text-lg font-semibold uppercase">
                    {(user.name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
              <div>
                <p className="text-sm font-medium">Profile photo</p>
                <p className="text-xs text-muted-foreground">JPG or PNG, up to 2 MB.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  disabled={uploadingPhoto}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploadingPhoto ? "Uploading…" : "Change photo"}
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void handlePhoto(file);
                }}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+252…" />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="City, country" />
            </div>

            <Button className="rounded-full" onClick={handleSave} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save changes"}
            </Button>
          </div>

          <div className="house-card bg-card rounded-2xl border border-border p-6 space-y-5">
            <div>
              <h3 className="font-display font-semibold text-lg mb-1">Password</h3>
              <p className="text-sm text-muted-foreground">Use a password at least 8 characters long.</p>
            </div>
            <div className="space-y-2">
              <Label>Current password</Label>
              <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Confirm new password</Label>
                <Input type="password" minLength={8} value={newPasswordConfirmation} onChange={e => setNewPasswordConfirmation(e.target.value)} />
              </div>
            </div>
            <Button className="rounded-full" onClick={handlePassword} disabled={savingPassword || !currentPassword || !newPassword}>
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="appearance" className="mt-6">
          <div className="house-card bg-card rounded-2xl border border-border p-6 space-y-6">
            <div>
              <h3 className="font-display font-semibold text-lg mb-1">Theme</h3>
              <p className="text-sm text-muted-foreground">Applies to Home, Browse, tickets, and the organizer console. Public event pages stay on their cover design.</p>
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
};

export default SettingsPage;
