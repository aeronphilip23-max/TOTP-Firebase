import { CheckCircle2, Users, Zap } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    icon: CheckCircle2,
    title: "Smart Task Management",
    description:
      "Organize tasks with intuitive boards, lists, and timelines. Set priorities, deadlines, and dependencies to keep your team on track.",
  },
  {
    icon: Users,
    title: "Real-time Collaboration",
    description:
      "Work together seamlessly with live updates, comments, and file sharing. Keep everyone aligned with instant notifications.",
  },
  {
    icon: Zap,
    title: "Powerful Automation",
    description:
      "Automate repetitive tasks and workflows with custom rules. Save time and reduce errors with intelligent automation.",
  },
]

export function Features() {
  return (
    <section id="features" className="border-b border-border bg-muted/30 py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="mb-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything you need to succeed
          </h2>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
            Powerful features designed to help your team work smarter, not harder.
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-border bg-card transition-shadow hover:shadow-lg">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-xl font-semibold">{feature.title}</h3>
                <p className="leading-relaxed text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
