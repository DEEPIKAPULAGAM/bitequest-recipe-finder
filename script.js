// TheMealDB API base URL
const BASE = 'https://www.themealdb.com/api/json/v1/1';

// Search when Enter is pressed
document.getElementById('ingredientInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchRecipes();
});

// Search using the suggested ingredient
function fillAndSearch(ingredient) {
  document.getElementById('ingredientInput').value = ingredient;
  searchRecipes();
}

// Search recipes based on user input
// Search recipes based on available ingredients
async function searchRecipes() {

  const query = document
    .getElementById("ingredientInput")
    .value
    .trim();

  // Separate the ingredients entered by the user
  const ingredients = [...new Set(
    query.toLowerCase()
      .split(",")
      .map(i => i.trim())
      .filter(i => i !== "")
  )];

  if (!ingredients.length) {
    showStatus("Please enter something", "error");
    return;
  }

  showLoader();
  clearResults();

  try {

    // Search for each ingredient separately
    const responses = await Promise.all(
      ingredients.map(async ingredient => {

        const res = await fetch(
          `${BASE}/filter.php?i=${encodeURIComponent(ingredient)}`
        );

        if (!res.ok) {
          throw new Error("API request failed");
        }

        const data = await res.json();

        return {
          ingredient: ingredient,
          meals: data.meals || []
        };
      })
    );

    const recipeMap = new Map();

    // Combine recipes and count matching ingredients
    responses.forEach(result => {

      result.meals.forEach(meal => {

        if (recipeMap.has(meal.idMeal)) {

          const recipe = recipeMap.get(meal.idMeal);

          if (!recipe.matchedIngredients.includes(result.ingredient)) {
            recipe.matchCount++;
            recipe.matchedIngredients.push(result.ingredient);
          }

        } else {

          recipeMap.set(meal.idMeal, {
            ...meal,
            matchCount: 1,
            matchedIngredients: [result.ingredient]
          });

        }

      });

    });

    let recipes = Array.from(recipeMap.values());

    // Try dish name search if only one input is given
    if (recipes.length === 0 && ingredients.length === 1) {

      const res = await fetch(
        `${BASE}/search.php?s=${encodeURIComponent(query)}`
      );

      if (!res.ok) {
        throw new Error("API request failed");
      }

      const data = await res.json();

      recipes = (data.meals || []).map(meal => ({
        ...meal,
        matchCount: 0,
        matchedIngredients: []
      }));

    }

    if (recipes.length === 0) {
      showStatus(`No recipes found for "${query}"`, "error");
      return;
    }

    // Recipes with more matching ingredients are shown first
    recipes.sort((a, b) => b.matchCount - a.matchCount);

    clearStatus();

    renderResults(recipes.slice(0, 12), query, ingredients);

  } catch (err) {

    showStatus("Something went wrong", "error");

  }

}

// Display recipe cards
// Display recipe cards
function renderResults(meals, query, ingredients) {

  const header = document.getElementById('resultsHeader');
  const grid = document.getElementById('recipesGrid');

  header.innerHTML = `
    <h2 class="results-title">Suggested Recipes</h2>
    <span class="results-count">${meals.length} shown</span>
  `;

  grid.innerHTML = '';

  // Create a card for each recipe
  meals.forEach((meal, i) => {

    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.style.animationDelay = `${i * 0.06}s`;

    const matched = meal.matchedIngredients || [];

    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${meal.strMealThumb}"
             alt="${meal.strMeal}"
             loading="lazy"/>

        <span class="card-badge">
          ${meal.matchCount > 0
            ? `${meal.matchCount}/${ingredients.length} Match`
            : '🍽 Recipe'}
        </span>
      </div>

      <div class="card-body">

        <h3 class="card-title">${meal.strMeal}</h3>

        <div class="card-meta">
          ${matched.map(ingredient => `
            <span class="meta-pill">✓ ${ingredient}</span>
          `).join('')}
        </div>

        <span class="card-cta">View Instructions →</span>

      </div>
    `;

    // Open recipe details when the card is clicked
    card.addEventListener('click', () => openRecipeModal(meal.idMeal));

    grid.appendChild(card);

  });

}

// Get complete recipe details
async function openRecipeModal(mealId) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');

  // Show loading animation
  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:320px;">
      <div class="loader">
        <div class="loader-dot"></div>
        <div class="loader-dot"></div>
        <div class="loader-dot"></div>
      </div>
    </div>`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {

    // Get recipe details using meal ID
    const res  = await fetch(`${BASE}/lookup.php?i=${mealId}`);
    const data = await res.json();
    const meal = data.meals[0];

    const ingredients = buildIngredientList(meal);
    const instructions = meal.strInstructions
      ? formatInstructions(meal.strInstructions)
      : 'Instructions not available.';

    content.innerHTML = `
      <img class="modal-hero" src="${meal.strMealThumb}" alt="${meal.strMeal}"/>
      <div class="modal-body">
        <p class="modal-category">${meal.strCategory || ''} ${meal.strArea ? '· ' + meal.strArea + ' Cuisine' : ''}</p>
        <h2 class="modal-title">${meal.strMeal}</h2>

        <p class="modal-section-title">🛒 Ingredients</p>
        <ul class="ingredients-list">
          ${ingredients.map(i => `<li>${i}</li>`).join('')}
        </ul>

        <p class="modal-section-title">📋 Instructions</p>
        <p class="instructions-text">${instructions}</p>

        <div class="modal-links">
          ${meal.strYoutube ? `<a class="link-btn primary" href="${meal.strYoutube}" target="_blank" rel="noopener">▶ Watch on YouTube</a>` : ''}
          ${meal.strSource  ? `<a class="link-btn secondary" href="${meal.strSource}"  target="_blank" rel="noopener">🔗 Full Recipe</a>` : ''}
        </div>
      </div>
    `;
  } catch (err) {
    content.innerHTML = `<div class="modal-body"><p class="status-msg error">Could not load recipe details.</p></div>`;
  }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// Close popup when Escape is pressed
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Combine ingredients with their quantities
function buildIngredientList(meal) {
  const list = [];

  // The API provides up to 20 ingredient fields
  for (let i = 1; i <= 20; i++) {
    const ing     = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (ing && ing.trim()) {
      const m = measure && measure.trim() ? `${measure.trim()} ` : '';
      list.push(`${m}${ing.trim()}`);
    }
  }
  return list;
}

// Format cooking instructions
function formatInstructions(text) {
  // Remove extra line breaks and escape HTML characters
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\r\n|\r|\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function showLoader() {
  document.getElementById('statusArea').innerHTML = `
    <div class="loader">
      <div class="loader-dot"></div>
      <div class="loader-dot"></div>
      <div class="loader-dot"></div>
    </div>`;
}

function showStatus(msg, type = '') {
  document.getElementById('statusArea').innerHTML =
    `<p class="status-msg ${type}">${msg}</p>`;
}

function clearStatus() {
  document.getElementById('statusArea').innerHTML = '';
}

function clearResults() {
  document.getElementById('resultsHeader').innerHTML = '';
  document.getElementById('recipesGrid').innerHTML  = '';
}