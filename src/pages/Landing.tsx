import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Calendar, Camera, Users, MessageCircle, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import heroImage from "@/assets/hero-pets.jpg";
import medicalIcon from "@/assets/medical-icon.jpg";
import calendarIcon from "@/assets/calendar-icon.jpg";
import aiIcon from "@/assets/ai-analysis-icon.jpg";

const Landing = () => {
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-sage-light">
      {/* Navigation */}
      <nav className="w-full px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold text-primary">PetCare</span>
        </div>
        <div className="flex gap-4 items-center">
          <ThemeToggle />
          <LanguageToggle />
          <Button variant="ghost" asChild>
            <Link to="/login">{t.auth.login}</Link>
          </Button>
          <Button variant="coral" asChild>
            <Link to="/register">{t.landing.getStarted}</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-16 text-center">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold text-foreground mb-6">
            {t.landing.title}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t.landing.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="hero" size="lg" asChild>
              <Link to="/register">{t.landing.getStarted}</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/login">{t.auth.login}</Link>
            </Button>
          </div>
          <div className="relative max-w-4xl mx-auto">
            <img
              src={heroImage}
              alt="Happy pets - golden retriever and gray cat together"
              className="rounded-2xl shadow-floating w-full h-auto"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-background">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-4">
            {t.landing.features}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {t.landing.subtitle}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="text-center border-0 shadow-card hover:shadow-floating transition-shadow duration-300">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage-light flex items-center justify-center">
                  <img src={calendarIcon} alt="Calendar with reminders" className="w-8 h-8 rounded" />
                </div>
                <CardTitle className="text-primary">{t.landing.smartReminders}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t.landing.smartRemindersDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-card hover:shadow-floating transition-shadow duration-300">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-coral-light flex items-center justify-center">
                  <img src={medicalIcon} alt="Medical stethoscope with paw" className="w-8 h-8 rounded" />
                </div>
                <CardTitle className="text-primary">{t.landing.healthTracking}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t.landing.healthTrackingDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-card hover:shadow-floating transition-shadow duration-300">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage-light flex items-center justify-center">
                  <img src={aiIcon} alt="AI analysis interface" className="w-8 h-8 rounded" />
                </div>
                <CardTitle className="text-primary">{t.analyzeHealth.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t.landing.healthTrackingDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-card hover:shadow-floating transition-shadow duration-300">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-coral-light flex items-center justify-center">
                  <Users className="w-8 h-8 text-coral" />
                </div>
                <CardTitle className="text-primary">{t.landing.vetCollaboration}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t.landing.vetCollaborationDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-card hover:shadow-floating transition-shadow duration-300">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-sage-light flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-sage" />
                </div>
                <CardTitle className="text-primary">{t.assistant.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t.dashboard.askAssistantDesc}
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center border-0 shadow-card hover:shadow-floating transition-shadow duration-300">
              <CardHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-coral-light flex items-center justify-center">
                  <Shield className="w-8 h-8 text-coral" />
                </div>
                <CardTitle className="text-primary">{t.landing.secureAndPrivate}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  {t.landing.secureAndPrivateDesc}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="px-6 py-16 bg-sage-light">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-12">
            {t.landing.howItWorks}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.landing.step1}</h3>
              <p className="text-muted-foreground">
                {t.landing.step1Desc}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-coral text-accent-foreground flex items-center justify-center text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.landing.step2}</h3>
              <p className="text-muted-foreground">
                {t.landing.step2Desc}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-sage text-primary-foreground flex items-center justify-center text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">{t.landing.step3}</h3>
              <p className="text-muted-foreground">
                {t.landing.step3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16 bg-background text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t.landing.readyToStart}
          </h2>
          <p className="text-muted-foreground mb-8">
            {t.landing.joinThousands}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/register">{t.landing.signUpNow}</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/login">{t.auth.login}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 bg-sage-light border-t">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-primary" />
            <span className="font-bold text-primary">PetCare</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t.landing.footerText}
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Landing;