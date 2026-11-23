const STORAGE_KEY = "little-pixel-recipe-book-v1";

const starterRecipes = [
  {
    id: crypto.randomUUID(), name: "Шоколадное печенье", category: "Выпечка",
    time: "30 минут", description: "Мягкое внутри, с хрустящими краешками и кусочками шоколада.",
    servings: 8,
    ingredients: [
      {amount: 100, unit: "г", name: "сахара"},
      {amount: 50, unit: "г", name: "коричневого сахара"},
      {amount: 190, unit: "г", name: "муки"},
      {amount: 1, unit: "пакетик", name: "ванилина"},
      {amount: 1, unit: "щепотка", name: "соды"},
      {amount: 1, unit: "щепотка", name: "соли"},
      {amount: 120, unit: "г", name: "сливочного масла"},
      {amount: 1, unit: "шт.", name: "яйца"},
      {amount: 1.5, unit: "плитки", name: "шоколада"}
    ],
    steps: "1. Масло растопи на среднем огне до тех пор, пока не станет прозрачным и примет слегка карамельный оттенок. Не сожги.\n2. В ёмкости смешай весб сахар и масло. Затем добавь яйцо и ванилин. \n3. Всыпь муку, соду, соль и перемешай. Затем добавь измельченные кусочки шоколада.\n4. Сформируй из теста небольшие кружочки и выпекай при 180 °C примерно 15 минут или до того, как они начнут темнеть. Если передержать - после остывания станут твердые.",
    favorite: true
  },
];

let recipes = loadRecipes();
let activeFilter = "all";
let currentRecipeId = null;
let currentServings = 2;

const $ = (selector) => document.querySelector(selector);
const recipeDialog = $("#recipeDialog");
const detailDialog = $("#detailDialog");

function loadRecipes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : starterRecipes;
  } catch {
    return starterRecipes;
  }
}
function saveRecipes() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]));
}
function formatAmount(value) {
  if (value === null || value === undefined || value === "") return "";
  const rounded = Math.round(Number(value) * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}
function getVisibleRecipes() {
  const term = $("#searchInput").value.trim().toLocaleLowerCase("ru");
  return recipes.filter(recipe => {
    const matchesFilter = activeFilter === "all" || (activeFilter === "favorite" && recipe.favorite);
    const searchable = [recipe.name, recipe.category, recipe.description, ...recipe.ingredients.map(i => i.name)].join(" ").toLocaleLowerCase("ru");
    return matchesFilter && searchable.includes(term);
  });
}
function render() {
  const visible = getVisibleRecipes();
  $("#allCount").textContent = recipes.length;
  $("#favoriteCount").textContent = recipes.filter(r => r.favorite).length;
  $("#visibleCount").textContent = visible.length;
  $("#listTitle").innerHTML = `${activeFilter === "favorite" ? "Избранное" : "Все рецепты"} <span class="heading-count">${visible.length}</span>`;
  $("#recipeList").innerHTML = visible.map(recipe => `
    <article class="recipe-card" data-id="${recipe.id}" tabindex="0" role="button" aria-label="Открыть рецепт ${escapeHTML(recipe.name)}">
      <div class="card-top"><span class="category-tag">${escapeHTML(recipe.category)}</span>
        <button class="favorite-mark" data-favorite="${recipe.id}" aria-label="Добавить в избранное">${recipe.favorite ? "♥" : "♡"}</button>
      </div>
      <h3>${escapeHTML(recipe.name)}</h3>
      <p class="card-description">${escapeHTML(recipe.description || "Твой домашний рецепт.")}</p>
      <div class="card-bottom"><span>◷ ${escapeHTML(recipe.time || "Время не указано")}</span><span>♧ ${recipe.servings} порц.</span></div>
    </article>`).join("");
  $("#emptyState").hidden = visible.length !== 0;
  $("#recipeList").hidden = visible.length === 0;
}
function openAddDialog(recipe = null) {
  $("#recipeForm").reset();
  $("#ingredientEditor").innerHTML = "";
  currentRecipeId = recipe?.id || null;
  $("#dialogTitle").textContent = recipe ? "Изменить рецепт" : "Добавить рецепт";
  if (recipe) {
    $("#recipeName").value = recipe.name;
    $("#recipeCategory").value = recipe.category;
    $("#recipeTime").value = recipe.time || "";
    $("#recipeDescription").value = recipe.description || "";
    $("#recipeSteps").value = recipe.steps;
    recipe.ingredients.forEach(addIngredientRow);
  } else {
    $("#recipeCategory").value = "Выпечка";
    addIngredientRow();
    addIngredientRow();
  }
  recipeDialog.showModal();
}
function addIngredientRow(ingredient = {}) {
  const row = document.createElement("div");
  row.className = "ingredient-row";
  row.innerHTML = `<input type="number" min="0" step="any" placeholder="Кол-во" aria-label="Количество" value="${ingredient.amount ?? ""}">
    <input type="text" placeholder="г / мл / шт." aria-label="Единица" value="${escapeHTML(ingredient.unit || "")}">
    <input type="text" placeholder="Ингредиент" aria-label="Название ингредиента" value="${escapeHTML(ingredient.name || "")}">
    <button type="button" class="remove-ingredient" aria-label="Удалить ингредиент">×</button>`;
  row.querySelector(".remove-ingredient").addEventListener("click", () => row.remove());
  $("#ingredientEditor").append(row);
}
function saveRecipe(event) {
  event.preventDefault();
  const ingredients = [...$("#ingredientEditor").children].map(row => {
    const fields = row.querySelectorAll("input");
    return {amount: fields[0].value === "" ? null : Number(fields[0].value), unit: fields[1].value.trim(), name: fields[2].value.trim()};
  }).filter(item => item.name);
  if (!ingredients.length) {
    alert("Добавь хотя бы один ингредиент.");
    return;
  }
  const existing = recipes.find(r => r.id === currentRecipeId);
  const recipe = {
    id: currentRecipeId || crypto.randomUUID(),
    name: $("#recipeName").value.trim(),
    category: $("#recipeCategory").value,
    time: $("#recipeTime").value.trim(),
    description: $("#recipeDescription").value.trim(),
    servings: existing?.servings || 2,
    ingredients,
    steps: $("#recipeSteps").value.trim(),
    favorite: existing?.favorite || false
  };
  if (existing) recipes = recipes.map(r => r.id === currentRecipeId ? recipe : r);
  else recipes.unshift(recipe);
  saveRecipes();
  recipeDialog.close();
  render();
}
function openDetails(id) {
  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return;
  currentRecipeId = id;
  currentServings = recipe.servings || 2;
  $("#detailCategory").textContent = recipe.category.toLocaleUpperCase("ru");
  $("#detailName").textContent = recipe.name;
  $("#detailDescription").textContent = recipe.description || "";
  $("#detailTime").textContent = `◷ ${recipe.time || "Время не указано"}`;
  $("#detailBaseServings").textContent = `♧ Базовый рецепт: ${recipe.servings} порц.`;
  $("#servingValue").textContent = currentServings;
  $("#detailSteps").textContent = recipe.steps;
  $("#favoriteRecipe").textContent = recipe.favorite ? "♥ В избранном" : "♡ В избранное";
  renderScaledIngredients();
  detailDialog.showModal();
}
function renderScaledIngredients() {
  const recipe = recipes.find(r => r.id === currentRecipeId);
  if (!recipe) return;
  $("#servingValue").textContent = currentServings;
  const factor = currentServings / (recipe.servings || 1);
  $("#detailIngredients").innerHTML = recipe.ingredients.map(item => {
    const amount = item.amount === null ? "" : formatAmount(item.amount * factor);
    return `<li><span class="ingredient-amount">${amount} ${escapeHTML(item.unit)}</span>${escapeHTML(item.name)}</li>`;
  }).join("");
}
function changeServings(delta) {
  currentServings = Math.max(1, Math.min(100, currentServings + delta));
  renderScaledIngredients();
}

$("#addRecipeTop").addEventListener("click", () => openAddDialog());
$("#addRecipeButton").addEventListener("click", () => openAddDialog());
$("#emptyAddButton").addEventListener("click", () => openAddDialog());
$("#closeDialog").addEventListener("click", () => recipeDialog.close());
$("#cancelDialog").addEventListener("click", () => recipeDialog.close());
$("#recipeForm").addEventListener("submit", saveRecipe);
$("#addIngredient").addEventListener("click", () => addIngredientRow());
$("#closeDetail").addEventListener("click", () => detailDialog.close());
$("#servingMinus").addEventListener("click", () => changeServings(-1));
$("#servingPlus").addEventListener("click", () => changeServings(1));
$("#searchInput").addEventListener("input", render);

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => {
  activeFilter = button.dataset.filter;
  document.querySelectorAll(".nav-item").forEach(item => item.classList.toggle("active", item === button));
  render();
}));

$("#recipeList").addEventListener("click", event => {
  const favoriteButton = event.target.closest("[data-favorite]");
  if (favoriteButton) {
    event.stopPropagation();
    const recipe = recipes.find(r => r.id === favoriteButton.dataset.favorite);
    recipe.favorite = !recipe.favorite;
    saveRecipes();
    render();
    return;
  }
  const card = event.target.closest(".recipe-card");
  if (card) openDetails(card.dataset.id);
});
$("#recipeList").addEventListener("keydown", event => {
  if ((event.key === "Enter" || event.key === " ") && event.target.classList.contains("recipe-card")) {
    event.preventDefault();
    openDetails(event.target.dataset.id);
  }
});
$("#editRecipe").addEventListener("click", () => {
  const recipe = recipes.find(r => r.id === currentRecipeId);
  detailDialog.close();
  openAddDialog(recipe);
});
$("#deleteRecipe").addEventListener("click", () => {
  const recipe = recipes.find(r => r.id === currentRecipeId);
  if (!recipe || !confirm(`Удалить рецепт «${recipe.name}»?`)) return;
  recipes = recipes.filter(r => r.id !== currentRecipeId);
  saveRecipes();
  detailDialog.close();
  render();
});
$("#favoriteRecipe").addEventListener("click", () => {
  const recipe = recipes.find(r => r.id === currentRecipeId);
  if (!recipe) return;
  recipe.favorite = !recipe.favorite;
  saveRecipes();
  $("#favoriteRecipe").textContent = recipe.favorite ? "♥ В избранном" : "♡ В избранное";
  render();
});

render();
