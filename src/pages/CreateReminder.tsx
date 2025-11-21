import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, Bell } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";

const CreateReminder = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchPets = async () => {
      if (!user || authLoading) return;
      
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching pets:', error);
      } else {
        setPets(data || []);
      }
    };

    fetchPets();
  }, [user, authLoading]);

  const [formData, setFormData] = useState({
    title: '',
    pet_id: '',
    type: 'general',
    reminder_date: '',
    reminder_time: '',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim() || !formData.reminder_date) {
      toast({
        title: t.reminders.missingInfo,
        description: t.reminders.fillFields,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          pet_id: formData.pet_id === 'general' ? null : formData.pet_id || null,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          reminder_date: formData.reminder_date,
          reminder_time: formData.reminder_time || null,
          type: formData.type
        });

      if (error) {
        throw error;
      }

      toast({
        title: t.reminders.success,
        description: t.reminders.createdSuccess,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: t.reminders.error,
        description: t.reminders.tryAgain,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-sage-light flex items-center justify-center">
        <div className="text-center">
          <div className="text-muted-foreground">{t.loading}</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-sage-light">
      <header className="bg-background border-b shadow-soft">
        <div className="px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-sage" />
            <span className="text-xl font-bold text-sage">{t.reminders.create}</span>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle>{t.reminders.createNew}</CardTitle>
              <CardDescription>
                {t.reminders.createDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">{t.reminders.titleLabel}</Label>
                  <Input
                    id="title"
                    placeholder={t.reminders.titlePlaceholder}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pet">{t.reminders.selectPet}</Label>
                  <Select value={formData.pet_id} onValueChange={(value) => setFormData({ ...formData, pet_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.reminders.selectPetOptional} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">{t.reminders.generalReminder}</SelectItem>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">{t.reminders.type}</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.reminders.selectType} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vaccination">{t.reminders.vaccination}</SelectItem>
                      <SelectItem value="checkup">{t.reminders.checkup}</SelectItem>
                      <SelectItem value="grooming">{t.reminders.grooming}</SelectItem>
                      <SelectItem value="medication">{t.reminders.medication}</SelectItem>
                      <SelectItem value="deworming">{t.reminders.deworming}</SelectItem>
                      <SelectItem value="general">{t.reminders.general}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">{t.reminders.date} *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.reminder_date}
                      onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time">{t.reminders.timeOptional}</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.reminder_time}
                      onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t.reminders.description}</Label>
                  <Textarea
                    id="description"
                    placeholder={t.reminders.descriptionPlaceholder}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="flex gap-4">
                  <Button type="button" variant="outline" className="flex-1" asChild>
                    <Link to="/dashboard">{t.cancel}</Link>
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    <Bell className="h-4 w-4 mr-2" />
                    {loading ? t.reminders.creating : t.reminders.create}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateReminder;