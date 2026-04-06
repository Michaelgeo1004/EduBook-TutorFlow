import Image from "next/image";
import Link from "next/link";
import { UiCard } from "@/components/ui-card";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background font-sans text-foreground overflow-x-hidden">
      <Navbar />

      {/* Hero Section */}
      <section className="relative isolate px-6 pt-24 pb-32 sm:pt-32 lg:px-8">
        {/* Background Accents */}
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-accent to-[#f0f9ff] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-balance text-5xl font-bold tracking-tight sm:text-7xl">
            Empowering Education through <br />
            <span className="text-accent underline decoration-accent/20 underline-offset-8">Modern Tutoring</span>
          </h1>
          <p className="mt-8 text-lg leading-relaxed text-muted sm:text-xl">
            Learn how TutorFlow streamlines scheduling, learning, and <br className="hidden sm:block" />
            growth for educators and students.
          </p>
        </div>
      </section>

      {/* Meet Our Leadership */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight mb-16 text-center sm:text-left">Meet Our Leadership</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Sarah Chen", role: "CEO", img: "/leadership/sarah.png", bio: "Sarah Chen is a pioneer of professional experience, and intuitive technology for growth and content." },
              { name: "Ben Carter", role: "CTO", img: "/leadership/ben.png", bio: "Ben Carter is a brand technology and creative profile, and connect to real-life events and research." },
              { name: "Maya Patel", role: "COO", img: "/leadership/maya.png", bio: "Maya Patel is a leader at of education in management and lead for development solutions." }
            ].map((leader, i) => (
              <UiCard key={i} variant="outline" padding="p-0" className="overflow-hidden bg-white/50 border-stone-100 dark:bg-stone-800/30 group">
                <div className="relative aspect-square w-full">
                  <Image src={leader.img} alt={leader.name} fill className="object-cover transition-transform group-hover:scale-105" />
                </div>
                <div className="p-8">
                  <h3 className="text-xl font-bold text-foreground">{leader.name}</h3>
                  <p className="text-sm font-bold text-accent uppercase tracking-wider mt-1">{leader.role}</p>
                  <p className="mt-4 text-sm text-muted leading-relaxed">{leader.bio}</p>
                </div>
              </UiCard>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
