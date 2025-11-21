import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Plus, 
  Calendar, 
  Camera, 
  MessageCircle, 
  Bell,
  TrendingUp,
  Stethoscope,
  PawPrint,
  Bot,
  ExternalLink,
  Activity
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useTranslation } from "@/hooks/useTranslation";
import { translateRecommendations } from "@/services/skinDiseasePredictionService";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  
  // Helper function to parse date string and avoid timezone issues
  const parseDateString = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [pets, setPets] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [vetNotes, setVetNotes] = useState<any[]>([]);
const [aiResults, setAiResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    const fetchData = async () => {
      if (authLoading) {
        console.log('Dashboard: Auth still loading...');
        return;
      }
      
      if (!user) {
        console.log('Dashboard: No user found');
        return;
      }
      console.log('Dashboard: User authenticated:', user.email);
      console.log('Dashboard: User ID:', user.id);
      
      try {
        // Fetch pets with images
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (petsError) {
          console.error('Error fetching pets:', petsError);
        } else {
          setPets(petsData || []);
        }

        // Fetch upcoming reminders (next 7 days)
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        const { data: remindersData, error: remindersError } = await supabase
          .from('reminders')
          .select(`
            *,
            pets (name)
          `)
          .eq('user_id', user.id)
          .eq('completed', false)
          .gte('reminder_date', new Date().toISOString().split('T')[0])
          .lte('reminder_date', nextWeek.toISOString().split('T')[0])
          .order('reminder_date', { ascending: true });

        if (remindersError) {
          console.error('Error fetching reminders:', remindersError);
        } else {
          setReminders(remindersData || []);
        }

        // Fetch recent vet notes
        const { data: vetNotesData, error: vetNotesError } = await supabase
          .from('vet_notes')
          .select(`
            *,
            pets (name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (vetNotesError) {
          console.error('Error fetching vet notes:', vetNotesError);
        } else {
          setVetNotes(vetNotesData || []);
        }

        // Fetch recent AI analyses
        const { data: aiData, error: aiError } = await supabase
          .from('ai_analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (aiError) {
          console.error('Error fetching AI analyses:', aiError);
          console.error('AI analyses error details:', {
            message: aiError.message,
            details: aiError.details,
            hint: aiError.hint,
            code: aiError.code
          });
        } else {
          setAiResults(aiData || []);
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Suscripción en tiempo real para actualizar cuando cambie fhir_patient_id
    // Esto asegura que los botones "Ver observaciones" y "Ver paciente" aparezcan
    // automáticamente cuando se complete la creación en FHIR
    let petsSubscription: any = null;
    
    if (user && !authLoading) {
      petsSubscription = supabase
        .channel('pets-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'pets',
            filter: `user_id=eq.${user.id}`
          },
          async (payload) => {
            console.log('Pet updated:', payload);
            // Refrescar solo los datos de mascotas cuando hay una actualización
            const { data: petsData, error: petsError } = await supabase
              .from('pets')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (!petsError && petsData) {
              setPets(petsData);
            }
          }
        )
        .subscribe();
    }

    // Refresco periódico como respaldo (cada 5 segundos durante los primeros 30 segundos)
    // Esto ayuda a capturar actualizaciones si la suscripción en tiempo real no funciona
    let refreshInterval: number | null = null;
    let refreshCount = 0;
    const maxRefreshes = 6; // 6 refrescos * 5 segundos = 30 segundos

    if (user && !authLoading) {
      refreshInterval = setInterval(async () => {
        if (refreshCount >= maxRefreshes) {
          if (refreshInterval) clearInterval(refreshInterval);
          return;
        }
        
        refreshCount++;
        console.log(`Refreshing pets data (attempt ${refreshCount}/${maxRefreshes})...`);
        
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!petsError && petsData) {
          setPets(petsData);
        }
      }, 5000); // Refrescar cada 5 segundos
    }

    // Cleanup: desuscribirse y limpiar intervalos cuando el componente se desmonte
    return () => {
      if (petsSubscription) {
        petsSubscription.unsubscribe();
      }
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [user, authLoading]);

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-sage-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-sage-light">
      {/* Header */}
      <header className="bg-background border-b shadow-soft">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">PetCare</span>
          </div>
          <div className="flex items-center gap-4">
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t.dashboard.welcomeBack}
            </h1>
            <p className="text-muted-foreground">
              {t.dashboard.todayOverview}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.dashboard.totalPetsLabel}
                </CardTitle>
                <PawPrint className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{pets.length}</div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.dashboard.upcomingRemindersLabel}
                </CardTitle>
                <Calendar className="h-4 w-4 text-coral" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-coral">{reminders.length}</div>
                <p className="text-xs text-muted-foreground">{t.dashboard.next7Days}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.dashboard.aiAnalysisLabel}
                </CardTitle>
                <Camera className="h-4 w-4 text-sage" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sage">{aiResults.length}</div>
                <p className="text-xs text-muted-foreground">{t.dashboard.thisWeek}</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t.dashboard.healthTrendLabel}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{t.dashboard.good}</div>
                <p className="text-xs text-muted-foreground">{t.dashboard.allPetsHealthy}</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">{t.dashboard.quickActions}</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="hero" className="flex items-center gap-2" asChild>
                <Link to="/add-pet">
                  <Plus className="h-4 w-4" />
                  {t.dashboard.addPet}
                </Link>
              </Button>
              <Button variant="coral" className="flex items-center gap-2" asChild>
                <Link to="/upload-image">
                  <Camera className="h-4 w-4" />
                  {t.dashboard.uploadImage}
                </Link>
              </Button>
              <Button variant="outline" className="flex items-center gap-2" asChild>
                <Link to="/analyze-pet-health">
                  <Camera className="h-4 w-4" />
                  {t.dashboard.analyzePetHealth}
                </Link>
              </Button>
              <Button variant="sage" className="flex items-center gap-2" asChild>
                <Link to="/create-reminder">
                  <Calendar className="h-4 w-4" />
                  {t.dashboard.createReminder}
                </Link>
              </Button>
              <Button variant="outline" className="flex items-center gap-2" asChild>
                <Link to="/ask-assistant">
                  <MessageCircle className="h-4 w-4" />
                  {t.dashboard.askAssistant}
                </Link>
              </Button>
              <Button variant="outline" className="flex items-center gap-2" asChild>
                <Link to="/weight-tracking">
                  <TrendingUp className="h-4 w-4" />
                  {t.dashboard.weightTracking}
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* My Pets */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PawPrint className="h-5 w-5 text-primary" />
                  {t.dashboard.myPets}
                </CardTitle>
                <CardDescription>{t.dashboard.managePets}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">{t.dashboard.loadingPets}</div>
                  </div>
                ) : pets.length === 0 ? (
                  <div className="text-center py-8">
                    <PawPrint className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t.dashboard.noPetsRegistered}
                    </p>
                    <Button variant="outline" asChild>
                      <Link to="/add-pet">
                        <Plus className="h-4 w-4 mr-2" />
                        {t.dashboard.addFirstPet}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  pets.map((pet) => (
                    <div key={pet.id} className="flex items-center gap-4 p-4 rounded-lg bg-sage-light hover:shadow-soft transition-shadow">
                      <div className="relative">
                        {pet.photo_url ? (
                          <img 
                            src={pet.photo_url} 
                            alt={pet.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-primary/20"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-sage flex items-center justify-center text-2xl">
                            {pet.species === 'dog' ? '🐕' : '🐱'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{pet.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {pet.breed} • {(() => {
                            // La edad se almacena en meses (nuevo formato) o años (formato antiguo)
                            // Usamos el flag age_in_months para determinar el formato
                            let ageInMonths = pet.age || 0;
                            
                            // Si age_in_months es false, null o undefined, la edad está en años (formato antiguo)
                            // Si es true, la edad ya está en meses (formato nuevo)
                            // Si es undefined (migración no ejecutada), asumimos años para compatibilidad
                            if (pet.age_in_months !== true) {
                              // Formato antiguo: convertir años a meses
                              ageInMonths = ageInMonths * 12;
                            }
                            // Si age_in_months es true, ya está en meses, no hacemos conversión
                            
                            // Mostrar la edad
                            if (ageInMonths < 12) {
                              return `${ageInMonths} ${t.dashboard.months}`;
                            } else {
                              const years = Math.floor(ageInMonths / 12);
                              const months = ageInMonths % 12;
                              if (months === 0) {
                                return `${years} ${t.dashboard.years}`;
                              } else {
                                return `${years} ${t.dashboard.years} ${months} ${t.dashboard.months}`;
                              }
                            }
                          })()}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {pet.weight && (
                            <Badge variant="secondary" className="text-xs">
                              {t.dashboard.weight}: {pet.weight} kg
                            </Badge>
                          )}
                          {/* Mostrar Patient ID de FHIR si existe */}
                          {pet.fhir_patient_id && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                              FHIR ID: {pet.fhir_patient_id}
                            </Badge>
                          )}
                        </div>
                        {/* Enlaces a HAPI FHIR si existe Patient ID */}
                        {pet.fhir_patient_id && (
                          <div className="flex items-center gap-2 mt-2">
                            <a
                              href={`https://hapi.fhir.org/baseR4/Patient/${pet.fhir_patient_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {t.dashboard.seePatient}
                            </a>
                            <span className="text-xs text-muted-foreground">•</span>
                            <a
                              href={`https://hapi.fhir.org/baseR4/Observation?subject=Patient/${pet.fhir_patient_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Activity className="h-3 w-3" />
                              {t.dashboard.seeObservations}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/edit-pet/${pet.id}`}>
                            {t.edit}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/add-pet">
                    <Plus className="h-4 w-4 mr-2" />
                    {t.dashboard.addNewPet}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Upcoming Reminders */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-coral" />
                  {t.dashboard.upcomingReminders}
                </CardTitle>
                <CardDescription>{t.dashboard.upcomingRemindersDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="text-muted-foreground">{t.dashboard.loadingReminders}</div>
                  </div>
                ) : reminders.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t.dashboard.noReminders}
                    </p>
                  </div>
                ) : (
                  reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center gap-4 p-4 rounded-lg bg-coral-light hover:shadow-soft transition-shadow">
                      <div className="w-10 h-10 rounded-full bg-coral flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{reminder.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {reminder.pets?.name || t.dashboard.general} • {parseDateString(reminder.reminder_date).toLocaleDateString()}
                          {reminder.reminder_time && ` ${t.dashboard.at} ${reminder.reminder_time}`}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={async () => {
                          const { error } = await supabase
                            .from('reminders')
                            .update({ completed: true })
                            .eq('id', reminder.id);
                          
                          if (!error) {
                            setReminders(reminders.filter(r => r.id !== reminder.id));
                          }
                        }}
                      >
                        {t.dashboard.markAsDone}
                      </Button>
                    </div>
                  ))
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/calendar">
                    {t.dashboard.viewAllReminders}
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Recent AI Results */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-sage" />
                  {t.dashboard.recentAIResults}
                </CardTitle>
                <CardDescription>{t.dashboard.recentAIResultsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {aiResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t.dashboard.noAIResults}
                    </p>
                    <Button variant="outline" asChild>
                      <Link to="/analyze-pet-health">
                        <Camera className="h-4 w-4 mr-2" />
                        {t.dashboard.analyzePetHealth}
                      </Link>
                    </Button>
                  </div>
                ) : (
                  aiResults.map((result) => (
                    <div key={result.id} className="flex items-center gap-4 p-4 rounded-lg bg-sage-light hover:shadow-soft transition-shadow">
                      <div className="w-10 h-10 rounded-full bg-sage flex items-center justify-center">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {result.analysis_result?.result || t.dashboard.analysisComplete}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t.dashboard.pet}: {result.pet_id || 'N/A'} • {t.dashboard.confidence}: {result.confidence ? `${Math.round(result.confidence < 1 ? result.confidence * 100 : result.confidence)}%` : 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(result.created_at).toLocaleDateString()}
                        </p>
                        {result.recommendations && (
                          Array.isArray(result.recommendations) ? result.recommendations.length > 0 : 
                          typeof result.recommendations === 'string' && result.recommendations.length > 0
                        ) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t.dashboard.recommendations}: {Array.isArray(result.recommendations) 
                              ? translateRecommendations(result.recommendations, language).slice(0, 2).join(', ') 
                              : typeof result.recommendations === 'string' 
                                ? translateRecommendations([result.recommendations], language)[0]
                                : result.recommendations}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {aiResults.length > 0 && (
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/analyze-pet-health">
                      <Camera className="h-4 w-4 mr-2" />
                      {t.dashboard.analyzePetHealth}
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Vet Notes */}
            <Card className="border-0 shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  {t.dashboard.recentVetNotes}
                </CardTitle>
                <CardDescription>{t.dashboard.recentVetNotesDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="text-muted-foreground">{t.dashboard.loadingVetNotes}</div>
                  </div>
                ) : vetNotes.length === 0 ? (
                  <div className="text-center py-8">
                    <Stethoscope className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t.dashboard.noVetNotes}
                    </p>
                  </div>
                ) : (
                  vetNotes.map((note) => (
                    <div key={note.id} className="flex items-center gap-4 p-4 rounded-lg bg-primary-light hover:shadow-soft transition-shadow">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <Stethoscope className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{note.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {note.pets?.name || t.dashboard.general} • {note.veterinarian_name || t.dashboard.veterinarian}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {note.visit_date ? new Date(note.visit_date).toLocaleDateString() : new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {note.file_url && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              // Navegar al Ask Assistant con el PDF cargado
                              const params = new URLSearchParams({
                                pdfUrl: note.file_url,
                                title: note.title,
                                petName: note.pets?.name || t.dashboard.general,
                                petId: note.pet_id || ''
                              });
                              navigate(`/ask-assistant?${params.toString()}`);
                            }}
                          >
                            <Bot className="h-4 w-4 mr-1" />
                            {t.dashboard.analyzeWithAssistant}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/upload-vet-note">
                    <Stethoscope className="h-4 w-4 mr-2" />
                    {t.dashboard.uploadNewDocument}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;