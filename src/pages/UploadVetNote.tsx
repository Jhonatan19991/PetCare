import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { 
  Heart, 
  ArrowLeft, 
  Upload, 
  FileText, 
  Calendar as CalendarIcon,
  Stethoscope
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { format } from "date-fns";
import { es, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { assistantService } from "@/services/assistantService";

const UploadVetNote = () => {
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const [pets, setPets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fillingWithAI, setFillingWithAI] = useState(false);
  const [visitDate, setVisitDate] = useState<Date>();
  
  const dateLocale = language === 'es' ? es : enUS;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
      return;
    }
  }, [user, authLoading, navigate]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    pet_id: '',
    veterinarian_name: '',
    file: null as File | null
  });

  useEffect(() => {
    const fetchPets = async () => {
      if (!user) return;
      
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
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is PDF
      if (file.type !== 'application/pdf') {
        toast({
          title: t.vetNotes.invalidFileType,
          description: t.vetNotes.invalidFileTypeDescription,
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t.vetNotes.fileTooLarge,
          description: t.vetNotes.fileTooLargeDescription,
          variant: "destructive",
        });
        return;
      }
      
      setFormData({ ...formData, file });
    }
  };

  const uploadFile = async (file: File) => {
    if (!user) throw new Error('User not authenticated');
    
    const fileExt = 'pdf';
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('vet-documents')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('vet-documents')
      .getPublicUrl(filePath);

    console.log('Generated PDF URL:', data.publicUrl);
    return data.publicUrl;
  };

  const handleFillDescriptionWithAI = async () => {
    if (!user) return;
    if (!formData.file) {
      toast({
        title: t.vetNotes.documentRequired,
        description: t.vetNotes.documentRequiredDescription,
        variant: "destructive",
      });
      return;
    }
    if (!formData.title.trim()) {
      toast({
        title: t.vetNotes.titleRequiredForAI,
        description: t.vetNotes.titleRequiredForAIDescription,
        variant: "destructive",
      });
      return;
    }

    setFillingWithAI(true);
    try {
      const selectedPet = pets.find((p) => p.id === formData.pet_id);
      const petName = selectedPet?.name || '';
      const resp = await assistantService.analyzePdfFile(
        formData.file,
        formData.title,
        petName,
        user.id,
        formData.pet_id || undefined
      );

      if (resp.success && resp.data?.response) {
        setFormData({ ...formData, description: resp.data.response });
        toast({ title: t.vetNotes.descriptionGenerated, description: t.vetNotes.descriptionGeneratedDescription });
      } else {
        toast({
          title: t.vetNotes.couldNotGenerate,
          description: resp.error || t.vetNotes.couldNotGenerateDescription,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('AI fill error:', error);
      toast({
        title: t.vetNotes.aiError,
        description: t.vetNotes.aiErrorDescription,
        variant: "destructive",
      });
    } finally {
      setFillingWithAI(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.title.trim()) {
      toast({
        title: t.vetNotes.missingInfo,
        description: t.vetNotes.titleRequired,
        variant: "destructive",
      });
      return;
    }

    if (!formData.pet_id) {
      toast({
        title: t.vetNotes.petRequired,
        description: t.vetNotes.petRequiredDescription,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;

      // Upload file if provided
      if (formData.file) {
        fileUrl = await uploadFile(formData.file);
        fileName = formData.file.name;
        fileSize = formData.file.size;
      }

      // Save vet note to database
      const { data: vetNote, error } = await supabase
        .from('vet_notes')
        .insert({
          user_id: user.id,
          pet_id: formData.pet_id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          veterinarian_name: formData.veterinarian_name.trim() || null,
          visit_date: visitDate?.toISOString().split('T')[0] || null,
          file_url: fileUrl,
          file_name: fileName,
          file_size: fileSize
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // If a file was uploaded, send it to the webhook for processing
      if (fileUrl && vetNote) {
        try {
          const { error: webhookError } = await supabase.functions.invoke('process-vet-document', {
            body: {
              fileUrl: fileUrl,
              vetNoteId: vetNote.id,
              webhookUrl: null // You can add a webhook URL here when ready
            }
          });

          if (webhookError) {
            console.error('Webhook processing error:', webhookError);
            // Don't fail the entire upload if webhook fails
          }
        } catch (webhookError) {
          console.error('Webhook processing error:', webhookError);
          // Don't fail the entire upload if webhook fails
        }
      }

      toast({
        title: t.vetNotes.success,
        description: t.vetNotes.uploadSuccess,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error uploading vet note:', error);
      toast({
        title: t.vetNotes.uploadFailed,
        description: t.vetNotes.uploadFailedDescription,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t.vetNotes.uploadVetNote}
            </h1>
            <p className="text-muted-foreground">
              {t.vetNotes.uploadVetNoteDescription}
            </p>
          </div>

          <Card className="border-0 shadow-card">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  {t.vetNotes.document}
                </CardTitle>
                <CardDescription>
                  {t.vetNotes.documentDescription}
                </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">{t.vetNotes.titleLabel}</Label>
                  <Input
                    id="title"
                    placeholder={t.vetNotes.titlePlaceholder}
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pet">{t.vetNotes.petLabel}</Label>
                  <Select 
                    value={formData.pet_id} 
                    onValueChange={(value) => setFormData({ ...formData, pet_id: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.vetNotes.petPlaceholder} />
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

                <div className="space-y-2">
                  <Label htmlFor="veterinarian">{t.vetNotes.veterinarianLabel}</Label>
                  <Input
                    id="veterinarian"
                    placeholder={t.vetNotes.veterinarianPlaceholder}
                    value={formData.veterinarian_name}
                    onChange={(e) => setFormData({ ...formData, veterinarian_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t.vetNotes.visitDateLabel}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !visitDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {visitDate ? format(visitDate, "PPP", { locale: dateLocale }) : <span>{t.vetNotes.visitDatePlaceholder}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={visitDate}
                        onSelect={setVisitDate}
                        locale={dateLocale}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">{t.vetNotes.descriptionLabel}</Label>
                  <Textarea
                    id="description"
                    placeholder={t.vetNotes.descriptionPlaceholder}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleFillDescriptionWithAI}
                      disabled={fillingWithAI || !formData.file}
                    >
                      {fillingWithAI ? t.vetNotes.generating : t.vetNotes.fillWithAI}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="file">{t.vetNotes.uploadPDFLabel}</Label>
                  <div className="border-2 border-dashed border-sage/20 rounded-lg p-6 text-center hover:border-sage/40 transition-colors">
                    <input
                      id="file"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Label htmlFor="file" className="cursor-pointer">
                      <div className="flex flex-col items-center gap-2">
                        {formData.file ? (
                          <>
                            <FileText className="h-8 w-8 text-sage" />
                            <span className="text-sm font-medium text-foreground">
                              {formData.file.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {t.vetNotes.clickToUpload}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {t.vetNotes.pdfUpTo}
                            </span>
                          </>
                        )}
                      </div>
                    </Label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    asChild
                  >
                    <Link to="/dashboard">{t.vetNotes.cancel}</Link>
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={uploading || !formData.title.trim()}
                  >
                    {uploading ? (
                      t.vetNotes.uploading
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        {t.vetNotes.uploadNote}
                      </>
                    )}
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

export default UploadVetNote;