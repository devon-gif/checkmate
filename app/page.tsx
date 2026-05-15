import { HeroSection } from '@/components/checkmate/HeroSection'
import { HowItWorks } from '@/components/checkmate/HowItWorks'
import { WaysToUse } from '@/components/checkmate/WaysToUse'
import { WhatCanCheck } from '@/components/checkmate/WhatCanCheck'
import { TextFirstDemo } from '@/components/checkmate/TextFirstDemo'
import { FinalCTA } from '@/components/checkmate/FinalCTA'

export default function LandingPage() {
  return (
    <div className="bg-cm-bg text-white">
      {/* Subtle top border accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-cm-green/40 to-transparent" />

      <HeroSection />
      <HowItWorks />
      <WaysToUse />
      <WhatCanCheck />
      <TextFirstDemo />
      <FinalCTA />

      {/* Bottom border accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
}
