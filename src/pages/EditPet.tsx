import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Save, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  age: number;
  weight: number | null;
  last_vaccine: string | null;
  photo_url: string | null;
}

export default function EditPet() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    species: "",
    breed: "",
    ageYears: "",
    ageMonths: "",
    weight: "",
    last_vaccine: "",
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      console.log('EditPet: Auth still loading...');
      return;
    }
    
    if (!user) {
      console.log('EditPet: No user found, redirecting to login');
      navigate('/login');
      return;
    }
    
    if (!id) {
      console.log('EditPet: No pet ID provided, redirecting to dashboard');
      navigate('/dashboard');
      return;
    }
    
    console.log('EditPet: User authenticated:', user.email);
    fetchPet();
  }, [user, authLoading, id, navigate]);

  const fetchPet = async () => {
    if (!user || !id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching pet:', error);
      toast({
        title: "Error",
        description: t.petForm.loadingPetInfo,
        variant: "destructive",
      });
      navigate('/dashboard');
    } else {
      setPet(data);
      // La edad se almacena en meses (nuevo formato) o años (formato antiguo)
      // Usamos el flag age_in_months para determinar el formato
      let ageInMonths = data.age || 0;
      
      // Si age_in_months es false, null o undefined, la edad está en años (formato antiguo)
      // Si es true, la edad ya está en meses (formato nuevo)
      // Si es undefined (migración no ejecutada), asumimos años para compatibilidad
      if (data.age_in_months !== true) {
        // Formato antiguo: convertir años a meses
        ageInMonths = ageInMonths * 12;
      }
      
      // Separar en años y meses
      const years = Math.floor(ageInMonths / 12);
      const months = ageInMonths % 12;
      
      setFormData({
        name: data.name || "",
        species: data.species || "",
        breed: data.breed || "",
        ageYears: years.toString(),
        ageMonths: months.toString(),
        weight: data.weight?.toString() || "",
        last_vaccine: data.last_vaccine || "",
      });
    }
    setLoading(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !id) return;

    const years = parseInt(formData.ageYears) || 0;
    const months = parseInt(formData.ageMonths) || 0;
    
    if (!formData.name.trim() || !formData.species.trim() || !formData.breed.trim() || (years === 0 && months === 0)) {
      toast({
        title: t.petForm.missingInfo,
        description: t.petForm.fillAllFields,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Convertir edad a meses para almacenar en la base de datos
      // Sumamos años * 12 + meses
      const ageInMonths = (years * 12) + months;
      
      const updateData = {
        name: formData.name.trim(),
        species: formData.species.trim(),
        breed: formData.breed.trim(),
        age: ageInMonths, // Almacenamos en meses
        age_in_months: true, // Indicamos que la edad está en meses
        weight: formData.weight ? parseFloat(formData.weight) : null,
        last_vaccine: formData.last_vaccine || null,
      };

      const { error } = await supabase
        .from('pets')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: t.petForm.success,
        description: t.petForm.petInfoUpdated,
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: error.message || t.petForm.errorUpdatingPet,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !id) return;

    setDeleting(true);

    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: t.petForm.success,
        description: `${pet?.name} ${t.petForm.petDeletedDescription}`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error.message || t.petForm.errorDeletingPet,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t.petForm.loadingPetInfo}</p>
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">{t.petForm.petNotFound}</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            {t.petForm.backToDashboard}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">{t.petForm.editPet}</h1>
        </div>

        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {t.petForm.editPetInfo} {pet.name}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deleting}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t.petForm.deletePet}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t.petForm.deletePet}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t.petForm.deletePetConfirm} {pet.name}? {t.petForm.deletePetWarning}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          {t.petForm.deleting}
                        </>
                      ) : (
                        t.petForm.deletePet
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t.petForm.petNameRequired}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder={t.petForm.petNamePlaceholderEdit}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="species">{t.petForm.species} *</Label>
                  <Select value={formData.species} onValueChange={(value) => handleInputChange('species', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.petForm.selectSpecies} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dog">{t.petForm.dog}</SelectItem>
                      <SelectItem value="cat">{t.petForm.cat}</SelectItem>
                      <SelectItem value="bird">{t.petForm.other}</SelectItem>
                      <SelectItem value="rabbit">{t.petForm.other}</SelectItem>
                      <SelectItem value="fish">{t.petForm.other}</SelectItem>
                      <SelectItem value="reptile">{t.petForm.other}</SelectItem>
                      <SelectItem value="other">{t.petForm.other}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="breed">{t.petForm.breed} *</Label>
                  <Input
                    id="breed"
                    value={formData.breed}
                    onChange={(e) => handleInputChange('breed', e.target.value)}
                    placeholder={t.petForm.breedPlaceholderEdit}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">{t.petForm.age} *</Label>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Input
                        id="ageYears"
                        type="number"
                        min="0"
                        max="30"
                        value={formData.ageYears}
                        onChange={(e) => handleInputChange('ageYears', e.target.value)}
                        placeholder={t.petForm.agePlaceholderYears}
                      />
                      <Label htmlFor="ageYears" className="text-xs text-muted-foreground mt-1 block">
                        {t.petForm.ageInYears}
                      </Label>
                    </div>
                    <div className="flex-1">
                      <Input
                        id="ageMonths"
                        type="number"
                        min="0"
                        max="11"
                        value={formData.ageMonths}
                        onChange={(e) => handleInputChange('ageMonths', e.target.value)}
                        placeholder={t.petForm.agePlaceholderMonths}
                      />
                      <Label htmlFor="ageMonths" className="text-xs text-muted-foreground mt-1 block">
                        {t.petForm.ageInMonths}
                      </Label>
                    </div>
                  </div>
                  {(parseInt(formData.ageYears) || 0) === 0 && (parseInt(formData.ageMonths) || 0) === 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t.petForm.ageRequired || "Ingresa al menos años o meses"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">{t.petForm.weight}</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    placeholder={t.petForm.weightPlaceholderEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_vaccine">{t.petForm.lastVaccineDate}</Label>
                  <Input
                    id="last_vaccine"
                    type="date"
                    value={formData.last_vaccine}
                    onChange={(e) => handleInputChange('last_vaccine', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.petForm.saving}
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {t.petForm.saveChanges}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                  {t.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}