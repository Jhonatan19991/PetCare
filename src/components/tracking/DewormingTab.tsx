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
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/LanguageProvider";

interface Deworming {
  id: string;
  pet_id: string;
  deworming_type: string;
  date: string;
  notes: string | null;
  create_reminder: boolean;
  reminder_frequency_type: string | null; // 'months' o 'year'
  reminder_frequency_value: number | null; // 1, 3, 6 (months) o 1 (year)
  created_at: string;
}

interface DewormingTabProps {
  selectedPetId: string;
}

export default function DewormingTab({ selectedPetId }: DewormingTabProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [dewormings, setDewormings] = useState<Deworming[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [dewormingType, setDewormingType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [createReminder, setCreateReminder] = useState(false);
  const [reminderFrequency, setReminderFrequency] = useState<string>("1-month");
  const [submitting, setSubmitting] = useState(false);
  
  // Edit states
  const [editingDeworming, setEditingDeworming] = useState<Deworming | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    if (selectedPetId) {
      fetchDewormings(selectedPetId);
    } else {
      setDewormings([]);
    }
  }, [selectedPetId]);

  const fetchDewormings = async (petId: string) => {
    try {
      const { data, error } = await supabase
        .from("dewormings")
        .select("*")
        .eq("pet_id", petId)
        .order("date", { ascending: false });

      if (error) throw error;
      setDewormings(data || []);
    } catch (error) {
      console.error("Error fetching dewormings:", error);
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

  const createNextReminder = async (
    petId: string,
    userId: string,
    dewormingType: string,
    dewormingDate: string,
    frequencyType: string,
    frequencyValue: number
  ) => {
    const dewormingDateObj = parseDateString(dewormingDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Calculate next reminder date
    let nextReminderDate = new Date(dewormingDateObj);
    
    if (frequencyType === 'months') {
      nextReminderDate.setMonth(nextReminderDate.getMonth() + frequencyValue);
    } else if (frequencyType === 'year') {
      nextReminderDate.setFullYear(nextReminderDate.getFullYear() + frequencyValue);
    }
    
    // If deworming is in the past, only create the next reminder
    if (dewormingDateObj < today) {
      // Deworming already applied, create only next reminder
      while (nextReminderDate < today) {
        if (frequencyType === 'months') {
          nextReminderDate.setMonth(nextReminderDate.getMonth() + frequencyValue);
        } else if (frequencyType === 'year') {
          nextReminderDate.setFullYear(nextReminderDate.getFullYear() + frequencyValue);
        }
      }
    }
    
    // Only create the next reminder (not all future ones)
    // The system will create the next one when this is completed
    const maxDate = new Date(today);
    maxDate.setFullYear(maxDate.getFullYear() + 10);
    
    if (nextReminderDate <= maxDate) {
      const { error } = await supabase
        .from("reminders")
        .insert({
          user_id: userId,
          pet_id: petId,
          title: `Desparasitación: ${dewormingType}`,
          description: `Recordatorio para aplicar la desparasitación ${dewormingType}`,
          reminder_date: formatDateString(nextReminderDate),
          type: 'deworming',
        });
      
      if (error) {
        console.error("Error creating reminder:", error);
        throw error;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPetId || !dewormingType || !date) {
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

      let frequencyType: string | null = null;
      let frequencyValue: number | null = null;

      if (createReminder) {
        const [value, type] = reminderFrequency.split('-');
        frequencyValue = parseInt(value);
        frequencyType = type === 'month' ? 'months' : 'year';
      }

      const { data, error } = await supabase
        .from("dewormings")
        .insert({
          pet_id: selectedPetId,
          user_id: user.id,
          deworming_type: dewormingType,
          date,
          notes: notes || null,
          create_reminder: createReminder,
          reminder_frequency_type: frequencyType,
          reminder_frequency_value: frequencyValue,
        })
        .select()
        .single();

      if (error) throw error;

      // Create only the next reminder if requested
      if (createReminder && frequencyType && frequencyValue) {
        await createNextReminder(selectedPetId, user.id, dewormingType, date, frequencyType, frequencyValue);
      }

      toast({
        title: t.weightTracking.success,
        description: t.weightTracking.dewormingAdded,
      });

      // Reset form
      setDewormingType("");
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      setCreateReminder(false);
      setReminderFrequency("1-month");
      
      // Refresh records
      fetchDewormings(selectedPetId);
    } catch (error) {
      console.error("Error adding deworming:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToAddDeworming,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (deworming: Deworming) => {
    setEditingDeworming(deworming);
    setDewormingType(deworming.deworming_type);
    setDate(deworming.date);
    setNotes(deworming.notes || "");
    setCreateReminder(deworming.create_reminder);
    
    if (deworming.reminder_frequency_type && deworming.reminder_frequency_value) {
      const type = deworming.reminder_frequency_type === 'months' ? 'month' : 'year';
      setReminderFrequency(`${deworming.reminder_frequency_value}-${type}`);
    } else {
      setReminderFrequency("1-month");
    }
    
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingDeworming || !dewormingType || !date) {
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

      // Delete old reminders for this deworming
      const { error: deleteError } = await supabase
        .from("reminders")
        .delete()
        .eq("pet_id", selectedPetId)
        .like("title", `%${editingDeworming.deworming_type}%`)
        .like("description", "%Desparasitación%");

      if (deleteError) console.error("Error deleting old reminders:", deleteError);

      let frequencyType: string | null = null;
      let frequencyValue: number | null = null;

      if (createReminder) {
        const [value, type] = reminderFrequency.split('-');
        frequencyValue = parseInt(value);
        frequencyType = type === 'month' ? 'months' : 'year';
      }

      const { error } = await supabase
        .from("dewormings")
        .update({
          deworming_type: dewormingType,
          date,
          notes: notes || null,
          create_reminder: createReminder,
          reminder_frequency_type: frequencyType,
          reminder_frequency_value: frequencyValue,
        })
        .eq("id", editingDeworming.id);

      if (error) throw error;

      // Create new next reminder if requested
      if (createReminder && frequencyType && frequencyValue) {
        await createNextReminder(selectedPetId, user.id, dewormingType, date, frequencyType, frequencyValue);
      }

      toast({
        title: t.weightTracking.success,
        description: t.weightTracking.dewormingUpdated,
      });

      setEditDialogOpen(false);
      setEditingDeworming(null);
      fetchDewormings(selectedPetId);
    } catch (error) {
      console.error("Error updating deworming:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToUpdateDeworming,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (dewormingId: string, dewormingType: string) => {
    try {
      // Delete reminders first
      const { error: deleteError } = await supabase
        .from("reminders")
        .delete()
        .eq("pet_id", selectedPetId)
        .like("title", `%${dewormingType}%`)
        .like("description", "%Desparasitación%");

      if (deleteError) console.error("Error deleting reminders:", deleteError);

      const { error } = await supabase
        .from("dewormings")
        .delete()
        .eq("id", dewormingId);

      if (error) throw error;

      toast({
        title: t.weightTracking.deleted,
        description: t.weightTracking.dewormingDeleted,
      });

      fetchDewormings(selectedPetId);
    } catch (error) {
      console.error("Error deleting deworming:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToDeleteDeworming,
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

  const getFrequencyLabel = (frequencyType: string | null, frequencyValue: number | null) => {
    if (!frequencyType || !frequencyValue) return "";
    
    if (frequencyType === 'months') {
      if (frequencyValue === 1) return t.weightTracking.everyMonth;
      if (frequencyValue === 3) return t.weightTracking.every3Months;
      if (frequencyValue === 6) return t.weightTracking.every6Months;
      return t.weightTracking.everyXMonths.replace('{value}', frequencyValue.toString());
    } else if (frequencyType === 'year') {
      return t.weightTracking.everyYearDeworming;
    }
    return "";
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
          <CardTitle>{t.weightTracking.registerDeworming}</CardTitle>
          <CardDescription>{t.weightTracking.registerDewormingDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dewormingType">{t.weightTracking.dewormingType} *</Label>
              <Input
                id="dewormingType"
                value={dewormingType}
                onChange={(e) => setDewormingType(e.target.value)}
                placeholder={t.weightTracking.dewormingTypePlaceholder}
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
                <Label htmlFor="reminderFrequency">{t.weightTracking.dewormingFrequency}</Label>
                <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.weightTracking.dewormingFrequencyPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-month">{t.weightTracking.everyMonth}</SelectItem>
                    <SelectItem value="3-months">{t.weightTracking.every3Months}</SelectItem>
                    <SelectItem value="6-months">{t.weightTracking.every6Months}</SelectItem>
                    <SelectItem value="1-year">{t.weightTracking.everyYearDeworming}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              <Plus className="mr-2 h-4 w-4" />
              {submitting ? t.weightTracking.adding : t.weightTracking.registerDeworming}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.weightTracking.dewormingRecords}</CardTitle>
        </CardHeader>
        <CardContent>
          {dewormings.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {t.weightTracking.noDewormings}
            </div>
          ) : (
            <div className="space-y-2">
              {dewormings.map((deworming) => (
                <div
                  key={deworming.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">{deworming.deworming_type}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(deworming.date)}
                    </div>
                    {deworming.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {deworming.notes}
                      </div>
                    )}
                    {deworming.create_reminder && deworming.reminder_frequency_type && deworming.reminder_frequency_value && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {t.weightTracking.reminderLabel} {getFrequencyLabel(deworming.reminder_frequency_type, deworming.reminder_frequency_value)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(deworming)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(deworming.id, deworming.deworming_type)}
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
            <DialogTitle>{t.weightTracking.editDeworming}</DialogTitle>
            <DialogDescription>
              {t.weightTracking.editDewormingDesc}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editDewormingType">{t.weightTracking.dewormingType} *</Label>
              <Input
                id="editDewormingType"
                value={dewormingType}
                onChange={(e) => setDewormingType(e.target.value)}
                placeholder={t.weightTracking.dewormingTypePlaceholder}
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
                <Label htmlFor="editReminderFrequency">{t.weightTracking.dewormingFrequency}</Label>
                <Select value={reminderFrequency} onValueChange={setReminderFrequency}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.weightTracking.dewormingFrequencyPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-month">{t.weightTracking.everyMonth}</SelectItem>
                    <SelectItem value="3-months">{t.weightTracking.every3Months}</SelectItem>
                    <SelectItem value="6-months">{t.weightTracking.every6Months}</SelectItem>
                    <SelectItem value="1-year">{t.weightTracking.everyYearDeworming}</SelectItem>
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
                  setEditingDeworming(null);
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

