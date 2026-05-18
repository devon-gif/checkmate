import Hero from '@/components/site/HomePage/Hero'
import Details from '@/components/site/HomePage/Details'
import Features from '@/components/site/HomePage/Features'
import ChromeExtension from '@/components/site/HomePage/ChromeExtension'
import WaysToUse from '@/components/site/HomePage/WaysToUse'
import Pricing from '@/components/site/HomePage/Pricing'
import Start from '@/components/site/Start'

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-deep text-white font-helvetica">
      <Hero />
      <Details />
      <Features />
      <ChromeExtension />
      <WaysToUse />
      <Pricing />
      <Start />
    </div>
  )
}
