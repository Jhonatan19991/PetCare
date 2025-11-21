import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/components/LanguageProvider";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Pet {
  id: string;
  name: string;
  species: string;
  weight: number | null;
  created_at: string;
}

interface WeightRecord {
  id: string;
  pet_id: string;
  weight: number;
  date: string;
  notes: string | null;
  created_at: string;
}

interface WeightTabProps {
  selectedPetId: string;
  pets: Pet[];
}

export default function WeightTab({ selectedPetId, pets }: WeightTabProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (selectedPetId) {
      fetchWeightRecords(selectedPetId);
    } else {
      setWeightRecords([]);
    }
  }, [selectedPetId]);

  // Detect dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);

  const fetchWeightRecords = async (petId: string) => {
    try {
      const { data, error } = await supabase
        .from("weight_history")
        .select("*")
        .eq("pet_id", petId)
        .order("date", { ascending: true });

      if (error) throw error;
      setWeightRecords(data || []);
    } catch (error) {
      console.error("Error fetching weight records:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToLoadHistory,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPetId || !weight || !date) {
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

      const { error } = await supabase
        .from("weight_history")
        .insert({
          pet_id: selectedPetId,
          user_id: user.id,
          weight: parseFloat(weight),
          date,
          notes: notes || null,
        });

      if (error) throw error;

      // Update the pet's current weight
      await supabase
        .from("pets")
        .update({ weight: parseFloat(weight) })
        .eq("id", selectedPetId);

      toast({
        title: t.weightTracking.success,
        description: t.weightTracking.recordAdded,
      });

      // Reset form
      setWeight("");
      setDate(new Date().toISOString().split('T')[0]);
      setNotes("");
      
      // Refresh records
      fetchWeightRecords(selectedPetId);
    } catch (error) {
      console.error("Error adding weight record:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToAdd,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from("weight_history")
        .delete()
        .eq("id", recordId);

      if (error) throw error;

      toast({
        title: t.weightTracking.deleted,
        description: t.weightTracking.recordRemoved,
      });

      fetchWeightRecords(selectedPetId);
    } catch (error) {
      console.error("Error deleting weight record:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToDelete,
        variant: "destructive",
      });
    }
  };

  const locale = language === 'en' ? 'en-US' : 'es-ES';
  
  const formatDate = (dateString: string, options: Intl.DateTimeFormatOptions = {}) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString(locale, options);
  };
  
  const timestampToDateString = (timestamp: string): string => {
    return timestamp.split('T')[0];
  };
  
  const selectedPet = pets.find(p => p.id === selectedPetId);
  
  const allWeightRecords: Array<{ date: string; weight: number; isInitial?: boolean; id?: string }> = [];
  
  if (selectedPet && selectedPet.weight !== null && selectedPet.weight !== undefined) {
    const initialDate = timestampToDateString(selectedPet.created_at);
    const hasRecordOnInitialDate = weightRecords.some(record => record.date === initialDate);
    
    if (!hasRecordOnInitialDate) {
      allWeightRecords.push({
        date: initialDate,
        weight: parseFloat(selectedPet.weight.toString()),
        isInitial: true
      });
    }
  }
  
  weightRecords.forEach(record => {
    allWeightRecords.push({
      date: record.date,
      weight: parseFloat(record.weight.toString()),
      isInitial: false,
      id: record.id
    });
  });
  
  allWeightRecords.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  const chartData = allWeightRecords.map(record => ({
    date: formatDate(record.date, { 
      month: 'short', 
      day: 'numeric' 
    }),
    weight: record.weight,
    originalDate: record.date
  }));

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
      <div className="grid gap-6 md:grid-cols-2">
        {/* Add Weight Record Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t.weightTracking.recordWeight}</CardTitle>
            <CardDescription>{t.weightTracking.recordWeightDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weight">{t.weightTracking.weight} *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={t.weightTracking.weightPlaceholder}
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
                <Label htmlFor="notes">{t.weightTracking.notes}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.weightTracking.notesPlaceholder}
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                <Plus className="mr-2 h-4 w-4" />
                {submitting ? t.weightTracking.adding : t.weightTracking.addRecord}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Weight History Chart */}
        <Card>
          <CardHeader>
            <CardTitle>{t.weightTracking.weightEvolution}</CardTitle>
            <CardDescription>
              {t.weightTracking.weightEvolutionDesc} {selectedPet?.name} {t.weightTracking.overTime}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis label={{ value: t.weightTracking.weight, angle: -90, position: 'insideLeft' }} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: isDarkMode ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
                      border: isDarkMode ? '1px solid hsl(217.2, 32.6%, 17.5%)' : '1px solid hsl(142, 32%, 88%)',
                      borderRadius: '0.5rem',
                      color: isDarkMode ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
                    }}
                    labelStyle={{
                      color: isDarkMode ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                {t.weightTracking.noRecords}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weight Records Table */}
      {allWeightRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t.weightTracking.weightRecords}</CardTitle>
            <CardDescription>{t.weightTracking.historicalMeasurements}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allWeightRecords.slice().reverse().map((record, index) => {
                if (record.isInitial) {
                  return (
                    <div
                      key={`initial-${selectedPetId}`}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors bg-primary/5"
                    >
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {record.weight.toFixed(2)} kg
                          <span className="text-xs text-muted-foreground bg-primary/10 px-2 py-1 rounded">
                            Peso inicial
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(record.date, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                  );
                }
                
                const weightRecord = weightRecords.find(wr => wr.date === record.date);
                if (!weightRecord) return null;
                
                return (
                  <div
                    key={weightRecord.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {record.weight.toFixed(2)} kg
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(record.date, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      {weightRecord.notes && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {weightRecord.notes}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(weightRecord.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

