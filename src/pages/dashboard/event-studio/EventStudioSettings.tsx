import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useEventStudio } from "@/contexts/EventStudioContext";

export default function EventStudioSettings() {
  const { event, handleUpdate, setDeleteOpen } = useEventStudio();

  return (
    <div className="bg-card rounded-xl p-5 sm:p-6 space-y-4">
      <h3 className="font-display font-semibold">Event settings</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Capacity</Label>
          <Input
            type="number"
            min={0}
            placeholder="Unlimited"
            defaultValue={event.capacity ?? ""}
            onBlur={(e) => handleUpdate({ capacity: e.target.value ? parseInt(e.target.value, 10) : null })}
            className="rounded-full"
          />
        </div>
        <div className="space-y-2">
          <Label>Registration deadline</Label>
          <Input
            type="datetime-local"
            defaultValue={event.registration_deadline ? new Date(event.registration_deadline).toISOString().slice(0, 16) : ""}
            onBlur={(e) => handleUpdate({ registration_deadline: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className="rounded-full"
          />
        </div>
      </div>
      <Button variant="destructive" size="sm" className="mt-4 rounded-full" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="w-4 h-4 mr-2" /> Delete event
      </Button>
    </div>
  );
}
