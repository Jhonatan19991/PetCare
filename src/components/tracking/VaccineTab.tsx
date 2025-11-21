import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/LanguageProvider";

interface Vaccine {
  id: string;
  pet_id: string;
  vaccine_type: string;
  date: string;
  notes: string | null;
  create_reminder: boolean;
  reminder_frequency_years: number | null;
  created_at: string;
}

interface VaccineTabProps {
  selectedPetId: string;
}

export default function VaccineTab({ selectedPetId }: VaccineTabProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [vaccineType, setVaccineType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState<string>("1");
  const [submitting, setSubmitting] = useState(false);
  
  // Edit states
  const [editingVaccine, setEditingVaccine] = useState<Vaccine | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (selectedPetId) {
      fetchVaccines(selectedPetId);
    } else {
      setVaccines([]);
    }
  }, [selectedPetId]);

  const fetchVaccines = async (petId: string) => {
    try {
      const { data, error } = await supabase
        .from("vaccinations")
        .select("*")
        .eq("pet_id", petId)
        .order("date", { ascending: false });

      if (error) throw error;
      setVaccines(data || []);
    } catch (error) {
      console.error("Error fetching vaccines:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToLoadHistory,
        variant: "destructive",
      });
    }
  };

  // Helper function to parse date string and avoid timezone issues
  const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Helper function to format date as YYYY-MM-DD without timezone issues
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const createReminders = async (
    petId: string,
    userId: string,
    vaccineType: string,
    vaccineDate: string,
    frequencyYears: number
  ) => {
    const vaccineDateObj = parseDateString(vaccineDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate next reminder date
    let nextReminderDate = new Date(vaccineDateObj);
    nextReminderDate.setFullYear(nextReminderDate.getFullYear() + frequencyYears);
    
    // If vaccine is in the past, only create the next reminder
    // If vaccine is today or in the future, create reminders starting from that date
    if (vaccineDateObj < today) {
      // Vaccine already applied, create only next reminder
      while (nextReminderDate < today) {
        nextReminderDate.setFullYear(nextReminderDate.getFullYear() + frequencyYears);
      }
    }
    
    // Create reminders up to 10 years from today
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    
    const remindersToCreate = [];
    let currentReminderDate = new Date(nextReminderDate);
    
    while (currentReminderDate <= maxDate) {
      remindersToCreate.push({
        user_id: userId,
        pet_id: petId,
        title: `Vacuna: ${vaccineType}`,
        description: `Recordatorio para aplicar la vacuna ${vaccineType}`,
        reminder_date: formatDateString(currentReminderDate),
        type: 'vaccination',
      });
      
      currentReminderDate = new Date(currentReminderDate);
      currentReminderDate.setFullYear(currentReminderDate.getFullYear() + frequencyYears);
    }
    
    // Insert all reminders
    if (remindersToCreate.length > 0) {
      const { error } = await supabase
        .from("reminders")
        .insert(remindersToCreate);
      
      if (error) {
        console.error("Error creating reminders:", error);
        throw error;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPetId || !vaccineType || !date) {
      toast({
        title: t.weightTracking.missingInfo,
        description: t.weightTracking.fillAllFields,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const frequencyYears = createReminder ? parseInt(reminderFrequency) : null;

      const { data, error } = await supabase
        .from("vaccinations")
        .insert({
          pet_id: selectedPetId,
          user_id: user.id,
          vaccine_type: vaccineType,
          date,
          notes: notes || null,
          create_reminder: createReminder,
          reminder_frequency_years: frequencyYears,
        })
        .select()
        .single();

      if (error) throw error;

      // Create reminders if requested
      if (createReminder && frequencyYears) {
        await createReminders(selectedPetId, user.id, vaccineType, date, frequencyYears);
      }

      toast({
        title: t.weightTracking.success,
        description: t.weightTracking.vaccineAdded,
      });

      // Reset form
      setVaccineType("");
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      setCreateReminder(false);
      setReminderFrequency("1");
      
      // Refresh records
      fetchVaccines(selectedPetId);
    } catch (error) {
      console.error("Error adding vaccine:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToAddVaccine,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (vaccine: Vaccine) => {
    setEditingVaccine(vaccine);
    setVaccineType(vaccine.vaccine_type);
    setDate(vaccine.date);
    setNotes(vaccine.notes || "");
    setCreateReminder(vaccine.create_reminder);
    setReminderFrequency(vaccine.reminder_frequency_years?.toString() || "1");
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingVaccine || !vaccineType || !date) {
      toast({
        title: t.weightTracking.missingInfo,
        description: t.weightTracking.fillAllFields,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete old reminders for this vaccine
      const { error: deleteError } = await supabase
        .from("reminders")
        .delete()
        .eq("pet_id", selectedPetId)
        .like("title", `%${editingVaccine.vaccine_type}%`)
        .like("description", "%Vacuna%");

      if (deleteError) console.error("Error deleting old reminders:", deleteError);

      const frequencyYears = createReminder ? parseInt(reminderFrequency) : null;

      const { error } = await supabase
        .from("vaccinations")
        .update({
          vaccine_type: vaccineType,
          date,
          notes: notes || null,
          create_reminder: createReminder,
          reminder_frequency_years: frequencyYears,
        })
        .eq("id", editingVaccine.id);

      if (error) throw error;

      // Create new reminders if requested
      if (createReminder && frequencyYears) {
        await createReminders(selectedPetId, user.id, vaccineType, date, frequencyYears);
      }

      toast({
        title: t.weightTracking.success,
        description: t.weightTracking.vaccineUpdated,
      });

      setEditDialogOpen(false);
      setEditingVaccine(null);
      fetchVaccines(selectedPetId);
    } catch (error) {
      console.error("Error updating vaccine:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToUpdateVaccine,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vaccineId: string, vaccineType: string) => {
    try {
      // Delete reminders first (trigger should handle this, but doing it explicitly)
      const { error: deleteError } = await supabase
        .from("reminders")
        .delete()
        .eq("pet_id", selectedPetId)
        .like("title", `%${vaccineType}%`)
        .like("description", "%Vacuna%");

      if (deleteError) console.error("Error deleting reminders:", deleteError);

      const { error } = await supabase
        .from("vaccinations")
        .delete()
        .eq("id", vaccineId);

      if (error) throw error;

      toast({
        title: t.weightTracking.deleted,
        description: t.weightTracking.vaccineDeleted,
      });

      fetchVaccines(selectedPetId);
    } catch (error) {
      console.error("Error deleting vaccine:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToDeleteVaccine,
        variant: "destructive",
      });
    }
  };

  const locale = language === 'en' ? 'en-US' : 'es-ES';
  
  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!selectedPetId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          {t.weightTracking.selectPet}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.weightTracking.registerVaccine}</CardTitle>
          <CardDescription>{t.weightTracking.registerVaccineDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vaccineType">{t.weightTracking.vaccineType} *</Label>
              <Input
                id="vaccineType"
                value={vaccineType}
                onChange={(e) => setVaccineType(e.target.value)}
                placeholder={t.weightTracking.vaccineTypePlaceholder}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">{t.weightTracking.date} *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t.weightTracking.observations}</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.weightTracking.observationsPlaceholder}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="createReminder"
                checked={createReminder}
                onCheckedChange={(checked) => setCreateReminder(checked === true)}
              />
              <Label htmlFor="createReminder" className="cursor-pointer">
                {t.weightTracking.createReminder}
              </Label>
            </div>

            {createReminder && (
              <div className="space-y-2">
                <Label htmlFor="reminderFrequency">{t.weightTracking.reminderFrequency}</Label>
                <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.weightTracking.reminderFrequencyPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t.weightTracking.everyYear}</SelectItem>
                    <SelectItem value="2">{t.weightTracking.every2Years}</SelectItem>
                    <SelectItem value="3">{t.weightTracking.every3Years}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              <Plus className="mr-2 h-4 w-4" />
              {submitting ? t.weightTracking.adding : t.weightTracking.registerVaccine}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.weightTracking.vaccineRecords}</CardTitle>
        </CardHeader>
        <CardContent>
          {vaccines.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t.weightTracking.noVaccines}
            </div>
          ) : (
            <div className="space-y-2">
              {vaccines.map((vaccine) => (
                <div
                  key={vaccine.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{vaccine.vaccine_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(vaccine.date)}
                    </div>
                    {vaccine.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {vaccine.notes}
                      </div>
                    )}
                    {vaccine.create_reminder && vaccine.reminder_frequency_years && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {t.weightTracking.reminderLabel} {vaccine.reminder_frequency_years === 1 
                          ? t.weightTracking.everyYear 
                          : vaccine.reminder_frequency_years === 2 
                          ? t.weightTracking.every2Years 
                          : vaccine.reminder_frequency_years === 3 
                          ? t.weightTracking.every3Years 
                          : t.weightTracking.everyXYears.replace('{value}', vaccine.reminder_frequency_years.toString())}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(vaccine)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(vaccine.id, vaccine.vaccine_type)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.weightTracking.editVaccine}</DialogTitle>
            <DialogDescription>
              {t.weightTracking.editVaccineDesc}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editVaccineType">{t.weightTracking.vaccineType} *</Label>
              <Input
                id="editVaccineType"
                value={vaccineType}
                onChange={(e) => setVaccineType(e.target.value)}
                placeholder={t.weightTracking.vaccineTypePlaceholder}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDate">{t.weightTracking.date} *</Label>
              <Input
                id="editDate"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editNotes">{t.weightTracking.observations}</Label>
              <Textarea
                id="editNotes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t.weightTracking.observationsPlaceholder}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="editCreateReminder"
                checked={createReminder}
                onCheckedChange={(checked) => setCreateReminder(checked === true)}
              />
              <Label htmlFor="editCreateReminder" className="cursor-pointer">
                {t.weightTracking.createReminder}
              </Label>
            </div>

            {createReminder && (
              <div className="space-y-2">
                <Label htmlFor="editReminderFrequency">{t.weightTracking.reminderFrequency}</Label>
                <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.weightTracking.reminderFrequencyPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t.weightTracking.everyYear}</SelectItem>
                    <SelectItem value="2">{t.weightTracking.every2Years}</SelectItem>
                    <SelectItem value="3">{t.weightTracking.every3Years}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setEditingVaccine(null);
                }}
              >
                {t.cancel}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t.loading : t.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

