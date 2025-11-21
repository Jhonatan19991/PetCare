import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Camera, Upload, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { uploadPetImage } from "@/services/imageUploadService";
import { useTranslation } from "@/hooks/useTranslation";

const UploadImage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [selectedPet, setSelectedPet] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pets, setPets] = useState<any[]>([]);

  useEffect(() => {
    const fetchPets = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching pets:', error);
      } else {
        setPets(data || []);
      }
    };

    fetchPets();
  }, [user]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPet || !selectedFile || !user) {
      toast({
        title: t.uploadImage.missingInfo,
        description: t.uploadImage.missingInfoDescription,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload image using the service (supports both Supabase and Azure)
      const uploadResult = await uploadPetImage(selectedFile, user.id, selectedPet);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || t.uploadImage.uploadFailed);
      }

      // Update pet with photo URL
      const { error: updateError } = await supabase
        .from('pets')
        .update({ photo_url: uploadResult.url })
        .eq('id', selectedPet);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: t.uploadImage.profilePictureUpdated,
        description: t.uploadImage.profilePictureUpdatedDesc,
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: t.uploadImage.uploadFailed,
        description: error.message || t.uploadImage.uploadFailedDescription,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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
            <Camera className="h-6 w-6 text-coral" />
            <span className="text-xl font-bold text-coral">{t.uploadImage.pageTitle}</span>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-0 shadow-card">
            <CardHeader>
              <CardTitle>{t.uploadImage.updatePetProfilePicture}</CardTitle>
              <CardDescription>
                {t.uploadImage.updatePetProfilePictureDesc}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="pet">{t.uploadImage.selectPet}</Label>
                  <Select onValueChange={setSelectedPet}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.uploadImage.selectPetPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t.uploadImage.uploadImageLabel}</Label>
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-primary/50"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    
                    {selectedFile ? (
                      <div className="space-y-2">
                        <Upload className="h-8 w-8 text-primary mx-auto" />
                        <p className="text-sm font-medium text-foreground">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.uploadImage.clickToChange}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium text-foreground">
                          {t.uploadImage.dropImageHere}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.uploadImage.supportedFormats}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button type="submit" variant="coral" className="flex-1" disabled={uploading || !selectedPet || !selectedFile}>
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t.uploadImage.uploading}
                      </>
                    ) : (
                      t.uploadImage.updateProfilePicture
                    )}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => navigate("/dashboard")} disabled={uploading}>
                    {t.uploadImage.cancel}
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

export default UploadImage;