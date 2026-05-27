import Hero from '@/components/site/HomePage/Hero'
import StatsBar from '@/components/site/HomePage/StatsBar'
import DemoVideo from '@/components/site/HomePage/DemoVideo'
import Details from '@/components/site/HomePage/Details'
import Features from '@/components/site/HomePage/Features'
import GhostJobSection from '@/components/site/HomePage/GhostJobSection'
import ChromeExtension from '@/components/site/HomePage/ChromeExtension'
import WaysToUse from '@/components/site/HomePage/WaysToUse'
import ScamWatch from '@/components/site/HomePage/ScamWatch'
import Pricing from '@/components/site/HomePage/Pricing'
import TrustDisclaimer from '@/components/site/HomePage/TrustDisclaimer'
import Start from '@/components/site/Start'

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-deep text-white font-helvetica">
      <Hero />
      <StatsBar />
      <DemoVideo />
      <Details />
      <Features />
      <GhostJobSection />
      <ChromeExtension />
      <WaysToUse />
      <ScamWatch />
      <Pricing />
      <TrustDisclaimer />
      <Start />
    </div>
  )
}
