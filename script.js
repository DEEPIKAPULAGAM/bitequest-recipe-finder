// API: TheMealDB (free, no key needed)

const BASE = 'https://www.themealdb.com/api/json/v1/1';

// Allow Enter key to trigger search
document.getElementById('ingredientInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchRecipes();
});

// Fill input and search
function fillAndSearch(ingredient) {
  document.getElementById('ingredientInput').value = ingredient;
  searchRecipes();
}

// MAIN SEARCH
async function searchRecipes(){

const query=document
.getElementById("ingredientInput")
.value
.trim();

if(!query){
showStatus("Please enter something","error");
return;
}

showLoader();
clearResults();

try{

// first try ingredient search
let res=await fetch(
`${BASE}/filter.php?i=${encodeURIComponent(query)}`
);

let data=await res.json();

// if ingredient search fails → try dish name search
if(!data.meals){

res=await fetch(
`${BASE}/search.php?s=${encodeURIComponent(query)}`
);

data=await res.json();

}

if(!data.meals){

showStatus(`No recipes found for "${query}"`,"error");
return;

}

clearStatus();
renderResults(data.meals.slice(0,12),query,query);

}catch(err){

showStatus("Something went wrong","error");

}

}

// RECIPE CARDS
function renderResults(meals, query, ingredient) {
  const header = document.getElementById('resultsHeader');
  const grid   = document.getElementById('recipesGrid');

  header.innerHTML = `
    <h2 class="results-title">Recipes with <em style="color:var(--orange);font-style:italic">"${ingredient}"</em></h2>
    <span class="results-count">${meals.length} found</span>
  `;

  grid.innerHTML = '';

  meals.forEach((meal, i) => {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    card.style.animationDelay = `${i * 0.06}s`;
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${meal.strMealThumb}" alt="${meal.strMeal}" loading="lazy"/>
        <span class="card-badge">🍽 Recipe</span>
      </div>
      <div class="card-body">
        <h3 class="card-title">${meal.strMeal}</h3>
        <div class="card-meta">
          <span class="meta-pill">🥄 ${ingredient}</span>
        </div>
        <span class="card-cta">View Instructions →</span>
      </div>
    `;
    card.addEventListener('click', () => openRecipeModal(meal.idMeal));
    grid.appendChild(card);
  });
}

// MODAL — FETCH FULL DETAILS
async function openRecipeModal(mealId) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');

  // Show modal with loader
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

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// HELPERS

// Build ingredient + measure pairs from MealDB response
function buildIngredientList(meal) {
  const list = [];
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

// Clean up wall-of-text instructions into readable paragraphs
function formatInstructions(text) {
  // Escape HTML, then add line breaks for readability
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
