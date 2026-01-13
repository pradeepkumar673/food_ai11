const express = require('express');
const router = express.Router();
const axios = require('axios');

// Initialize APIs from environment variables
const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const COHERE_API_KEY = process.env.COHERE_API_KEY;
const OPEN_ROUTER_API_KEY = process.env.OPEN_ROUTER_API_KEY;
const GROK_API_KEY = process.env.GROK_API_KEY; // Keep but don't use

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

// Check if APIs are available
const spoonacularAvailable = SPOONACULAR_API_KEY && SPOONACULAR_API_KEY.length > 20;
const geminiAvailable = GEMINI_API_KEY && GEMINI_API_KEY.length > 30;
const cohereAvailable = COHERE_API_KEY && COHERE_API_KEY.length > 20;
const openRouterAvailable = OPEN_ROUTER_API_KEY && OPEN_ROUTER_API_KEY.length > 20;

console.log(`
📊 API AVAILABILITY:
${spoonacularAvailable ? '✅ Spoonacular: Available' : '❌ Spoonacular: Unavailable'}
${geminiAvailable ? '✅ Gemini AI: Available (FREE)' : '❌ Gemini AI: Unavailable'}
${cohereAvailable ? '✅ Cohere AI: Available (FREE)' : '❌ Cohere AI: Unavailable'}
${openRouterAvailable ? '✅ OpenRouter (Mistral): Available (FREE)' : '❌ OpenRouter (Mistral): Unavailable'}
🔄 Fallback order: Spoonacular → Gemini AI → Cohere AI → OpenRouter (Mistral) → Local Recipes
`);

// Helper functions (keep same)
const normalizeIngredient = (ingredient) => {
  return ingredient.toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(?:chopped|diced|sliced|minced|grated|fresh|dried|ground|powdered)\b/gi, '')
    .trim();
};

// Calculate match percentage (keep same)
const calculateMatchPercentage = (userIngredients, recipeIngredients) => {
  if (!recipeIngredients || recipeIngredients.length === 0) return 10;
  if (!userIngredients || userIngredients.length === 0) return 0;

  const userIngSet = new Set(userIngredients.map(normalizeIngredient));

  let matchScore = 0;
  recipeIngredients.forEach(recipeIng => {
    const normalizedRecipeIng = normalizeIngredient(recipeIng);

    // Exact match
    if (userIngSet.has(normalizedRecipeIng)) {
      matchScore += 1.0;
    } else {
      // Check for partial matches
      for (const userIng of userIngSet) {
        if (normalizedRecipeIng.includes(userIng) || userIng.includes(normalizedRecipeIng)) {
          matchScore += 0.6;
          break;
        }
      }
    }
  });

  let percentage = (matchScore / recipeIngredients.length) * 100;

  // Boost for simpler recipes
  if (recipeIngredients.length <= 3) {
    percentage *= 1.2;
  }

  return Math.min(Math.max(Math.round(percentage), 15), 98);
};

// 1. Generate Gemini AI Recipe (FREE)
// 1. Generate Gemini AI Recipe (FREE) - FIXED
// 1. Generate Gemini AI Recipe (FREE) - UPDATED
// Generate Gemini AI Recipe (FREE) - UPDATED WITH CORRECT ENDPOINT
const generateGeminiRecipe = async (ingredients, filter = null) => {
  if (!geminiAvailable) {
    console.log('❌ Gemini AI not available');
    return null;
  }

  try {
    console.log('🤖 Generating Gemini AI recipe (FREE)...');

    const prompt = `Create a simple, practical recipe using ONLY these ingredients: ${ingredients.join(', ')}.
${filter ? `Make it ${filter} (quick, healthy, vegetarian, etc.).` : ''}

IMPORTANT: Return ONLY valid JSON, no other text.

Required JSON format:
{
  "title": "Recipe Name",
  "description": "Brief description (1 sentence)",
  "prepTime": 25,
  "servings": 2,
  "ingredients": ["ingredient1", "ingredient2"],
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "tips": "Optional cooking tip"
}

Make it simple, easy to follow, and practical for home cooking.`;

    // TRY DIFFERENT MODELS - one of these should work
    const modelsToTry = [
      'gemini-1.5-flash',
      'gemini-1.5-pro', 
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp'
    ];

    let response = null;
    let workingModel = null;
    
    for (const model of modelsToTry) {
      try {
        console.log(`   Trying model: ${model}...`);
        
        response = await axios.post(
          `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
          {
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );
        
        workingModel = model;
        console.log(`✅ ${model} worked!`);
        break;
        
      } catch (modelError) {
        console.log(`   ${model} failed: ${modelError.response?.data?.error?.message || modelError.message}`);
        continue;
      }
    }

    if (!response || !workingModel) {
      console.log('❌ All Gemini models failed');
      return null;
    }

    console.log('📝 Gemini AI Response received');

    // Extract text from Gemini response
    const text = response.data.candidates[0].content.parts[0].text.trim();
    
    // Try to parse JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedRecipe = JSON.parse(jsonMatch[0]);
        console.log('✅ Gemini JSON parse successful');
        return {
          ...parsedRecipe,
          source: 'gemini_ai',
          modelUsed: workingModel,
          isFree: true
        };
      }
    } catch (parseError) {
      console.log('❌ Gemini JSON parsing failed:', parseError.message);
    }

    // Fallback: create recipe from text
    return {
      title: `Gemini Recipe with ${ingredients[0] || 'Ingredients'}`,
      description: `Gemini AI-generated recipe using ${ingredients.join(', ')}`,
      prepTime: 25,
      servings: 2,
      ingredients: ingredients,
      instructions: [
        `Prepare ${ingredients.join(' and ')}`,
        'Combine ingredients creatively',
        'Cook using your preferred method',
        'Season to taste',
        'Serve and enjoy'
      ],
      tips: 'Adjust based on what you have available',
      source: 'gemini_ai_text',
      modelUsed: workingModel,
      isFree: true
    };

  } catch (error) {
    console.error('❌ Gemini AI generation error:', error.message);
    if (error.response) {
      console.error('Gemini API response:', error.response.status, error.response.data?.error?.message);
    }
    return null;
  }
};
// 2. Generate Cohere AI Recipe (FREE)
// 2. Generate Cohere AI Recipe (FREE) - FIXED
// 2. Generate Cohere AI Recipe (FREE) - UPDATED to Chat API
// Generate Cohere AI Recipe (FREE) - UPDATED WITH WORKING MODEL
const generateCohereRecipe = async (ingredients, filter = null) => {
  if (!cohereAvailable) {
    console.log('❌ Cohere AI not available');
    return null;
  }

  try {
    console.log('🤖 Generating Cohere AI recipe (FREE)...');

    const prompt = `Create a simple, practical, real-life recipe using only these ingredients or some extras. Include the list of ingredients and step-by-step procedures: ${ingredients.join(', ')}.
${filter ? `Make it ${filter} (quick, healthy, vegetarian, etc.).` : ''}

IMPORTANT: Return ONLY valid JSON, no other text.

Required JSON format:
{
  "title": "Recipe Name",
  "description": "Brief description (1 sentence)",
  "prepTime": 25,
  "servings": 2,
  "ingredients": ["ingredient1", "ingredient2"],
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "tips": "Optional cooking tip"
}`;

    // Use CURRENT WORKING models from the docs
    const modelsToTry = [
      'command-a-03-2025',      // Most performant (newest)
      'command-r7b-12-2024',    // Small & fast
      'command-r-plus-08-2024', // Updated R+
      'command-r-08-2024'       // Updated R
    ];

    let response = null;
    let workingModel = null;
    
    for (const model of modelsToTry) {
      try {
        console.log(`   Trying Cohere model: ${model}...`);
        
        response = await axios.post(
          'https://api.cohere.com/v1/chat',
          {
            model: model,
            message: prompt,
            temperature: 0.7,
            max_tokens: 500
          },
          {
            headers: {
              'Authorization': `Bearer ${COHERE_API_KEY}`,
              'Content-Type': 'application/json',
              'accept': 'application/json'
            },
            timeout: 5000
          }
        );
        
        workingModel = model;
        console.log(`✅ Cohere ${model} worked!`);
        break;
        
      } catch (modelError) {
        console.log(`   ${model} failed: ${modelError.response?.data?.message || modelError.message}`);
        continue;
      }
    }

    if (!response || !workingModel) {
      console.log('❌ All Cohere models failed');
      return null;
    }

    console.log('📝 Cohere AI Response received');

    const text = response.data.text.trim();
    
    // Try to parse JSON
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedRecipe = JSON.parse(jsonMatch[0]);
        console.log('✅ Cohere JSON parse successful');
        return {
          ...parsedRecipe,
          source: 'cohere_ai',
          modelUsed: workingModel,
          isFree: true
        };
      }
    } catch (parseError) {
      console.log('❌ Cohere JSON parsing failed');
    }

    // Fallback
    return {
      title: `Cohere Recipe with ${ingredients[0] || 'Ingredients'}`,
      description: `Cohere AI-generated recipe using ${ingredients.join(', ')}`,
      prepTime: 25,
      servings: 2,
      ingredients: ingredients,
      instructions: [
        `Prepare ${ingredients.join(' and ')}`,
        'Combine as suggested',
        'Cook appropriately',
        'Season well',
        'Serve hot'
      ],
      tips: 'Use your creativity',
      source: 'cohere_ai_text',
      modelUsed: workingModel,
      isFree: true
    };

  } catch (error) {
    console.error('❌ Cohere AI generation error:', error.message);
    if (error.response) {
      console.error('Cohere API response:', error.response.status, error.response.data?.message);
    }
    return null;
  }
};

// 3. Generate OpenRouter Recipe (FREE)
const generateOpenRouterRecipe = async (ingredients, filter = null) => {
  if (!openRouterAvailable) {
    console.log('❌ OpenRouter not available');
    return null;
  }

  try {
    console.log('🤖 Generating OpenRouter Mistral recipe (FREE)...');

    const prompt = `Create a simple, practical, real-life recipe using only these ingredients or some extras. Include the list of ingredients and step-by-step procedures: ${ingredients.join(', ')}.
${filter ? `Make it ${filter} (quick, healthy, vegetarian, etc.).` : ''}

IMPORTANT: Return ONLY valid JSON, no other text.

Required JSON format:
{
  "title": "Recipe Name",
  "description": "Brief description (1 sentence)",
  "prepTime": 25,
  "servings": 2,
  "ingredients": ["ingredient1", "ingredient2"],
  "instructions": ["Step 1", "Step 2", "Step 3"],
  "tips": "Optional cooking tip"
}`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'mistralai/mistral-7b-instruct:free',
        messages: [
          { 
            role: 'system', 
            content: 'You are a helpful recipe assistant. Always return valid JSON format for recipes.' 
          },
          { 
            role: 'user', 
            content: prompt 
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
        response_format: { type: "json_object" }
      },
      {
        headers: {
          'Authorization': `Bearer ${OPEN_ROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3001',
          'X-Title': 'FoodGuide Recipe Generator'
        },
        timeout: 10000
      }
    );

    console.log('📝 OpenRouter Response received');

    const text = response.data.choices[0].message.content.trim();
    
    try {
      const parsedRecipe = JSON.parse(text);
      console.log('✅ OpenRouter JSON parse successful');
      return {
        ...parsedRecipe,
        source: 'openrouter_mistral',
        modelUsed: 'mistral-7b-instruct',
        isFree: true
      };
    } catch (parseError) {
      console.log('❌ OpenRouter JSON parsing failed');
      
      // Fallback
      return {
        title: `Mistral Recipe with ${ingredients[0] || 'Ingredients'}`,
        description: `Mistral AI-generated recipe using ${ingredients.join(', ')}`,
        prepTime: 25,
        servings: 2,
        ingredients: ingredients,
        instructions: [
          `Prepare ${ingredients.join(' and ')}`,
          'Combine in a bowl or pan',
          'Cook using your preferred method',
          'Season to taste',
          'Serve and enjoy'
        ],
        tips: 'Adjust based on what you have available',
        source: 'openrouter_mistral_text',
        modelUsed: 'mistral-7b-instruct',
        isFree: true
      };
    }

  } catch (error) {
    console.error('❌ OpenRouter generation error:', error.message);
    return null;
  }
};

// LOCAL RECIPES DATABASE (keep your existing one)
const LOCAL_RECIPES = {
  'pasta,egg': [
    {
      id: 1001,
      title: "Pasta with Egg",
      description: "Simple protein pasta",
      image: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=312&h=231&fit=crop",
      prepTime: 15,
      servings: 1,
      ingredients: ["pasta", "egg", "oil", "salt"],
      instructions: ["Cook pasta", "Fry egg", "Combine", "Season with salt"]
    }
  ],

  'pasta,onion,egg': [
    {
      id: 1002,
      title: "Pasta with Onion and Egg",
      description: "Hearty pasta dish with onion and egg",
      image: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=312&h=231&fit=crop",
      prepTime: 20,
      servings: 2,
      ingredients: ["pasta", "onion", "egg", "oil", "salt", "pepper"],
      instructions: [
        "Cook pasta until al dente",
        "Slice onion and sauté in oil until soft",
        "Fry eggs sunny side up",
        "Combine pasta with onions",
        "Top with fried eggs and season"
      ]
    }
  ],

  'pasta,tomato': [
    {
      id: 1003,
      title: "Simple Tomato Pasta",
      description: "Quick tomato sauce pasta",
      image: "https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=312&h=231&fit=crop",
      prepTime: 25,
      servings: 2,
      ingredients: ["pasta", "tomato", "garlic", "olive oil", "basil"],
      instructions: ["Cook pasta", "Sauté garlic in olive oil", "Add chopped tomatoes", "Simmer for 10 minutes", "Toss with pasta and basil"]
    }
  ],

  'rice,egg': [
    {
      id: 1004,
      title: "Egg Fried Rice",
      description: "Quick and easy fried rice",
      image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=312&h=231&fit=crop",
      prepTime: 15,
      servings: 2,
      ingredients: ["rice", "egg", "oil", "soy sauce"],
      instructions: ["Heat oil in pan", "Scramble egg", "Add cooked rice", "Stir fry with soy sauce"]
    }
  ],

  'chicken,rice': [
    {
      id: 1005,
      title: "Chicken and Rice",
      description: "Simple protein and carb combo",
      image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=312&h=231&fit=crop",
      prepTime: 30,
      servings: 2,
      ingredients: ["chicken", "rice", "salt", "pepper"],
      instructions: ["Cook rice", "Cook chicken", "Combine", "Season"]
    }
  ],

  'water,lemon,salt,strawberry': [
    {
      id: 1006,
      title: "Lemon-Strawberry Infused Water",
      description: "Refreshing infused water",
      image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=312&h=231&fit=crop",
      prepTime: 5,
      servings: 4,
      ingredients: ["water", "lemon", "strawberry", "salt"],
      instructions: ["Slice lemon and strawberries", "Add to water with pinch of salt", "Refrigerate for 1 hour", "Serve chilled"]
    }
  ],

  'chicken,garlic': [
    {
      id: 1007,
      title: "Garlic Chicken",
      description: "Simple garlic flavored chicken",
      image: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=312&h=231&fit=crop",
      prepTime: 25,
      servings: 2,
      ingredients: ["chicken", "garlic", "oil", "salt", "pepper"],
      instructions: ["Season chicken", "Sauté garlic in oil", "Cook chicken with garlic", "Season to taste", "Serve hot"]
    }
  ],

  'strawberry,soda': [
    {
      id: 1008,
      title: "Strawberry Soda",
      description: "Refreshing strawberry soda drink",
      image: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=312&h=231&fit=crop",
      prepTime: 5,
      servings: 1,
      ingredients: ["strawberry", "soda"],
      instructions: ["Wash and slice strawberries", "Add to glass", "Pour soda over", "Serve immediately"]
    }
  ],

  'water,lemon': [
    {
      id: 1009,
      title: "Fresh Lemon Water",
      description: "Hydrating lemon water",
      image: "https://images.unsplash.com/photo-1523264939339-c89f9dadde2e?w=312&h=231&fit=crop",
      prepTime: 2,
      servings: 1,
      ingredients: ["water", "lemon"],
      instructions: ["Squeeze lemon into water", "Stir well", "Serve immediately"]
    }
  ],

  'bread,egg': [
    {
      id: 1010,
      title: "Egg Toast",
      description: "Simple breakfast toast",
      image: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=312&h=231&fit=crop",
      prepTime: 10,
      servings: 1,
      ingredients: ["bread", "egg", "butter", "salt"],
      instructions: ["Toast bread", "Fry egg", "Place egg on toast", "Season with salt"]
    }
  ],

  'bread,cheese': [
    {
      id: 1011,
      title: "Grilled Cheese",
      description: "Simple grilled cheese sandwich",
      image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=312&h=231&fit=crop",
      prepTime: 10,
      servings: 1,
      ingredients: ["bread", "cheese", "butter"],
      instructions: ["Butter bread", "Add cheese", "Grill until golden", "Serve hot"]
    }
  ],

  'potato,onion': [
    {
      id: 1012,
      title: "Potato Onion Fry",
      description: "Simple vegetable dish",
      image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=312&h=231&fit=crop",
      prepTime: 25,
      servings: 2,
      ingredients: ["potato", "onion", "oil", "salt"],
      instructions: ["Slice potatoes and onions", "Heat oil", "Fry until golden", "Season with salt"]
    }
  ],

  'tomato,onion': [
    {
      id: 1013,
      title: "Tomato Onion Salad",
      description: "Fresh vegetable salad",
      image: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=312&h=231&fit=crop",
      prepTime: 10,
      servings: 2,
      ingredients: ["tomato", "onion", "salt", "lemon"],
      instructions: ["Chop tomatoes and onions", "Mix together", "Add salt and lemon juice", "Serve fresh"]
    }
  ],

  'egg,tomato': [
    {
      id: 1014,
      title: "Tomato Egg Scramble",
      description: "Quick breakfast scramble",
      image: "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop",
      prepTime: 15,
      servings: 1,
      ingredients: ["egg", "tomato", "oil", "salt"],
      instructions: ["Chop tomato", "Beat eggs", "Scramble with tomato", "Season with salt"]
    }
  ],

  'milk,chocolate': [
    {
      id: 1015,
      title: "Hot Chocolate",
      description: "Warm chocolate drink",
      image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=312&h=231&fit=crop",
      prepTime: 10,
      servings: 1,
      ingredients: ["milk", "chocolate", "sugar"],
      instructions: ["Heat milk", "Add chocolate", "Stir until melted", "Add sugar to taste"]
    }
  ]
};

// Find matching local recipes
const findLocalRecipes = (ingredients) => {
  const normalizedIngredients = ingredients.map(normalizeIngredient);
  const matchedRecipes = [];

  // Exact matches
  const ingredientsKey = normalizedIngredients.join(',');
  if (LOCAL_RECIPES[ingredientsKey]) {
    matchedRecipes.push(...LOCAL_RECIPES[ingredientsKey]);
  }

  // Partial matches (at least 50% match)
  for (const [key, recipes] of Object.entries(LOCAL_RECIPES)) {
    if (key === ingredientsKey) continue;

    const keyIngredients = key.split(',');
    let matchCount = 0;

    normalizedIngredients.forEach(userIng => {
      if (keyIngredients.some(keyIng => {
        return normalizeIngredient(keyIng).includes(userIng) ||
          userIng.includes(normalizeIngredient(keyIng));
      })) {
        matchCount++;
      }
    });

    const matchRatio = matchCount / normalizedIngredients.length;
    if (matchRatio >= 0.5) {
      recipes.forEach(recipe => {
        matchedRecipes.push({
          ...recipe,
          matchScore: Math.round(matchRatio * 100)
        });
      });
    }
  }

  return matchedRecipes;
};

// GET /api/recipes/search - NEW FLOW
router.get('/search', async (req, res) => {
  try {
    const { ingredients, filter, number = 10 } = req.query;

    if (!ingredients) {
      return res.status(400).json({
        success: false,
        error: 'Ingredients parameter is required'
      });
    }

    const ingredientsArray = ingredients.split(',').map(i => i.trim()).filter(i => i);
    const normalizedIngredients = ingredientsArray.map(normalizeIngredient);

    console.log(`🔍 Searching for: ${normalizedIngredients.join(', ')}`);

    let recipes = [];
    let source = 'unknown';
    let fallbackLevel = 0;

    // STEP 1: Try Spoonacular API
    if (spoonacularAvailable) {
      try {
        console.log('📡 Calling Spoonacular API...');

        const params = {
          apiKey: SPOONACULAR_API_KEY,
          ingredients: normalizedIngredients.join(','),
          number: 5,
          ranking: 2,
          ignorePantry: true
        };

        if (filter) {
          switch (filter) {
            case 'quick': params.maxReadyTime = 30; break;
            case 'healthy': params.maxCalories = 500; break;
            case 'vegetarian': params.diet = 'vegetarian'; break;
          }
        }

        const response = await axios.get(
          `${SPOONACULAR_BASE_URL}/recipes/findByIngredients`,
          { params, timeout: 8000 }
        );

        if (response.data && response.data.length > 0) {
          console.log(`✅ Spoonacular returned ${response.data.length} recipes`);

          recipes = response.data.map(recipe => {
            const usedIngs = (recipe.usedIngredients || []).map(i => i.name.toLowerCase());
            const missedIngs = (recipe.missedIngredients || []).map(i => i.name.toLowerCase());
            const allRecipeIngredients = [...usedIngs, ...missedIngs];

            const matchPercentage = calculateMatchPercentage(normalizedIngredients, allRecipeIngredients);

            return {
              id: recipe.id,
              title: recipe.title,
              image: recipe.image || `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=312&h=231&fit=crop&q=80`,
              readyInMinutes: 30,
              servings: 4,
              matchPercentage: matchPercentage,
              cheap: false,
              dairyFree: false,
              glutenFree: false,
              vegan: false,
              vegetarian: recipe.vegetarian || false,
              veryHealthy: false,
              veryPopular: false,
              summary: `Uses ${recipe.usedIngredientCount || 0} of your ingredients.`,
              source: 'spoonacular',
              usedIngredients: recipe.usedIngredientCount || 0,
              missedIngredients: recipe.missedIngredientCount || 0,
              isFree: true
            };
          }).filter(recipe => recipe !== null);

          if (recipes.length > 0) {
            recipes.sort((a, b) => b.matchPercentage - a.matchPercentage);
            source = 'spoonacular';
            fallbackLevel = 0;
          }
        }

      } catch (spoonacularError) {
        console.log(`❌ Spoonacular API error: ${spoonacularError.message}`);
        fallbackLevel = 1;
      }
    } else {
      console.log('⚠️ Spoonacular API not available');
      fallbackLevel = 1;
    }

    // STEP 2: Try Gemini AI (NEW - replaces Grok)
    if (recipes.length === 0 && geminiAvailable) {
      try {
        console.log('🤖 Trying Gemini AI (FREE - Google)...');
        const aiRecipe = await generateGeminiRecipe(normalizedIngredients, filter);

        if (aiRecipe) {
          recipes = [{
            id: 3000,
            title: aiRecipe.title || "Gemini AI Recipe",
            image: `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=312&h=231&fit=crop&q=80`,
            readyInMinutes: aiRecipe.prepTime || 20,
            servings: aiRecipe.servings || 2,
            matchPercentage: 95,
            cheap: true,
            dairyFree: true,
            glutenFree: true,
            vegan: true,
            vegetarian: true,
            veryHealthy: true,
            veryPopular: false,
            summary: aiRecipe.description || `Gemini AI recipe using ${normalizedIngredients.join(', ')}`,
            source: 'gemini_ai',
            modelUsed: 'gemini-pro',
            isFree: true,
            instructions: aiRecipe.instructions || [],
            tips: aiRecipe.tips || ''
          }];
          source = 'gemini_ai';
          fallbackLevel = 2;
          console.log('✅ Gemini AI successful');
        } else {
          console.log('⚠️ Gemini AI failed, trying Cohere');
          fallbackLevel = 3;
        }
      } catch (aiError) {
        console.log('⚠️ Gemini AI generation failed:', aiError.message);
        fallbackLevel = 3;
      }
    } else if (recipes.length === 0 && !geminiAvailable) {
      console.log('⚠️ Gemini AI not configured, trying Cohere');
      fallbackLevel = 3;
    }

    // STEP 3: Try Cohere AI (NEW - replaces DeepSeek)
    if (recipes.length === 0 && cohereAvailable) {
      try {
        console.log('🤖 Trying Cohere AI (FREE)...');
        const aiRecipe = await generateCohereRecipe(normalizedIngredients, filter);

        if (aiRecipe) {
          recipes = [{
            id: 3001,
            title: aiRecipe.title || "Cohere AI Recipe",
            image: `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=312&h=231&fit=crop&q=80`,
            readyInMinutes: aiRecipe.prepTime || 20,
            servings: aiRecipe.servings || 2,
            matchPercentage: 90,
            cheap: true,
            dairyFree: true,
            glutenFree: true,
            vegan: true,
            vegetarian: true,
            veryHealthy: true,
            veryPopular: false,
            summary: aiRecipe.description || `Cohere AI recipe using ${normalizedIngredients.join(', ')}`,
            source: 'cohere_ai',
            modelUsed: 'command',
            isFree: true,
            instructions: aiRecipe.instructions || [],
            tips: aiRecipe.tips || ''
          }];
          source = 'cohere_ai';
          fallbackLevel = 4;
          console.log('✅ Cohere AI successful');
        } else {
          console.log('⚠️ Cohere AI failed, trying OpenRouter');
          fallbackLevel = 5;
        }
      } catch (aiError) {
        console.log('⚠️ Cohere AI generation failed:', aiError.message);
        fallbackLevel = 5;
      }
    } else if (recipes.length === 0 && !cohereAvailable) {
      console.log('⚠️ Cohere AI not configured, trying OpenRouter');
      fallbackLevel = 5;
    }

    // STEP 4: Try OpenRouter Mistral (BACKUP)
    if (recipes.length === 0 && openRouterAvailable) {
      try {
        console.log('🤖 Trying OpenRouter Mistral (FREE backup)...');
        const aiRecipe = await generateOpenRouterRecipe(normalizedIngredients, filter);

        if (aiRecipe) {
          recipes = [{
            id: 3002,
            title: aiRecipe.title || "Mistral AI Recipe",
            image: `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=312&h=231&fit=crop&q=80`,
            readyInMinutes: aiRecipe.prepTime || 20,
            servings: aiRecipe.servings || 2,
            matchPercentage: 85,
            cheap: true,
            dairyFree: true,
            glutenFree: true,
            vegan: true,
            vegetarian: true,
            veryHealthy: true,
            veryPopular: false,
            summary: aiRecipe.description || `Mistral AI recipe using ${normalizedIngredients.join(', ')}`,
            source: 'openrouter_mistral',
            modelUsed: 'mistral-7b-instruct',
            isFree: true,
            instructions: aiRecipe.instructions || [],
            tips: aiRecipe.tips || ''
          }];
          source = 'openrouter_mistral';
          fallbackLevel = 6;
          console.log('✅ OpenRouter successful');
        } else {
          console.log('⚠️ OpenRouter failed, using local recipes');
          fallbackLevel = 7;
        }
      } catch (aiError) {
        console.log('⚠️ OpenRouter generation failed:', aiError.message);
        fallbackLevel = 7;
      }
    } else if (recipes.length === 0 && !openRouterAvailable) {
      console.log('⚠️ OpenRouter not available, using local recipes');
      fallbackLevel = 7;
    }

    // STEP 5: Use local recipes
    if (recipes.length === 0) {
      console.log('📋 Using local recipes...');
      source = 'local';

      const matchedRecipes = findLocalRecipes(normalizedIngredients);

      if (matchedRecipes.length > 0) {
        recipes = matchedRecipes.map(recipe => ({
          id: recipe.id,
          title: recipe.title,
          image: recipe.image,
          readyInMinutes: recipe.prepTime || 20,
          servings: recipe.servings || 2,
          matchPercentage: recipe.matchScore || calculateMatchPercentage(normalizedIngredients, recipe.ingredients || []),
          cheap: true,
          dairyFree: true,
          glutenFree: true,
          vegan: true,
          vegetarian: true,
          veryHealthy: true,
          veryPopular: false,
          summary: recipe.description || `Local recipe using ${normalizedIngredients.join(', ')}`,
          source: 'local',
          isFree: true,
          instructions: recipe.instructions || []
        }));
      } else {
        // Create simple recipes
        recipes = normalizedIngredients.map((ingredient, index) => ({
          id: 2000 + index,
          title: `${ingredient.charAt(0).toUpperCase() + ingredient.slice(1)} Simple Prep`,
          image: `https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop&q=80`,
          readyInMinutes: 10,
          servings: 1,
          matchPercentage: 90,
          cheap: true,
          dairyFree: true,
          glutenFree: true,
          vegan: true,
          vegetarian: true,
          veryHealthy: true,
          veryPopular: false,
          summary: `Simple preparation using ${ingredient}`,
          source: 'generated',
          isFree: true,
          instructions: [
            `Prepare ${ingredient}`,
            'Cook as desired',
            'Season to taste',
            'Serve and enjoy'
          ]
        }));
      }
      fallbackLevel = 8;
    }

    // Ensure we have recipes
    if (recipes.length === 0) {
      recipes = [{
        id: 9999,
        title: 'Simple Kitchen Creation',
        image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=312&h=231&fit=crop&q=80',
        readyInMinutes: 20,
        servings: 2,
        matchPercentage: 70,
        cheap: true,
        dairyFree: true,
        glutenFree: true,
        vegan: true,
        vegetarian: true,
        veryHealthy: true,
        veryPopular: false,
        summary: 'Create something delicious with what you have!',
        source: 'emergency',
        isFree: true,
        instructions: [
          'Prepare your ingredients',
          'Combine creatively',
          'Cook using available method',
          'Season and serve'
        ]
      }];
      source = 'emergency';
      fallbackLevel = 9;
    }

    // Sort and limit
    recipes.sort((a, b) => b.matchPercentage - a.matchPercentage);
    const finalRecipes = recipes.slice(0, Math.min(number, 15));

    const result = {
      success: true,
      count: finalRecipes.length,
      ingredients: ingredientsArray,
      source: source,
      isFree: true,
      usingFallback: fallbackLevel > 0,
      fallbackLevel: fallbackLevel,
      recipes: finalRecipes,
      timestamp: new Date().toISOString(),
      message: getMessageBySource(source, finalRecipes.length)
    };

    console.log(`✅ Returning ${finalRecipes.length} recipes from ${source} (fallback: ${fallbackLevel})`);
    res.json(result);

  } catch (error) {
    console.error('❌ Fatal error in search:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Helper function
function getMessageBySource(source, count) {
  switch (source) {
    case 'spoonacular':
      return `Found ${count} recipes from Spoonacular`;
    case 'gemini_ai':
      return `Gemini AI (Google) generated ${count} recipe${count !== 1 ? 's' : ''}`;
    case 'cohere_ai':
      return `Cohere AI generated ${count} recipe${count !== 1 ? 's' : ''}`;
    case 'openrouter_mistral':
      return `Mistral AI generated ${count} recipe${count !== 1 ? 's' : ''}`;
    case 'local':
      return `Found ${count} local recipe${count !== 1 ? 's' : ''}`;
    case 'generated':
      return `Created ${count} simple recipe${count !== 1 ? 's' : ''}`;
    case 'emergency':
      return 'Emergency recipes provided';
    default:
      return `Found ${count} recipes`;
  }
}

// GET /api/recipes/ingredients/suggest
router.get('/ingredients/suggest', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ suggestions: [] });
    }

    // Try Spoonacular API
    if (spoonacularAvailable) {
      try {
        const response = await axios.get(
          `${SPOONACULAR_BASE_URL}/food/ingredients/autocomplete`,
          {
            params: {
              apiKey: SPOONACULAR_API_KEY,
              query: query,
              number: 8,
              metaInformation: false
            },
            timeout: 3000
          }
        );

        if (response.data && response.data.length > 0) {
          return res.json({
            success: true,
            suggestions: response.data.map(item => item.name)
          });
        }
      } catch (error) {
        console.log('Spoonacular suggestions API failed');
      }
    }

    // Fallback suggestions
    const popularIngredients = [
      'chicken', 'rice', 'pasta', 'tomato', 'onion', 'garlic', 'egg', 'cheese',
      'potato', 'carrot', 'broccoli', 'spinach', 'mushroom', 'bell pepper',
      'lemon', 'lime', 'ginger', 'soy sauce', 'olive oil', 'butter', 'milk',
      'flour', 'sugar', 'honey', 'bread', 'beans', 'lentils', 'tofu', 'fish',
      'salt', 'pepper', 'oil', 'water', 'strawberry', 'apple', 'banana',
      'chocolate', 'yogurt', 'cucumber', 'avocado', 'bacon', 'sausage'
    ];

    const filtered = popularIngredients
      .filter(ing => ing.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);

    res.json({
      success: true,
      suggestions: filtered
    });

  } catch (error) {
    console.error('Suggestions error:', error);
    res.json({
      success: true,
      suggestions: []
    });
  }
});

// GET /api/recipes/:id
// Update the GET /api/recipes/:id endpoint to return actual ingredients
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id);
    const { ingredients } = req.query; // Get ingredients from query if available

    // Local recipe
    if (parsedId >= 1000 && parsedId < 2000) {
      for (const recipes of Object.values(LOCAL_RECIPES)) {
        const recipe = recipes.find(r => r.id === parsedId);
        if (recipe) {
          return res.json({
            success: true,
            recipe: {
              id: recipe.id,
              title: recipe.title,
              image: recipe.image,
              readyInMinutes: recipe.prepTime || 20,
              servings: recipe.servings || 2,
              summary: recipe.description,
              extendedIngredients: recipe.ingredients.map((ing, idx) => {
                // Parse ingredient string if it has amount
                if (ing.includes('-')) {
                  const parts = ing.split('-');
                  return {
                    id: idx + 1,
                    name: parts[0].trim(),
                    original: ing,
                    amount: 1,
                    unit: parts[1]?.trim() || 'as needed'
                  };
                }
                return {
                  id: idx + 1,
                  name: ing,
                  original: ing,
                  amount: 1,
                  unit: 'as needed'
                };
              }),
              analyzedInstructions: [{
                steps: recipe.instructions.map((step, idx) => ({
                  number: idx + 1,
                  step: step
                }))
              }],
              source: 'local',
              isFree: true
            }
          });
        }
      }
    }

    // AI-generated recipe details (3000-3002 range)
    if (parsedId >= 3000 && parsedId <= 3002) {
      // Parse ingredients from query or use defaults
      const ingredientList = ingredients ? 
        ingredients.split(',').map(i => i.trim()) : 
        ['chicken', 'rice', 'vegetables'];
      
      // Create AI recipe with actual ingredients based on source
      let aiRecipe = {};
      
      if (parsedId === 3000) { // Gemini AI
        aiRecipe = {
          title: 'Gemini AI Fusion Dish',
          prepTime: 25,
          servings: 2,
          ingredients: [
            `${ingredientList[0] || 'chicken'} - 200g`,
            `${ingredientList[1] || 'rice'} - 1 cup`,
            `${ingredientList[2] || 'onion'} - 1 medium`,
            'garlic - 2 cloves',
            'olive oil - 2 tbsp',
            'salt - to taste',
            'pepper - to taste'
          ],
          instructions: [
            `Chop ${ingredientList[2] || 'onion'} and garlic finely`,
            `Heat oil in a pan and sauté ${ingredientList[2] || 'onion'} until translucent`,
            `Add ${ingredientList[0] || 'chicken'} and cook until browned`,
            `Add ${ingredientList[1] || 'rice'} and cook for 2 minutes`,
            'Add water, cover and simmer for 15-20 minutes',
            'Season with salt and pepper',
            'Serve hot with garnish'
          ]
        };
      } else if (parsedId === 3001) { // Cohere AI
        aiRecipe = {
          title: 'Cohere AI Quick Meal',
          prepTime: 20,
          servings: 2,
          ingredients: [
            `${ingredientList[0] || 'pasta'} - 200g`,
            `${ingredientList[1] || 'tomato'} - 2 medium`,
            `${ingredientList[2] || 'cheese'} - 100g`,
            'basil leaves - handful',
            'garlic - 2 cloves',
            'olive oil - 3 tbsp',
            'salt - to taste'
          ],
          instructions: [
            'Boil water with salt and cook pasta according to package',
            'Chop tomatoes and garlic',
            'Heat olive oil in a pan',
            'Sauté garlic until fragrant',
            'Add tomatoes and cook until soft',
            'Combine with cooked pasta',
            'Top with cheese and basil before serving'
          ]
        };
      } else if (parsedId === 3002) { // Mistral AI
        aiRecipe = {
          title: 'Mistral AI Smart Creation',
          prepTime: 30,
          servings: 2,
          ingredients: [
            `${ingredientList[0] || 'chicken'} - 250g`,
            `${ingredientList[1] || 'bell pepper'} - 1 large`,
            `${ingredientList[2] || 'onion'} - 1 medium`,
            'soy sauce - 2 tbsp',
            'ginger - 1 inch piece',
            'garlic - 3 cloves',
            'sesame oil - 1 tbsp'
          ],
          instructions: [
            'Slice chicken and vegetables into thin strips',
            'Mince garlic and ginger',
            'Heat sesame oil in a wok or large pan',
            'Stir-fry chicken until cooked through',
            'Add vegetables and stir-fry for 3-4 minutes',
            'Add soy sauce and cook for 1 more minute',
            'Serve immediately'
          ]
        };
      }
      
      return res.json({
        success: true,
        recipe: {
          id: parsedId,
          title: aiRecipe.title,
          image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=556&h=370&fit=crop&q=80',
          readyInMinutes: aiRecipe.prepTime,
          servings: aiRecipe.servings,
          summary: `AI-generated recipe using ${ingredientList.slice(0, 3).join(', ')}`,
          extendedIngredients: aiRecipe.ingredients.map((ing, idx) => {
            // Parse ingredient string to extract amount and unit
            const parts = ing.split(' - ');
            const name = parts[0] || ing;
            const amountUnit = parts[1] || 'as needed';
            
            // Try to extract numeric amount
            const amountMatch = amountUnit.match(/(\d+(\.\d+)?)/);
            const amount = amountMatch ? parseFloat(amountMatch[1]) : 1;
            const unit = amountUnit.replace(/\d+(\.\d+)?\s*/g, '').trim() || 'portion';
            
            return {
              id: idx + 1,
              name: name,
              original: ing,
              amount: amount,
              unit: unit
            };
          }),
          analyzedInstructions: [{
            steps: aiRecipe.instructions.map((step, idx) => ({
              number: idx + 1,
              step: step
            }))
          }],
          source: 'ai_generated',
          isFree: true
        }
      });
    }

    // Fallback details for other recipe IDs
    const ingredientList = ingredients ? 
      ingredients.split(',').map(i => i.trim()) : 
      ['chicken', 'rice', 'vegetables'];
    
    // Create default ingredients with amounts
    const defaultIngredients = [
      `${ingredientList[0] || 'chicken'} - 200g`,
      `${ingredientList[1] || 'rice'} - 1 cup`,
      `${ingredientList[2] || 'onion'} - 1 medium`,
      'garlic - 3 cloves',
      'olive oil - 2 tbsp',
      'salt - to taste',
      'pepper - to taste',
      'water - 2 cups'
    ];
    
    res.json({
      success: true,
      recipe: {
        id: parsedId,
        title: 'Delicious Recipe Creation',
        image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=556&h=370&fit=crop&q=80',
        readyInMinutes: 30,
        servings: 2,
        summary: 'Custom recipe based on your ingredients',
        extendedIngredients: defaultIngredients.map((ing, idx) => {
          const parts = ing.split(' - ');
          const name = parts[0] || ing;
          const amountUnit = parts[1] || 'as needed';
          
          const amountMatch = amountUnit.match(/(\d+(\.\d+)?)/);
          const amount = amountMatch ? parseFloat(amountMatch[1]) : 1;
          const unit = amountUnit.replace(/\d+(\.\d+)?\s*/g, '').trim() || 'portion';
          
          return {
            id: idx + 1,
            name: name,
            original: ing,
            amount: amount,
            unit: unit
          };
        }),
        analyzedInstructions: [{
          steps: [
            { number: 1, step: `Prepare ${ingredientList.slice(0, 3).join(', ')} by washing and chopping as needed` },
            { number: 2, step: 'Heat oil in a pan over medium heat' },
            { number: 3, step: 'Sauté onions and garlic until fragrant' },
            { number: 4, step: `Add ${ingredientList[0] || 'main ingredient'} and cook until done` },
            { number: 5, step: 'Season with salt and pepper to taste' },
            { number: 6, step: 'Serve hot and enjoy your meal!' }
          ]
        }],
        source: 'custom',
        isFree: true
      }
    });

  } catch (error) {
    console.error('Error in recipe details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recipe details'
    });
  }
});

// POST endpoint for customization
router.post('/:id/customize', (req, res) => {
  res.json({
    success: true,
    message: 'Customization endpoint',
    scaledIngredients: [],
    note: 'Adjust ingredients proportionally based on servings'
  });
});

module.exports = router;