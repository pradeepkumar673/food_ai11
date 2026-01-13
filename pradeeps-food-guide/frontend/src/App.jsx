import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import SplashScreen from './components/SplashScreen'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Favorites from './pages/Favorites'
import Planner from './pages/Planner'
import Layout from './components/Layout'

function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    // Always show splash screen on initial load
    // Don't check localStorage for now to ensure it always shows
    const splashTimer = setTimeout(() => {
      setShowSplash(false)
    }, 5500) // Total 5.5 seconds including animations

    // Clean up
    return () => {
      clearTimeout(splashTimer)
    }
  }, [])

  const handleSplashComplete = () => {
    setShowSplash(false)
  }

  if (!isMounted) {
    return null
  }

  return (
    <>
      {showSplash && (
        <SplashScreen onComplete={handleSplashComplete} />
      )}
      
      {!showSplash && (
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/planner" element={<Planner />} />
            </Routes>
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#4CAF50',
                  },
                },
                error: {
                  style: {
                    background: '#FF4C4C',
                  },
                },
              }}
            />
          </Layout>
        </Router>
      )}
    </>
  )
}

export default App