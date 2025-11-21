import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Syringe, Bug } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/LanguageProvider";

interface TimelineEvent {
  id: string;
  type: 'weight' | 'vaccine' | 'deworming';
  date: string;
  title: string;
  description: string | null;
  icon: React.ReactNode;
  color: string;
}

interface TimelineTabProps {
  selectedPetId: string;
}

export default function TimelineTab({ selectedPetId }: TimelineTabProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedPetId) {
      fetchAllEvents(selectedPetId);
    } else {
      setEvents([]);
    }
  }, [selectedPetId]);

  const fetchAllEvents = async (petId: string) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch weight records
      const { data: weightData, error: weightError } = await supabase
        .from("weight_history")
        .select("*")
        .eq("pet_id", petId)
        .order("date", { ascending: false });

      if (weightError) throw weightError;

      // Fetch vaccines
      const { data: vaccineData, error: vaccineError } = await supabase
        .from("vaccinations")
        .select("*")
        .eq("pet_id", petId)
        .order("date", { ascending: false });

      if (vaccineError) throw vaccineError;

      // Fetch dewormings
      const { data: dewormingData, error: dewormingError } = await supabase
        .from("dewormings")
        .select("*")
        .eq("pet_id", petId)
        .order("date", { ascending: false });

      if (dewormingError) throw dewormingError;

      // Combine all events
      const allEvents: TimelineEvent[] = [];

      // Add weight events
      weightData?.forEach((record) => {
        allEvents.push({
          id: record.id,
          type: 'weight',
          date: record.date,
          title: `${record.weight} kg`,
          description: record.notes,
          icon: <Scale className="h-5 w-5" />,
          color: 'text-blue-600 dark:text-blue-400',
        });
      });

      // Add vaccine events
      vaccineData?.forEach((record) => {
        allEvents.push({
          id: record.id,
          type: 'vaccine',
          date: record.date,
          title: record.vaccine_type,
          description: record.notes,
          icon: <Syringe className="h-5 w-5" />,
          color: 'text-green-600 dark:text-green-400',
        });
      });

      // Add deworming events
      dewormingData?.forEach((record) => {
        allEvents.push({
          id: record.id,
          type: 'deworming',
          date: record.date,
          title: record.deworming_type,
          description: record.notes,
          icon: <Bug className="h-5 w-5" />,
          color: 'text-orange-600 dark:text-orange-400',
        });
      });

      // Sort by date (most recent first)
      allEvents.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB.getTime() - dateA.getTime();
      });

      setEvents(allEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
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

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'weight':
        return t.weightTracking.weightEvent;
      case 'vaccine':
        return t.weightTracking.vaccineEvent;
      case 'deworming':
        return t.weightTracking.dewormingEvent;
      default:
        return '';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'weight':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700';
      case 'vaccine':
        return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700';
      case 'deworming':
        return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700';
      default:
        return 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700';
    }
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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          {t.loading}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.weightTracking.timeline}</CardTitle>
        <CardDescription>{t.weightTracking.timelineDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {t.weightTracking.noEvents}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            {events.length > 0 && (
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            )}
            
            <div className="space-y-4">
              {events.map((event, index) => (
                <div key={`${event.type}-${event.id}`} className="relative flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-2 ${getEventTypeColor(event.type)}`}>
                    <div className={event.color}>
                      {event.icon}
                    </div>
                  </div>
                  
                  {/* Event content */}
                  <div className={`flex-1 border rounded-lg p-4 ${getEventTypeColor(event.type)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${getEventTypeColor(event.type)}`}>
                            {getEventTypeLabel(event.type)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-base">{event.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(event.date)}
                        </p>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

