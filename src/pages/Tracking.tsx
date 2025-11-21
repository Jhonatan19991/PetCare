import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Scale, Syringe, Bug, Clock } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeightTab from "@/components/tracking/WeightTab";
import VaccineTab from "@/components/tracking/VaccineTab";
import DewormingTab from "@/components/tracking/DewormingTab";
import TimelineTab from "@/components/tracking/TimelineTab";

interface Pet {
  id: string;
  name: string;
  species: string;
  weight: number | null;
  created_at: string;
}

export default function Tracking() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase
        .from("pets")
        .select("id, name, species, weight, created_at")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      
      setPets(data || []);
      if (data && data.length > 0) {
        setSelectedPetId(data[0].id);
      }
    } catch (error) {
      console.error("Error fetching pets:", error);
      toast({
        title: t.weightTracking.error,
        description: t.weightTracking.failedToLoad,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center">
        <p>{t.loading}</p>
      </div>
    );
  }

  if (pets.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard")}
            className="mb-6"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.weightTracking.backToDashboard}
          </Button>
          <Card className="p-8 text-center">
            <p className="text-muted-foreground mb-4">No tienes mascotas registradas</p>
            <Button onClick={() => navigate("/add-pet")}>Agregar Mascota</Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.weightTracking.backToDashboard}
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-4">{t.weightTracking.title}</h1>
          <p className="text-muted-foreground mb-4">
            Registra y monitorea el peso, vacunas y desparasitaciones de tus mascotas
          </p>
          <div className="max-w-xs">
            <Select value={selectedPetId} onValueChange={setSelectedPetId}>
              <SelectTrigger>
                <SelectValue placeholder={t.weightTracking.selectPetPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {pets.map((pet) => (
                  <SelectItem key={pet.id} value={pet.id}>
                    {pet.name} ({pet.species})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="weight" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="weight" className="flex items-center gap-2">
              <Scale className="h-4 w-4" />
              <span>{t.weightTracking.recordWeight}</span>
            </TabsTrigger>
            <TabsTrigger value="vaccines" className="flex items-center gap-2">
              <Syringe className="h-4 w-4" />
              <span>{t.weightTracking.vaccines}</span>
            </TabsTrigger>
            <TabsTrigger value="dewormings" className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              <span>{t.weightTracking.dewormings}</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{t.weightTracking.timeline}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="weight">
            <WeightTab 
              selectedPetId={selectedPetId} 
              pets={pets}
            />
          </TabsContent>

          <TabsContent value="vaccines">
            <VaccineTab selectedPetId={selectedPetId} />
          </TabsContent>

          <TabsContent value="dewormings">
            <DewormingTab selectedPetId={selectedPetId} />
          </TabsContent>

          <TabsContent value="timeline">
            <TimelineTab selectedPetId={selectedPetId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
