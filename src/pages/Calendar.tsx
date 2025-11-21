import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Calendar as CalendarIcon, 
  Plus, 
  ArrowLeft,
  CheckCircle2,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { format, isSameDay } from "date-fns";
import { es, enUS } from "date-fns/locale";

const CalendarPage = () => {
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const dateLocale = language === 'es' ? es : enUS;

  // Helper function to parse date string and avoid timezone issues
  const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    const fetchReminders = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('reminders')
          .select(`
            *,
            pets (name, species)
          `)
          .eq('user_id', user.id)
          .order('reminder_date', { ascending: true });

        if (error) {
          console.error('Error fetching reminders:', error);
        } else {
          setReminders(data || []);
        }
      } catch (error) {
        console.error('Error fetching reminders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReminders();
  }, [user]);

  const markAsCompleted = async (reminderId: string) => {
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed: true })
        .eq('id', reminderId);

      if (!error) {
        setReminders(reminders.map(r => 
          r.id === reminderId ? { ...r, completed: true } : r
        ));
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
    }
  };

  const selectedDateReminders = selectedDate 
    ? reminders.filter(reminder => 
        isSameDay(parseDateString(reminder.reminder_date), selectedDate)
      )
    : [];

  const getDatesWithReminders = () => {
    return reminders.map(reminder => parseDateString(reminder.reminder_date));
  };

  const getUpcomingReminders = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return reminders
      .filter(reminder => {
        const reminderDate = parseDateString(reminder.reminder_date);
        reminderDate.setHours(0, 0, 0, 0);
        return reminderDate >= today && !reminder.completed;
      })
      .slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-sage-light">
      {/* Header */}
      <header className="bg-background border-b shadow-soft">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">PetCare</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="hero" asChild>
              <Link to="/create-reminder">
                <Plus className="h-4 w-4 mr-2" />
                {t.calendar.newReminder}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t.calendar.pageTitle}
            </h1>
            <p className="text-muted-foreground">
              {t.calendar.pageDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <Card className="lg:col-span-2 border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-coral" />
                  {t.calendar.calendarView}
                </CardTitle>
                <CardDescription>
                  {t.calendar.calendarDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={dateLocale}
                  className="rounded-md border pointer-events-auto"
                  modifiers={{
                    hasReminder: getDatesWithReminders()
                  }}
                  modifiersStyles={{
                    hasReminder: { 
                      backgroundColor: 'hsl(var(--coral))', 
                      color: 'white',
                      fontWeight: 'bold'
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Selected Date Reminders */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedDate 
                    ? format(selectedDate, 'MMMM d, yyyy', { locale: dateLocale })
                    : t.calendar.selectDate
                  }
                </CardTitle>
                <CardDescription>
                  {selectedDateReminders.length} {t.calendar.remindersForDay}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="text-muted-foreground">{t.loading}</div>
                  </div>
                ) : selectedDateReminders.length === 0 ? (
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {t.calendar.noRemindersForDay}
                    </p>
                  </div>
                ) : (
                  selectedDateReminders.map((reminder) => (
                    <div 
                      key={reminder.id} 
                      className={`p-3 rounded-lg border ${
                        reminder.completed 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-coral-light border-coral/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground mb-1">
                            {reminder.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {reminder.pets?.name || t.calendar.general} • {reminder.type}
                          </p>
                          {reminder.reminder_time && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {reminder.reminder_time}
                            </div>
                          )}
                          {reminder.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {reminder.description}
                            </p>
                          )}
                        </div>
                        {!reminder.completed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsCompleted(reminder.id)}
                            className="ml-2"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                        )}
                        {reminder.completed && (
                          <Badge variant="secondary" className="ml-2">
                            {t.calendar.completed}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Upcoming Reminders */}
            <Card className="lg:col-span-3 border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-primary" />
                  {t.calendar.upcomingReminders}
                </CardTitle>
                <CardDescription>
                  {t.calendar.upcomingRemindersDescription}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getUpcomingReminders().length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {t.calendar.noUpcomingReminders}
                      </p>
                      <Button variant="outline" asChild>
                        <Link to="/create-reminder">
                          <Plus className="h-4 w-4 mr-2" />
                          {t.calendar.createFirstReminder}
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    getUpcomingReminders().map((reminder) => (
                      <div 
                        key={reminder.id}
                        className="p-4 rounded-lg bg-coral-light border border-coral/20 hover:shadow-soft transition-shadow"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-2xl">
                            {reminder.pets?.species === 'dog' ? '🐕' : '🐱'}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-foreground">
                              {reminder.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {reminder.pets?.name || t.calendar.general}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            {format(parseDateString(reminder.reminder_date), 'MMM d, yyyy', { locale: dateLocale })}
                            {reminder.reminder_time && ` • ${reminder.reminder_time}`}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {reminder.type}
                          </Badge>
                        </div>
                        {reminder.description && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {reminder.description}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CalendarPage;