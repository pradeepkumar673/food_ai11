import { useState, useEffect } from 'react'

const SplashScreen = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showContent, setShowContent] = useState(false)

  // 20 Indian languages welcome messages
  const welcomeMessages = [
    // First 19 languages - quick display
    { lang: 'Hindi', text: 'स्वागत हे' },
    { lang: 'Bengali', text: 'স্বাগতম' },
    { lang: 'Marathi', text: 'स्वागत आहे' },
    { lang: 'Urdu', text: 'خوش آمدید' },
    { lang: 'Gujarati', text: 'સ્વાગત છે' },
    { lang: 'Punjabi', text: 'ਜੀ ਆਇਆਂ ਨੂੰ' },
    { lang: 'Assamese', text: 'স্বাগতম' },
    { lang: 'Maithili', text: 'स्वागत अछि' },
    { lang: 'Santali', text: 'ᱥᱟᱵᱟᱥ ᱥᱟᱹᱜᱩᱱ' },
    { lang: 'Kashmiri', text: 'خوش آمدید' },
    { lang: 'Nepali', text: 'स्वागत छ' },
    { lang: 'Sindhi', text: 'خوش آمديد' },
    { lang: 'Konkani', text: 'स्वागत' },
    { lang: 'Dogri', text: 'जी आईए' },
    { lang: 'Manipuri', text: 'ꯑꯣꯏꯕꯤꯒꯦ' },
    { lang: 'Kannada', text: 'ಸ್ವಾಗತ' },
    { lang: 'Malayalam', text: 'സ്വാഗതം' },
    { lang: 'Telugu', text: 'స్వాగతం' },
    // Tamil - shown for 0.5 seconds
    { lang: 'Tamil', text: 'வணக்கம்', duration: 500 }
  ]

  useEffect(() => {
    // Show content after a brief moment
    const showTimer = setTimeout(() => {
      setShowContent(true)
    }, 100)

    return () => clearTimeout(showTimer)
  }, [])

  useEffect(() => {
    if (!showContent) return

    let timeouts = []
    let elapsedTime = 0

    // Show each language message
    welcomeMessages.forEach((message, index) => {
      const delay = index === welcomeMessages.length - 1 ? 500 : 200 // Last one (Tamil) for 0.5s, others 0.2s
      
      timeouts.push(
        setTimeout(() => {
          setCurrentIndex(index)
        }, elapsedTime)
      )
      
      elapsedTime += delay
    })

    // After all messages, complete after 500ms
    timeouts.push(
      setTimeout(() => {
        onComplete()
      }, elapsedTime + 500)
    )

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [showContent, onComplete])

  if (!showContent) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-food-orange"></div>
      </div>
    )
  }

  const currentMessage = welcomeMessages[currentIndex]

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-4">
      {/* Logo Container */}
      <div className="mb-12 relative">
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-food-orange rounded-full opacity-20 blur-2xl"></div>
          
          {/* Logo border */}
          <div className="absolute inset-0 border-4 border-food-orange/30 rounded-full animate-pulse"></div>
          
          {/* Logo content */}
          <div className="relative w-40 h-40 bg-black rounded-full flex items-center justify-center">
            <div className="text-center">
              {/* Try to load logo from public folder */}
              <img 
                src="/light.svg" 
                alt="Pradeep's Food Guide" 
                className="w-32 h-32 mx-auto"
                onError={(e) => {
                  // Fallback if logo doesn't exist
                  e.target.style.display = 'none'
                  const parent = e.target.parentElement
                  parent.innerHTML = `
                    <div class="text-food-orange">
                      <svg class="w-32 h-32 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                      </svg>
                      <div class="text-2xl font-bold mt-2">Food Guide</div>
                    </div>
                  `
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Text */}
      <div className="text-center mb-8">
        <div className="relative">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-4 font-display tracking-wide">
            {currentMessage.text}
          </h1>
          <div className="text-xl text-gray-300">
            <span className="text-food-yellow">{currentMessage.lang}</span>
          </div>
        </div>
      </div>

      {/* Progress Indicator */}
      <div className="w-64 h-1 bg-gray-800 rounded-full overflow-hidden mt-8">
        <div 
          className="h-full bg-gradient-to-r from-food-orange to-food-yellow transition-all duration-300 ease-linear"
          style={{ 
            width: `${((currentIndex + 1) / welcomeMessages.length) * 100}%` 
          }}
        ></div>
      </div>

      {/* Language Counter */}
      <div className="mt-4 text-gray-500 text-sm">
        {currentIndex === welcomeMessages.length - 1 ? (
          <span className="text-food-yellow text-lg animate-pulse">
            நான் பிரதீப் குமார், உங்களை என் பக்கத்திற்கு வரவேற்கிறேன்.
          </span>
        ) : (
          <>
            <span>Language {currentIndex + 1} of {welcomeMessages.length}</span>
            <span className="mx-2">•</span>
            <span>Next: {welcomeMessages[currentIndex + 1]?.lang}</span>
          </>
        )}
      </div>

      {/* Loading Text */}
      <div className="absolute bottom-10 text-gray-400 text-sm">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-food-orange rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-food-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-food-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span>pls wait the website is loading தயவுசெய்து காத்திருங்கள் நண்பரே. ...</span>
        </div>
      </div>
    </div>
  )
}

export default SplashScreen