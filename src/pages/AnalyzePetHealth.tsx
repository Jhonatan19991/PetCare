import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Upload, AlertCircle, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { uploadPetImage } from "@/services/imageUploadService";
import { skinDiseasePredictionService, getDiseaseDescription, getDiseaseSeverity, getDiseaseRecommendations, translateRecommendations } from "@/services/skinDiseasePredictionService";

interface Pet {
  id: string;
  name: string;
  species: string;
}

interface AnalysisResult {
  result: string;
  confidence: number;
  recommendations: string[];
  conditions?: string[];
  severity?: 'low' | 'medium' | 'high';
  disease?: string;
  probabilities?: { [key: string]: number };
  imageInfo?: {
    filename: string;
    contentType: string;
    sizeBytes: number;
  };
}

export default function AnalyzePetHealth() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { t, language } = useTranslation();
  
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [petType, setPetType] = useState<string>("perros");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    console.log('AnalyzePetHealth useEffect triggered:', { authLoading, user: user?.email });
    
    // Wait for auth to finish loading before checking user
    if (authLoading) {
      console.log('Auth still loading...');
      return;
    }
    
    if (!user) {
      console.log('No user found, redirecting to login');
      navigate('/login');
      return;
    }
    console.log('User authenticated:', user.email);
    fetchPets();
  }, [user, authLoading, navigate]);

  const fetchPets = async () => {
    if (!user) {
      console.log('fetchPets: No user found');
      return;
    }
    
    console.log('fetchPets: Fetching pets for user:', user.id);
    
    const { data, error } = await supabase
      .from('pets')
      .select('id, name, species')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching pets:', error);
      console.error('Pets error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('fetchPets: Successfully fetched pets:', data);
      setPets(data || []);
    }
  };

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
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
      } else {
        toast({
          title: t.analyzeHealth.invalidFileType,
          description: t.analyzeHealth.pleaseSelectImageFile,
          variant: "destructive",
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('image/')) {
        setSelectedFile(file);
      } else {
        toast({
          title: t.analyzeHealth.invalidFileType,
          description: t.analyzeHealth.pleaseSelectImageFile,
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: t.analyzeHealth.authRequired,
        description: t.analyzeHealth.pleaseLogin,
        variant: "destructive",
      });
      return;
    }

    if (!selectedFile) {
      toast({
        title: t.analyzeHealth.imageRequired,
        description: t.analyzeHealth.pleaseSelectImage,
        variant: "destructive",
      });
      return;
    }

    if (pets.length === 0) {
      toast({
        title: t.analyzeHealth.noPets,
        description: t.analyzeHealth.addPetFirst,
        variant: "destructive",
      });
      return;
    }

    if (!selectedPet) {
      toast({
        title: t.analyzeHealth.petSelectionRequired,
        description: t.analyzeHealth.pleaseSelectPet,
        variant: "destructive",
      });
      return;
    }

    if (petType !== "perros" && petType !== "gatos") {
      toast({
        title: t.analyzeHealth.invalidPetType,
        description: t.analyzeHealth.selectDogsOrCats,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setIsAnalyzing(true);

    try {
      // Upload the image
      const uploadResult = await uploadPetImage(selectedFile, user.id, selectedPet);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Create AI analysis record
      const { data: analysisData, error: analysisError } = await supabase
        .from('ai_analyses')
        .insert({
          user_id: user.id,
          pet_id: selectedPet,
          image_url: uploadResult.url!,
          status: 'processing'
        })
        .select()
        .single();

      if (analysisError) {
        throw new Error(analysisError.message);
      }

      // Use the new skin disease prediction API
      const predictionResult = await skinDiseasePredictionService.predictSkinDisease(selectedFile, petType as 'perros' | 'gatos');
      
      if (predictionResult.success && predictionResult.disease) {
        // Generate analysis result from prediction
        const diseaseDescription = getDiseaseDescription(predictionResult.disease, petType as 'perros' | 'gatos');
        const severity = getDiseaseSeverity(predictionResult.disease, predictionResult.confidence || 0);
        const recommendations = getDiseaseRecommendations(predictionResult.disease, petType as 'perros' | 'gatos');

        const isHealthy = predictionResult.disease === 'Sano' || predictionResult.disease === 'sano';
        const analysisResult: AnalysisResult = {
          result: `${t.analyzeHealth.skinAnalysis} ${diseaseDescription}. ${isHealthy ? t.analyzeHealth.noDermatologicalProblems : t.analyzeHealth.recommendConsultingVet}`,
          confidence: predictionResult.confidence || 0, // Ya viene como porcentaje de la API
          recommendations: recommendations,
          conditions: [predictionResult.disease],
          severity: severity,
          disease: predictionResult.disease,
          probabilities: predictionResult.probabilities,
          imageInfo: predictionResult.imageInfo
        };

        // Update the analysis record with results
        const { error: updateError } = await supabase
          .from('ai_analyses')
          .update({
            analysis_result: JSON.parse(JSON.stringify(analysisResult)),
            confidence: analysisResult.confidence,
            recommendations: analysisResult.recommendations,
            status: 'completed'
          })
          .eq('id', analysisData.id);

        if (updateError) {
          console.error('Error updating analysis:', updateError);
        }

        setAnalysisResult(analysisResult);
        setAnalysisId(analysisData.id);
        setShowResults(true);

        toast({
          title: t.analyzeHealth.analysisComplete,
          description: `${t.analyzeHealth.detected} ${predictionResult.disease} (${Math.round(analysisResult.confidence < 1 ? analysisResult.confidence * 100 : analysisResult.confidence)}% ${t.analyzeHealth.confidence})`,
        });
      } else {
        throw new Error(predictionResult.error || t.analyzeHealth.failedToAnalyze);
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: t.analyzeHealth.analysisError,
        description: error.message || t.analyzeHealth.failedToAnalyze,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setIsAnalyzing(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedPet("");
    setAnalysisResult(null);
    setAnalysisId(null);
    setShowResults(false);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">{t.analyzeHealth.title}</h1>
        </div>

        <Card className="border-0 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-coral" />
              {t.analyzeHealth.title}
            </CardTitle>
            <CardDescription>
              {t.analyzeHealth.uploadDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selector de tipo de mascota */}
              <div className="space-y-2">
                <Label htmlFor="pet-type">{t.analyzeHealth.petType}</Label>
                <Select value={petType} onValueChange={setPetType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.analyzeHealth.selectPetType} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="perros">
                      <div className="flex items-center gap-2">
                        <span>🐕</span>
                        <span>{t.analyzeHealth.dogs}</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="gatos">
                      <div className="flex items-center gap-2">
                        <span>🐱</span>
                        <span>{t.analyzeHealth.cats}</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {t.analyzeHealth.selectPetType}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pet">{t.analyzeHealth.selectPet}</Label>
                {pets.length === 0 ? (
                  <div className="p-4 border border-dashed rounded-lg text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {t.analyzeHealth.noPetsFound}
                    </p>
                    <Button variant="outline" size="sm" onClick={() => navigate('/add-pet')}>
                      {t.analyzeHealth.addPet}
                    </Button>
                  </div>
                ) : (
                  <Select value={selectedPet} onValueChange={setSelectedPet}>
                    <SelectTrigger>
                      <SelectValue placeholder={t.analyzeHealth.selectPetPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          {pet.name} ({pet.species})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">{t.analyzeHealth.imageLabel}</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-coral bg-coral-light'
                      : 'border-gray-300 hover:border-coral'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {selectedFile ? (
                    <div className="space-y-2">
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Selected"
                        className="max-w-full max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        {t.delete}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-foreground">
                          {t.analyzeHealth.dragAndDrop}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t.analyzeHealth.orClick}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Formatos: JPG, PNG, BMP, TIFF (recomendado 224x224+ píxeles)
                        </p>
                      </div>
                      <Input
                        id="image"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="max-w-xs mx-auto"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">{t.analyzeHealth.disclaimer.split('.')[0]}</p>
                    <p className="text-amber-700">
                      {t.analyzeHealth.disclaimer}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  type="submit" 
                  disabled={uploading || pets.length === 0 || isAnalyzing} 
                  className="flex-1"
                >
                  {uploading || isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t.analyzeHealth.analyzing}
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      {t.analyzeHealth.title}
                    </>
                  )}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/dashboard')}>
                  {t.analyzeHealth.cancel}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {showResults && analysisResult && (
          <Card className="border-0 shadow-card mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                {t.analyzeHealth.results}
              </CardTitle>
              <CardDescription>
                {t.analyzeHealth.analysisComplete} {pets.find(p => p.id === selectedPet)?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Result */}
              <div className="bg-sage-light rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">{t.analyzeHealth.results}</h3>
                <p className="text-foreground mb-3">{analysisResult.result}</p>
                {analysisResult.confidence && (
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                      {t.analyzeHealth.confidence}: {Math.round(analysisResult.confidence < 1 ? analysisResult.confidence * 100 : analysisResult.confidence)}%
                    </Badge>
                    {analysisResult.severity && (
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSeverityColor(analysisResult.severity)}`}
                      >
                        {t.analyzeHealth.severity} {analysisResult.severity}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Probabilidades de todas las enfermedades */}
                {analysisResult.probabilities && (
                  <div className="mt-4">
                    <h4 className="font-medium text-sm mb-2">{t.analyzeHealth.diagnosisProbabilities}</h4>
                    <div className="space-y-1">
                      {Object.entries(analysisResult.probabilities)
                        .sort(([,a], [,b]) => b - a)
                        .map(([disease, probability]) => (
                          <div key={disease} className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">{disease}:</span>
                            <span className="font-medium">{Math.round(probability * 100)}%</span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                      <strong>{t.dashboard.recommendations}:</strong> {t.analyzeHealth.probabilityNote}
                    </div>
                  </div>
                )}
              </div>

              {/* Conditions Detected */}
              {analysisResult.conditions && analysisResult.conditions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">{t.analyzeHealth.detected}</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.conditions.map((condition, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className={`${getSeverityColor(analysisResult.severity)} border`}
                      >
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-3">{t.dashboard.recommendations}</h3>
                  <ul className="space-y-2">
                    {translateRecommendations(analysisResult.recommendations, language).map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                        <span className="text-sm text-muted-foreground">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={resetForm}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t.analyzeHealth.analyzeAnother}
                </Button>
                <Button 
                  onClick={() => navigate('/dashboard')}
                  className="flex-1"
                >
                  {t.dashboard.title}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}