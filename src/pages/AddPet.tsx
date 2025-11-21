import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, PawPrint } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { fhirApiService } from "@/services/fhirApiService";

const AddPet = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    species: "",
    breed: "",
    ageYears: "",
    ageMonths: "",
    weight: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Error",
        description: t.petForm.mustBeAuthenticated,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Convertir edad a meses para almacenar en la base de datos
      // Sumamos años * 12 + meses
      const years = parseInt(formData.ageYears) || 0;
      const months = parseInt(formData.ageMonths) || 0;
      const ageInMonths = (years * 12) + months;
      
      // Validar que al menos se haya ingresado años o meses
      if (years === 0 && months === 0) {
        toast({
          title: t.petForm.missingInfo || "Error",
          description: t.petForm.ageRequired || "Por favor ingresa la edad (años o meses)",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }
      
      // Guardar en Supabase (comportamiento original)
      // Almacenamos la edad en meses para preservar precisión, especialmente para cachorros
      // Primero insertamos sin fhir_patient_id, luego lo actualizaremos si se crea en FHIR
      const { data: insertedData, error } = await supabase
        .from('pets')
        .insert({
          name: formData.name,
          species: formData.species,
          breed: formData.breed,
          age: ageInMonths, // Almacenamos en meses
          age_in_months: true, // Indicamos que la edad está en meses
          weight: parseFloat(formData.weight) || null,
          last_vaccine: null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // ============================================
      // INTEGRACIÓN FHIR: Crear recursos FHIR directamente desde el frontend
      // ============================================
      /**
       * Después de guardar en Supabase, creamos recursos FHIR en el servidor HAPI FHIR público.
       * 
       * Esto permite que los datos de la mascota estén disponibles en formato estándar HL7 FHIR,
       * lo que facilita la interoperabilidad con otros sistemas de salud.
       * 
       * El servicio fhirApiService se comunica directamente con HAPI FHIR (https://hapi.fhir.org/baseR4)
       * sin necesidad de un servidor intermedio.
       * 
       * La fecha de nacimiento se calcula automáticamente basándose en la edad proporcionada.
       */
      
      // Calcular fecha de nacimiento automáticamente basándose en la edad en meses
      let calculatedBirthDate: string | null = null;
      
      if (ageInMonths > 0 && insertedData) {
        const today = new Date();
        const birthDate = new Date(today);
        // Restar los meses de la fecha actual
        birthDate.setMonth(birthDate.getMonth() - ageInMonths);
        // Formatear como YYYY-MM-DD
        const year = birthDate.getFullYear();
        const month = String(birthDate.getMonth() + 1).padStart(2, '0');
        const day = String(birthDate.getDate()).padStart(2, '0');
        calculatedBirthDate = `${year}-${month}-${day}`;
      }
      
      // Crear recursos FHIR si tenemos edad y por lo tanto fecha de nacimiento calculada
      // Esperamos a que termine para asegurar que el fhir_patient_id se guarde correctamente
      let fhirSuccess = false;
      let fhirErrorMsg: string | null = null;
      
      if (calculatedBirthDate && insertedData) {
        const birthDateForFhir = calculatedBirthDate;
        const petId = insertedData.id;
        
        try {
          // Llamar al servicio FHIR para crear recursos Patient y Observation
          // Este servicio se comunica directamente con HAPI FHIR desde el frontend
          const fhirResult = await fhirApiService.createPetInFhir({
            name: formData.name,
            species: formData.species,
            breed: formData.breed,
            birthDate: birthDateForFhir, // Calculada automáticamente desde la edad
            initialWeight: formData.weight ? parseFloat(formData.weight) : undefined, // Opcional
          });

          // Si la creación fue exitosa, guardar el Patient ID en Supabase
          if (fhirResult.success && fhirResult.patientId) {
            const { error: updateError } = await supabase
              .from('pets')
              .update({ fhir_patient_id: fhirResult.patientId })
              .eq('id', petId);

            if (updateError) {
              console.error('Error guardando fhir_patient_id:', updateError);
              fhirErrorMsg = 'No se pudo vincular con FHIR.';
            } else {
              console.log('✅ fhir_patient_id guardado correctamente:', fhirResult.patientId);
              fhirSuccess = true;
            }
          } else {
            // Si FHIR falla, registramos el error pero no bloqueamos
            console.warn('No se pudo crear el recurso FHIR:', fhirResult.error);
            fhirErrorMsg = fhirResult.error || 'No se pudo crear el recurso FHIR.';
          }
        } catch (fhirError) {
          // Manejo de errores de red o excepciones inesperadas
          // No bloqueamos el flujo principal si falla FHIR
          console.error('Error creating FHIR resources:', fhirError);
          fhirErrorMsg = 'Error al conectar con FHIR.';
        }
      }

      setLoading(false);

      // Mostrar mensaje de éxito (con advertencia si FHIR falló)
      const description = fhirErrorMsg 
        ? `${formData.name} ${t.petForm.petAddedDescription}. Nota: ${fhirErrorMsg}`
        : `${formData.name} ${t.petForm.petAddedDescription}`;
      
      toast({
        title: t.petForm.petAdded,
        description: description,
        variant: fhirErrorMsg ? "default" : "default",
      });
      
      navigate("/dashboard");
    } catch (error) {
      console.error('Error adding pet:', error);
      setLoading(false);
      toast({
        title: "Error",
        description: t.petForm.errorAddingPet,
        variant: "destructive"
      });
    }
  };

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
            <PawPrint className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">{t.petForm.addPet}</span>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle>{t.petForm.addNewPet}</CardTitle>
              <CardDescription>
                {t.petForm.addPetDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">{t.petForm.petName}</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder={t.petForm.petNamePlaceholder}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="species">{t.petForm.species}</Label>
                    <Select onValueChange={(value) => setFormData({...formData, species: value})} required>
                      <SelectTrigger>
                        <SelectValue placeholder={t.petForm.selectSpecies} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dog">{t.petForm.dog}</SelectItem>
                        <SelectItem value="cat">{t.petForm.cat}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="breed">{t.petForm.breed}</Label>
                    <Input
                      id="breed"
                      value={formData.breed}
                      onChange={(e) => setFormData({...formData, breed: e.target.value})}
                      placeholder={t.petForm.breedPlaceholder}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">{t.petForm.age}</Label>
                    <div className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input
                          id="ageYears"
                          type="number"
                          value={formData.ageYears}
                          onChange={(e) => setFormData({...formData, ageYears: e.target.value})}
                          placeholder={t.petForm.agePlaceholderYears}
                          min="0"
                          max="30"
                        />
                        <Label htmlFor="ageYears" className="text-xs text-muted-foreground mt-1 block">
                          {t.petForm.ageInYears}
                        </Label>
                      </div>
                      <div className="flex-1">
                        <Input
                          id="ageMonths"
                          type="number"
                          value={formData.ageMonths}
                          onChange={(e) => setFormData({...formData, ageMonths: e.target.value})}
                          placeholder={t.petForm.agePlaceholderMonths}
                          min="0"
                          max="11"
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
                      value={formData.weight}
                      onChange={(e) => setFormData({...formData, weight: e.target.value})}
                      placeholder={t.petForm.weightPlaceholder}
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" variant="hero" className="flex-1" disabled={loading}>
                    {loading ? t.petForm.adding : t.petForm.addPet}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/dashboard")}>
                    {t.cancel}
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

export default AddPet;