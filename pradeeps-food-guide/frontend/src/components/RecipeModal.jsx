import { useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, Clock, Users, ChefHat, Copy, ShoppingCart, Heart, Printer, Share2, Thermometer, Scale, CheckCircle, XCircle } from 'lucide-react'
import { api } from '../api/config';

const RecipeModal = ({ recipeId, onClose, userIngredients = [] }) => {
  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [servings, setServings] = useState(2)
  const [spiceLevel, setSpiceLevel] = useState('medium')
  const [scaledIngredients, setScaledIngredients] = useState([])
  const [isFavorite, setIsFavorite] = useState(false)
  const [activeTab, setActiveTab] = useState('ingredients')

  useEffect(() => {
    fetchRecipeDetails()
  }, [recipeId])

  useEffect(() => {
    if (recipe) {
      scaleIngredients()
    }
  }, [servings, recipe])

  const fetchRecipeDetails = async () => {
    setLoading(true)
    try {
      // Get user ingredients from localStorage or props
      const lastSearch = JSON.parse(localStorage.getItem('lastIngredients') || '[]')
      const ingredientsToSend = userIngredients.length > 0 ? 
        userIngredients.join(',') : 
        (lastSearch.join(',') || 'chicken,rice,vegetables')
      
      const response = await api.get(`/api/recipes/${recipeId}`, {
        params: {
          ingredients: ingredientsToSend
        }
      })
      
      const recipeData = response.data.recipe
      setRecipe(recipeData)
      
      // Set servings from recipe data or default to 2
      setServings(recipeData.servings || 2)
      
      // If the recipe has AI instructions, process them
      if (recipeData.source?.includes('ai') || recipeData.source === 'custom') {
        // Handle AI recipes that might have different structure
        const aiInstructions = recipeData.instructions || recipeData.analyzedInstructions?.[0]?.steps?.map(step => step.step) || []
        if (aiInstructions.length > 0) {
          recipeData.analyzedInstructions = [{
            steps: aiInstructions.map((step, idx) => ({
              number: idx + 1,
              step: step
            }))
          }]
        }
      }
      
      // Check if favorite
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
      setIsFavorite(favorites.some(fav => fav.id === parseInt(recipeId)))
    } catch (error) {
      console.error('Error fetching recipe:', error)
      
      // Fallback: Create a simple recipe with user ingredients
      const fallbackIngredients = userIngredients.length > 0 ? userIngredients : ['chicken', 'rice', 'vegetables']
      
      setRecipe({
        id: recipeId,
        title: 'Quick Meal Creation',
        image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=556&h=370&fit=crop&q=80',
        readyInMinutes: 25,
        servings: 2,
        summary: `Simple recipe using ${fallbackIngredients.join(', ')}`,
        extendedIngredients: fallbackIngredients.map((ing, idx) => ({
          id: idx + 1,
          name: ing,
          original: `${ing} - as needed`,
          amount: 1,
          unit: 'portion'
        })),
        analyzedInstructions: [{
          steps: [
            { number: 1, step: `Prepare ${fallbackIngredients.join(' and ')}` },
            { number: 2, step: 'Heat oil in a pan' },
            { number: 3, step: 'Cook ingredients until done' },
            { number: 4, step: 'Season with salt and pepper' },
            { number: 5, step: 'Serve and enjoy!' }
          ]
        }],
        source: 'fallback',
        isFree: true
      })
      
      toast.info('Using fallback recipe details')
    } finally {
      setLoading(false)
    }
  }

  const scaleIngredients = () => {
    if (!recipe) return
    
    try {
      let ingredients = []
      
      // Handle different recipe sources and structures
      if (recipe.extendedIngredients && recipe.extendedIngredients.length > 0) {
        // Standard format (Spoonacular, AI, local)
        ingredients = recipe.extendedIngredients
      } else if (recipe.ingredients && recipe.ingredients.length > 0) {
        // Simple string array format
        ingredients = recipe.ingredients.map((ing, idx) => {
          // Try to parse amount from string like "chicken - 200g"
          if (typeof ing === 'string' && ing.includes('-')) {
            const parts = ing.split('-')
            return {
              id: idx + 1,
              name: parts[0]?.trim() || ing,
              original: ing,
              amount: 1,
              unit: parts[1]?.trim() || 'portion'
            }
          }
          return {
            id: idx + 1,
            name: typeof ing === 'string' ? ing : ing.name || 'ingredient',
            original: typeof ing === 'string' ? ing : ing.original || ing.name || 'ingredient',
            amount: 1,
            unit: 'as needed'
          }
        })
      } else {
        // Fallback - use user ingredients
        const fallbackIngredients = userIngredients.length > 0 ? userIngredients : ['chicken', 'rice', 'vegetables']
        ingredients = fallbackIngredients.map((ing, idx) => ({
          id: idx + 1,
          name: ing,
          original: `${ing} - as needed`,
          amount: 1,
          unit: 'portion'
        }))
      }
      
      // Scale ingredients based on servings
      const scaleFactor = servings / (recipe.servings || 2)
      
      const scaled = ingredients.map(ing => {
        // Try to extract amount from original string
        let amount = ing.amount || 1
        let unit = ing.unit || 'portion'
        
        if (ing.original && typeof ing.original === 'string') {
          // Check if original contains amount information like "chicken - 200g"
          if (ing.original.includes('-')) {
            const parts = ing.original.split('-')
            const amountPart = parts[1]?.trim() || ''
            
            // Try to extract numeric amount
            const amountMatch = amountPart.match(/(\d+(\.\d+)?)/)
            if (amountMatch) {
              amount = parseFloat(amountMatch[1])
              unit = amountPart.replace(/\d+(\.\d+)?\s*/g, '').trim() || 'portion'
            }
          } else {
            // Try to extract amount from original string directly
            const amountMatch = ing.original.match(/(\d+(\.\d+)?)/)
            if (amountMatch) {
              amount = parseFloat(amountMatch[1])
            }
          }
        }
        
        const scaledAmount = Math.round(amount * scaleFactor * 100) / 100
        
        // Format the display string
        let displayOriginal = ing.original
        if (displayOriginal === 'Your provided ingredients') {
          // Replace placeholder with actual ingredient
          displayOriginal = `${ing.name} - as needed`
        }
        
        return {
          ...ing,
          amount: scaledAmount,
          original: displayOriginal,
          unit: unit
        }
      })
      
      setScaledIngredients(scaled)
    } catch (error) {
      console.error('Error scaling ingredients:', error)
      // Fallback with user ingredients
      const fallbackIngredients = userIngredients.length > 0 ? userIngredients : ['chicken', 'rice', 'vegetables']
      setScaledIngredients(fallbackIngredients.map((ing, idx) => ({
        id: idx + 1,
        name: ing,
        original: `${ing} - as needed`,
        amount: 1,
        unit: 'portion'
      })))
    }
  }

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]')
    
    if (isFavorite) {
      const newFavorites = favorites.filter(fav => fav.id !== recipe.id)
      localStorage.setItem('favorites', JSON.stringify(newFavorites))
      setIsFavorite(false)
      toast.success('Removed from favorites')
    } else {
      favorites.push({
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        readyInMinutes: recipe.readyInMinutes,
        servings: recipe.servings,
        matchPercentage: recipe.matchPercentage
      })
      localStorage.setItem('favorites', JSON.stringify(favorites))
      setIsFavorite(true)
      toast.success('Added to favorites!')
    }
  }

  const copyMissingIngredients = () => {
    if (!recipe || scaledIngredients.length === 0) {
      toast.error('No ingredients to copy')
      return
    }
    
    const text = scaledIngredients.map(ing => `• ${ing.original}`).join('\n')
    navigator.clipboard.writeText(text)
    toast.success('Ingredients copied to clipboard!')
  }

  const addToMealPlan = () => {
    if (!recipe) {
      toast.error('Recipe not loaded')
      return
    }
    
    try {
      const mealPlan = JSON.parse(localStorage.getItem('mealPlan') || '{}')
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
      
      if (!mealPlan[today]) {
        mealPlan[today] = {}
      }
      
      // Find next available meal slot
      const meals = ['Breakfast', 'Lunch', 'Dinner']
      const availableMeal = meals.find(meal => !mealPlan[today][meal])
      
      if (availableMeal) {
        mealPlan[today][availableMeal] = {
          id: recipe.id,
          title: recipe.title,
          image: recipe.image,
          readyInMinutes: recipe.readyInMinutes,
          servings: recipe.servings
        }
        localStorage.setItem('mealPlan', JSON.stringify(mealPlan))
        toast.success(`Added to ${availableMeal} on ${today}`)
      } else {
        toast.error('All meal slots are filled for today')
      }
    } catch (error) {
      console.error('Error adding to meal plan:', error)
      toast.error('Failed to add to meal plan')
    }
  }

  const printRecipe = () => {
    if (!recipe) {
      toast.error('Recipe not loaded')
      return
    }
    
    const printWindow = window.open('', '_blank')
    printWindow.document.write(`
      <html>
        <head>
          <title>${recipe.title} - Pradeep's Food Guide</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
            h1 { color: #FF6B35; border-bottom: 2px solid #FF6B35; padding-bottom: 10px; }
            .info { background: #f5f5f5; padding: 15px; border-radius: 10px; margin: 20px 0; }
            .ingredients, .instructions { margin: 20px 0; }
            .ingredient-item { margin: 5px 0; }
            .step { margin: 10px 0; }
            @media print {
              .no-print { display: none; }
              body { font-size: 12pt; }
            }
          </style>
        </head>
        <body>
          <h1>${recipe.title}</h1>
          <div class="info">
            <strong>Prep Time:</strong> ${recipe.readyInMinutes || 25} minutes<br>
            <strong>Servings:</strong> ${servings}<br>
            <strong>Spice Level:</strong> ${spiceLevel}
          </div>
          <div class="ingredients">
            <h2>Ingredients (${servings} servings):</h2>
            ${scaledIngredients.map(ing => `<div class="ingredient-item">• ${ing.original}</div>`).join('')}
          </div>
          <div class="instructions">
            <h2>Instructions:</h2>
            ${(recipe.analyzedInstructions?.[0]?.steps || []).map((step, i) => 
              `<div class="step"><strong>Step ${i + 1}:</strong> ${step.step}</div>`
            ).join('') || '<p>No instructions provided.</p>'}
          </div>
          <p class="no-print"><br>Printed from Pradeep's Food Guide - Cook with what you have!</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const shareRecipe = async () => {
    if (!recipe) return
    
    const shareData = {
      title: recipe.title,
      text: `Check out this recipe from Pradeep's Food Guide: ${recipe.title}`,
      url: window.location.href,
    }
    
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(`${recipe.title} - ${window.location.href}`)
        toast.success('Recipe link copied to clipboard!')
      }
    } catch (err) {
      console.error('Error sharing:', err)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-food-orange mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading recipe details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!recipe) return null

  // Check which ingredients the user has
  const getIngredientStatus = (ingredient) => {
    if (!userIngredients.length) return 'unknown'
    
    const ingredientName = ingredient.name.toLowerCase()
    const hasIngredient = userIngredients.some(userIng => 
      ingredientName.includes(userIng.toLowerCase()) ||
      userIng.toLowerCase().includes(ingredientName)
    )
    
    return hasIngredient ? 'have' : 'missing'
  }

  const spiceEmoji = {
    mild: '🌱',
    medium: '🌶️',
    spicy: '🔥'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-display font-bold mb-2">{recipe.title}</h2>
            <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Clock size={16} />
                {recipe.readyInMinutes || 25} min
              </span>
              <span className="flex items-center gap-1">
                <Users size={16} />
                {servings} servings
              </span>
              <span className="text-sm px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full">
                {recipe.source?.replace('_', ' ') || 'Recipe'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFavorite}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart size={20} className={isFavorite ? "fill-food-red text-food-red" : ""} />
            </button>
            <button
              onClick={printRecipe}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              aria-label="Print recipe"
            >
              <Printer size={20} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid md:grid-cols-3 gap-8 p-6">
            {/* Left Column */}
            <div className="md:col-span-2">
              {/* Tabs */}
              <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex space-x-4">
                  <button
                    onClick={() => setActiveTab('ingredients')}
                    className={`pb-2 px-1 font-medium ${activeTab === 'ingredients' ? 'border-b-2 border-food-orange text-food-orange' : 'text-gray-500'}`}
                  >
                    Ingredients
                  </button>
                  <button
                    onClick={() => setActiveTab('instructions')}
                    className={`pb-2 px-1 font-medium ${activeTab === 'instructions' ? 'border-b-2 border-food-orange text-food-orange' : 'text-gray-500'}`}
                  >
                    Instructions
                  </button>
                  <button
                    onClick={() => setActiveTab('nutrition')}
                    className={`pb-2 px-1 font-medium ${activeTab === 'nutrition' ? 'border-b-2 border-food-orange text-food-orange' : 'text-gray-500'}`}
                  >
                    Nutrition
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              {activeTab === 'ingredients' && (
                <div className="animate-slide-up">
                  <h3 className="text-xl font-bold mb-4">Ingredients ({servings} servings)</h3>
                  <div className="space-y-3">
                    {scaledIngredients.map((ingredient, index) => {
                      const status = getIngredientStatus(ingredient)
                      return (
                        <div 
                          key={index}
                          className={`flex items-center gap-3 p-3 rounded-lg ${
                            status === 'have' ? 'bg-green-50 dark:bg-green-900/20' : 
                            status === 'missing' ? 'bg-red-50 dark:bg-red-900/20' : 
                            'bg-gray-50 dark:bg-gray-700'
                          }`}
                        >
                          <div className={`flex-shrink-0 ${status === 'have' ? 'text-green-500' : status === 'missing' ? 'text-red-500' : 'text-gray-400'}`}>
                            {status === 'have' ? <CheckCircle size={20} /> : 
                             status === 'missing' ? <XCircle size={20} /> : 
                             <div className="w-5 h-5 border border-gray-300 rounded"></div>}
                          </div>
                          <div className={`${status === 'missing' ? 'text-red-600 dark:text-red-400' : ''}`}>
                            {ingredient.original}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'instructions' && (
                <div className="animate-slide-up">
                  <h3 className="text-xl font-bold mb-4">Instructions</h3>
                  <div className="space-y-6">
                    {(recipe.analyzedInstructions?.[0]?.steps || []).map((step, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-food-orange text-white rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="mb-2">{step.step}</p>
                        </div>
                      </div>
                    )) || (
                      <p className="text-gray-500">No detailed instructions available. Use your cooking intuition!</p>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'nutrition' && (
                <div className="animate-slide-up">
                  <h3 className="text-xl font-bold mb-4">Nutrition Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      <div className="text-lg font-bold">~250</div>
                      <div className="text-gray-600 dark:text-gray-400">Calories</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      <div className="text-lg font-bold">~15g</div>
                      <div className="text-gray-600 dark:text-gray-400">Protein</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      <div className="text-lg font-bold">~30g</div>
                      <div className="text-gray-600 dark:text-gray-400">Carbs</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      <div className="text-lg font-bold">~10g</div>
                      <div className="text-gray-600 dark:text-gray-400">Fat</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      <div className="text-lg font-bold">~5g</div>
                      <div className="text-gray-600 dark:text-gray-400">Fiber</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      <div className="text-lg font-bold">~500mg</div>
                      <div className="text-gray-600 dark:text-gray-400">Sodium</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Controls */}
            <div className="space-y-6">
              {/* Servings Control */}
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Scale size={20} />
                  Adjust Servings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold">{servings}</span>
                    <span className="text-gray-500">servings</span>
                  </div>
                  <div className="flex items-center justify-center space-x-4">
                    {[1, 2, 4, 6, 8].map(num => (
                      <button
                        key={num}
                        onClick={() => setServings(num)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all ${
                          servings === num
                            ? 'bg-food-orange text-white scale-110'
                            : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={servings}
                    onChange={(e) => setServings(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-food-orange"
                  />
                </div>
              </div>

              {/* Spice Level */}
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-2xl">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Thermometer size={20} />
                  Spice Level
                </h3>
                <div className="space-y-2">
                  {['mild', 'medium', 'spicy'].map(level => (
                    <button
                      key={level}
                      onClick={() => setSpiceLevel(level)}
                      className={`w-full p-3 rounded-lg flex items-center justify-between transition-colors ${
                        spiceLevel === level
                          ? 'bg-food-orange text-white'
                          : 'bg-white dark:bg-gray-600 hover:bg-gray-100 dark:hover:bg-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{spiceEmoji[level]}</span>
                        <span className="capitalize">{level}</span>
                      </div>
                      {spiceLevel === level && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Missing Ingredients */}
              {userIngredients.length > 0 && scaledIngredients.some(ing => getIngredientStatus(ing) === 'missing') && (
                <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl">
                  <h3 className="text-lg font-bold mb-4 text-red-600 dark:text-red-400">
                    Missing Ingredients
                  </h3>
                  <ul className="space-y-2 mb-4">
                    {scaledIngredients
                      .filter(ing => getIngredientStatus(ing) === 'missing')
                      .slice(0, 5)
                      .map((ing, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          <span>{ing.original}</span>
                        </li>
                      ))}
                  </ul>
                  <button
                    onClick={copyMissingIngredients}
                    className="w-full bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Copy size={16} />
                    Copy Shopping List
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={addToMealPlan}
                  className="w-full bg-food-green hover:bg-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2"
                >
                  <ChefHat size={20} />
                  Add to Meal Plan
                </button>
                
                <button
                  onClick={printRecipe}
                  className="w-full border-2 border-food-orange text-food-orange hover:bg-food-orange hover:text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Printer size={20} />
                  Print Recipe
                </button>
                
                <button
                  onClick={shareRecipe}
                  className="w-full border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  <Share2 size={20} />
                  Share Recipe
                </button>
              </div>

              {/* Quick Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <h4 className="font-bold mb-2">Quick Tips</h4>
                <ul className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                  <li>• Missing an ingredient? Try a substitute!</li>
                  <li>• Scale servings up or down as needed</li>
                  <li>• Save to favorites for quick access</li>
                  <li>• Add to meal planner for the week</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              Recipe from {recipe.creditsText || recipe.source?.replace('_', ' ') || "Pradeep's Food Guide"}
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecipeModal