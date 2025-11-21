import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/dashboard`;
      
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: formData.name,
            phone: formData.phone,
            role: "owner",
          }
        }
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: t.auth.accountExists,
            description: t.auth.accountExistsDescription,
            variant: "destructive",
          });
        } else {
          toast({
            title: t.auth.registrationFailed,
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: t.auth.registrationSuccess,
        description: t.auth.registrationSuccessDescription,
      });

      // Redirect to login page after successful registration
      navigate("/login");
      
    } catch (error) {
      console.error("Registration error:", error);
      toast({
        title: t.auth.registrationFailed,
        description: t.auth.unexpectedError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  return (
    <main className="min-h-screen bg-gradient-to-br from-sage-light to-coral-light flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <Heart className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold text-primary">PetCare</span>
          </Link>
          <p className="text-muted-foreground">{t.auth.startJourney}</p>
        </div>

        {/* Registration Form */}
        <Card className="shadow-floating border-0">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-primary">{t.auth.register}</CardTitle>
            <CardDescription>
              {t.auth.registerDescription}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.auth.fullName}</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t.auth.namePlaceholder}
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                  className="transition-all focus:ring-primary"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.auth.emailPlaceholder}
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  required
                  className="transition-all focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground">
                  {t.auth.emailDescription}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t.auth.password}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.auth.passwordCreatePlaceholder}
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    required
                    className="pr-12 transition-all focus:ring-primary"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t.auth.phoneLabel}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t.auth.phonePlaceholder}
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="transition-all focus:ring-primary"
                />
              </div>


              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? t.auth.creatingAccount : t.auth.register}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t.auth.hasAccount}{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  {t.auth.signIn}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          {t.auth.registerTermsAndPrivacy}
        </p>
      </div>
    </main>
  );
};

export default Register;