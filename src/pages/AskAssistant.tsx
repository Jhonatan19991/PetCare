import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageCircle, Send, Loader2, FileText, Bot, PawPrint } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { assistantService } from "@/services/assistantService";
import MarkdownMessage from "@/components/MarkdownMessage";
import { supabase } from "@/integrations/supabase/client";

const AskAssistant = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string | null>(null);
  const [petName, setPetName] = useState<string | null>(null);
  const [petId, setPetId] = useState<string | null>(null);
  const [isAnalyzingPdf, setIsAnalyzingPdf] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [conversation, setConversation] = useState<Array<{role: 'user' | 'assistant', message: string}>>([]);

  // Efecto para cargar mascotas del usuario
  useEffect(() => {
    const fetchPets = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('pets')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) {
        console.error('Error fetching pets:', error);
      } else {
        setPets(data || []);
        // Si hay una mascota, seleccionarla por defecto
        if (data && data.length > 0) {
          setSelectedPetId(data[0].id);
        }
      }
    };

    fetchPets();
  }, [user]);

  // Efecto para inicializar el mensaje de bienvenida
  useEffect(() => {
    if (pets.length > 0 && conversation.length === 0) {
      const selectedPet = pets.find(pet => pet.id === selectedPetId);
      const welcomeMessage = selectedPet 
        ? `${t.assistant.welcomeMessageWithPet} ${selectedPet.name}. ${t.assistant.welcomeMessageWithPetEnd} ${selectedPet.name}?`
        : t.assistant.welcomeMessage;
      
      setConversation([{
        role: 'assistant',
        message: welcomeMessage
      }]);
    }
  }, [pets, selectedPetId, conversation.length, t]);

  // Efecto para manejar parámetros de URL y analizar PDF automáticamente
  useEffect(() => {
    const urlPdfUrl = searchParams.get('pdfUrl');
    const urlTitle = searchParams.get('title');
    const urlPetName = searchParams.get('petName');
    const urlPetId = searchParams.get('petId');

    if (urlPdfUrl && user && !pdfUrl) {
      // Solo ejecutar si no hay un PDF ya cargado
      setPdfUrl(urlPdfUrl);
      setPdfTitle(urlTitle);
      setPetName(urlPetName);
      setPetId(urlPetId);
      
      // Analizar el PDF automáticamente
      analyzePdf(urlPdfUrl, urlTitle, urlPetName, urlPetId);
    }
  }, [searchParams, user, pdfUrl]);

  const analyzePdf = async (pdfUrl: string, title: string | null, petName: string | null, petId: string | null) => {
    if (!user || isAnalyzingPdf) return; // Evitar múltiples análisis simultáneos
    
    setIsAnalyzingPdf(true);
    
    // Agregar mensaje de que está analizando
    setConversation(prev => [...prev, {
      role: 'assistant',
      message: `${t.assistant.analyzingDocument} "${title || t.assistant.title}"${petName ? ` ${t.assistant.for} ${petName}` : ''}...`
    }]);

    try {
      // Usar el webhook de prescripción cuando viene desde el dashboard
      const result = await assistantService.analyzePdfPrescription(
        pdfUrl,
        title || t.assistant.document,
        petName || t.dashboard.pet,
        user.id,
        petId || undefined
      );

      if (result.success && result.data) {
        setConversation(prev => [...prev, {
          role: 'assistant',
          message: result.data!.response
        }]);
      } else {
        throw new Error(result.error || t.assistant.errorAnalyzing);
      }

    } catch (error) {
      console.error('Error analyzing PDF:', error);
      setConversation(prev => [...prev, {
        role: 'assistant',
        message: `${t.assistant.errorAnalyzingDoc} ${error instanceof Error ? error.message : t.assistant.unknownError}. ${t.assistant.tryAgainOrAsk}`
      }]);
    } finally {
      setIsAnalyzingPdf(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !user) return;

    setIsLoading(true);

    // Add user message
    const newConversation = [...conversation, { role: 'user' as const, message: question }];
    setConversation(newConversation);

    try {
      // Determinar qué petId usar: el de la URL (si viene de vet notes) o el seleccionado
      const currentPetId = petId || selectedPetId;
      const currentPetName = petName || pets.find(pet => pet.id === selectedPetId)?.name;

      // Call webhook
      const response = await assistantService.askQuestion({
        userId: user.id,
        question: question,
        conversationId: conversationId || undefined,
        pdfUrl: pdfUrl || "", // Enviar string vacío cuando no hay PDF
        pdfTitle: pdfTitle || undefined,
        petName: currentPetName || undefined,
        petId: currentPetId || undefined
      });

      if (response.success && response.data) {
        // Update conversation ID if provided
        if (response.data.conversationId) {
          setConversationId(response.data.conversationId);
        }
        
        // Add assistant response
        setConversation(prev => [...prev, { 
          role: 'assistant', 
          message: response.data!.response 
        }]);
      } else {
        throw new Error(response.error || 'Failed to get response from assistant');
      }
    } catch (error) {
      console.error('Assistant error:', error);
      toast({
        title: "Error",
        description: "Failed to get response from assistant. Please try again.",
        variant: "destructive",
      });
      
      // Add error message to conversation
      setConversation(prev => [...prev, { 
        role: 'assistant', 
        message: "I'm sorry, I'm having trouble responding right now. Please try again in a moment." 
      }]);
    } finally {
      setIsLoading(false);
      setQuestion("");
    }
  };

  // Show loading if auth is still loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-sage-light flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    navigate('/login');
    return null;
  }

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
            <MessageCircle className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-primary">{t.assistant.careAssistant}</span>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 shadow-card h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t.assistant.chatTitle}
                {pdfUrl && (
                  <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{t.assistant.analyzeDocument} {pdfTitle || t.assistant.document}</span>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                {pdfUrl ? 
                  `${t.assistant.analyzingDocumentVet}${petName ? ` ${t.assistant.for} ${petName}` : ''}. ${t.assistant.canAskQuestions}` :
                  t.assistant.chatDescription
                }
              </CardDescription>
              
              {/* Selector de mascotas - solo mostrar si no hay PDF cargado */}
              {!pdfUrl && pets.length > 0 && (
                <div className="mt-4">
                  <Label htmlFor="pet-select" className="text-sm font-medium">
                    {t.assistant.selectPet}
                  </Label>
                  <Select value={selectedPetId} onValueChange={setSelectedPetId}>
                    <SelectTrigger className="w-full mt-2">
                      <SelectValue placeholder={t.assistant.selectPetPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {pets.map((pet) => (
                        <SelectItem key={pet.id} value={pet.id}>
                          <div className="flex items-center gap-2">
                            <PawPrint className="h-4 w-4" />
                            <span>{pet.name}</span>
                            <span className="text-muted-foreground">({pet.species})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-sage-light rounded-lg max-h-[500px] scrollbar-thin">
                {conversation.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <MarkdownMessage 
                      message={msg.message} 
                      role={msg.role} 
                    />
                  </div>
                ))}
                
                {/* Indicador de análisis en progreso */}
                {isAnalyzingPdf && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-3 rounded-lg bg-background border shadow-soft">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">
                          {t.assistant.analyzingDocument}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder={pdfUrl ? 
                    t.assistant.questionAboutDocument : 
                    t.assistant.askQuestionPlaceholder
                  }
                  className="flex-1"
                  disabled={isLoading || authLoading || isAnalyzingPdf}
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={!question.trim() || isLoading || authLoading || !user || isAnalyzingPdf}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>

              {/* Quick Questions */}
              <div className="mt-4">
                <Label className="text-sm text-muted-foreground">
                  {pdfUrl ? t.assistant.documentQuestions : t.assistant.quickQuestionsLabel}
                </Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {(pdfUrl ? [
                    t.assistant.documentQuestionsList.whatMeans,
                    t.assistant.documentQuestionsList.recommendations,
                    t.assistant.documentQuestionsList.somethingWorrisome,
                    t.assistant.documentQuestionsList.whenToReturn
                  ] : [
                    t.assistant.generalQuestionsList.feedingFrequency,
                    t.assistant.generalQuestionsList.signsOfIllness,
                    t.assistant.generalQuestionsList.exerciseRecommendations,
                    t.assistant.generalQuestionsList.groomingTips
                  ]).map((quickQ) => (
                    <Button
                      key={quickQ}
                      variant="outline"
                      size="sm"
                      onClick={() => setQuestion(quickQ)}
                      className="text-xs"
                      disabled={isLoading || authLoading || isAnalyzingPdf}
                    >
                      {quickQ}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AskAssistant;