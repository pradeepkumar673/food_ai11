const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const path = require('path'); // Add this for serving static files
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000; // Changed default to 10000 for Render

// Rate limiting - Adjusted for production
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 200 : 1000, // More generous for production
  message: { 
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    usingFallback: true,
    message: 'Rate limit reached, using fallback recipes'
  },
  skipSuccessfulRequests: false, // Changed to count all requests
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure CORS for production and development
const allowedOrigins = ['https://pradeeps-food-guide-frontend.onrender.com'];
if (process.env.NODE_ENV === 'development') {
  allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
}
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In production, be strict about CORS
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true); // Allow in development
      }
    }
  },
  credentials: true
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
    }
  }
}));
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/', limiter);

// MongoDB connection with better error handling
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/foodguide', mongoOptions)
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err.message);
  console.log('⚠️  Running in fallback mode without database');
});

// Health check with API status - Enhanced for production
app.get('/api/health', (req, res) => {
  const apiStatus = {
    spoonacular: !!process.env.SPOONACULAR_API_KEY && process.env.SPOONACULAR_API_KEY.length > 20,
    gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 30,
    cohere: !!process.env.COHERE_API_KEY && process.env.COHERE_API_KEY.length > 20,
    openrouter: !!process.env.OPEN_ROUTER_API_KEY && process.env.OPEN_ROUTER_API_KEY.length > 20,
    mongodb: mongoose.connection.readyState === 1
  };
  
  const isHealthy = apiStatus.mongodb || !apiStatus.mongodb; // MongoDB optional for now
  const status = isHealthy ? 'healthy' : 'degraded';
  
  res.json({ 
    status: status,
    message: 'API is running',
    timestamp: new Date().toISOString(),
    apis: apiStatus,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    fallbackMode: !apiStatus.spoonacular && !apiStatus.gemini
  });
});

// API Routes
const recipeRoutes = require('./routes/recipes');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

app.use('/api/recipes', recipeRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Route to test API fallback
app.get('/api/test-fallback', async (req, res) => {
  const { ingredient } = req.query;
  
  const apiStatus = {
    spoonacular: !!process.env.SPOONACULAR_API_KEY && process.env.SPOONACULAR_API_KEY.length > 20,
    gemini: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 30,
    cohere: !!process.env.COHERE_API_KEY && process.env.COHERE_API_KEY.length > 20,
    openrouter: !!process.env.OPEN_ROUTER_API_KEY && process.env.OPEN_ROUTER_API_KEY.length > 20,
  };
  
  console.log('🧪 Testing fallback system...');
  
  res.json({
    success: true,
    message: 'Fallback test',
    apis: apiStatus,
    fallbackOrder: ['Spoonacular API', 'Gemini AI', 'Cohere AI', 'OpenRouter (Mistral)', 'Local Recipes'],
    testIngredients: ingredient || 'chicken, rice, egg',
    instructions: 'Use /api/recipes/search?ingredients=your_ingredients to test',
    note: 'All AI APIs are FREE to use'
  });
});

// Emergency recipe endpoint when all else fails
app.get('/api/emergency-recipes', (req, res) => {
  const { ingredients } = req.query;
  const ingredientList = ingredients ? ingredients.split(',').map(i => i.trim()) : ['food'];
  
  console.log('🆘 Emergency recipes triggered');
  
  const emergencyRecipes = [
    {
      id: 99991,
      title: 'Simple Kitchen Creation',
      description: 'Emergency fallback recipe',
      image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop&q=80',
      prepTime: 15,
      servings: 2,
      matchPercentage: 85,
      ingredients: ingredientList,
      instructions: [
        'Prepare your ingredients',
        'Combine creatively',
        'Season to taste',
        'Cook as needed',
        'Serve and enjoy'
      ],
      source: 'emergency_backup'
    },
    {
      id: 99992,
      title: 'Quick Ingredient Mix',
      description: 'Simple combination of your items',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=312&h=231&fit=crop&q=80',
      prepTime: 10,
      servings: 1,
      matchPercentage: 90,
      ingredients: ingredientList.slice(0, 3),
      instructions: [
        'Wash and prepare ingredients',
        'Mix together in a bowl',
        'Add basic seasonings',
        'Serve immediately'
      ],
      source: 'emergency_backup'
    }
  ];
  
  res.json({
    success: true,
    message: 'Emergency recipes served',
    source: 'emergency_backup',
    ingredients: ingredientList,
    recipes: emergencyRecipes,
    note: 'This is a fallback when all other APIs fail',
    timestamp: new Date().toISOString()
  });
});

// Serve static files in production (optional - if you want to serve frontend from backend)
if (process.env.NODE_ENV === 'production') {
  // Serve static files from the frontend build directory
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  // Handle SPA routing - return index.html for all unknown routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
} else {
  // 404 handler for development
  app.use('*', (req, res) => {
    console.log(`❌ Route not found: ${req.originalUrl}`);
    
    // If it looks like a recipe request, suggest the search endpoint
    if (req.originalUrl.includes('recipe') || req.originalUrl.includes('ingredient')) {
      return res.status(404).json({ 
        success: false,
        error: 'Route not found',
        suggestion: 'Try /api/recipes/search?ingredients=your_ingredients',
        fallback: 'Or use /api/emergency-recipes?ingredients=your_ingredients'
      });
    }
    
    res.status(404).json({ 
      success: false,
      error: 'Route not found',
      availableRoutes: {
        recipes: '/api/recipes/search?ingredients=chicken,rice',
        health: '/api/health',
        test: '/api/test-fallback',
        emergency: '/api/emergency-recipes?ingredients=your_ingredients'
      }
    });
  });
}

// Error handling with fallback recovery
app.use((err, req, res, next) => {
  console.error('🔥 Server error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method
  });
  
  // If it's a recipe-related error, provide fallback
  if (req.originalUrl.includes('/api/recipes')) {
    return res.status(500).json({
      success: false,
      error: 'Recipe service error',
      fallback: true,
      message: 'Using emergency recipes',
      emergencyEndpoint: '/api/emergency-recipes?ingredients=' + (req.query.ingredients || 'food'),
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Start server with enhanced logging
const server = app.listen(PORT, () => {
  const backendUrl = process.env.NODE_ENV === 'production' 
    ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'localhost:' + PORT}` 
    : `http://localhost:${PORT}`;
  
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     🍳 Pradeep's Food Guide - Recipe Recommender        ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  
🚀 Server running on port ${PORT}
📡 Environment: ${process.env.NODE_ENV || 'development'}
🔗 Backend URL: ${backendUrl}
🔗 Frontend URL: ${frontendUrl}

📊 API STATUS:
${process.env.SPOONACULAR_API_KEY && process.env.SPOONACULAR_API_KEY.length > 20 ? '✅ Spoonacular API: Configured' : '❌ Spoonacular API: Missing or using placeholder'}
${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 30 ? '✅ Gemini API: Configured (FREE)' : '❌ Gemini API: Missing'}
${process.env.COHERE_API_KEY && process.env.COHERE_API_KEY.length > 20 ? '✅ Cohere AI: Configured (FREE)' : '❌ Cohere AI: Missing'}
${process.env.OPEN_ROUTER_API_KEY && process.env.OPEN_ROUTER_API_KEY.length > 20 ? '✅ OpenRouter: Configured (FREE)' : '❌ OpenRouter: Missing'}
${mongoose.connection.readyState === 1 ? '✅ MongoDB: Connected' : '⚠️  MongoDB: Disconnected'}

🔄 FALLBACK SYSTEM:
1️⃣ Spoonacular API (Primary)
2️⃣ Gemini AI (Secondary - FREE) 
3️⃣ Cohere AI (Tertiary - FREE)
4️⃣ OpenRouter Mistral (Backup - FREE)
5️⃣ Local Recipes (Last Resort)

⚠️  NOTE: ${!process.env.SPOONACULAR_API_KEY || process.env.SPOONACULAR_API_KEY.length <= 20 ? 'Spoonacular API not configured. Using FREE AI APIs.' : 'API configured. Using Spoonacular when available.'}
  `);
});

// Graceful shutdown with better logging
const shutdown = (signal) => {
  console.log(`\n🔴 ${signal} received. Shutting down gracefully...`);
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('💥 Forcing shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle uncaught errors
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  console.log('🔄 Continuing in fallback mode...');
  // Don't crash the server in production
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('🔄 Continuing with fallback system...');
});

// Export for testing
module.exports = app;