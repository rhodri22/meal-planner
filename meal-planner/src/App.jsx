import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Star, X, Minus, ChefHat, Calendar, ShoppingBasket, Package,
  Edit3, Trash2, Search, Check, ChevronLeft, ChevronRight, Trash,
  RotateCcw, Filter, RefreshCw, Shuffle, Play, Link, ClipboardList,
  UtensilsCrossed, Repeat2
} from 'lucide-react';
import './App.css';
import { supabase, HOUSEHOLD_ID } from './supabase.js';

// ============================================================
// CONSTANTS
// ============================================================
const STORAGE_KEY = 'meal-planner-v1';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_SHORT = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };
const DAY_LONG = { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' };

const AISLES = [
  { id: 'produce', label: 'Produce' },
  { id: 'meat', label: 'Meat' },
  { id: 'fish', label: 'Fish' },
  { id: 'dairy', label: 'Dairy & eggs' },
  { id: 'pantry', label: 'Pantry' },
  { id: 'spices', label: 'Spices' },
  { id: 'bakery', label: 'Bakery' },
  { id: 'frozen', label: 'Frozen' },
  { id: 'other', label: 'Other' },
];

const TAGS = ['quick', 'veggie', 'high-iron', 'high-protein', 'comfort', 'freezer-friendly', 'one-tray', 'weeknight', 'weekend', 'meal-prep'];

const COMMON_PANTRY = ['salt', 'black pepper', 'olive oil', 'butter', 'garlic', 'onion'];

const MEAL_TYPES = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch',     label: 'Lunch',     emoji: '☀️'  },
  { id: 'dinner',    label: 'Dinner',    emoji: '🌙' },
  { id: 'snack',     label: 'Snack',     emoji: '🫐' },
];

const CARD_COLORS = ['#B83F2A','#5F6B4E','#8B2635','#C8780A','#2E5E74','#6B4226','#1F5F5B','#7B3F6B'];

function getCardColor(id) {
  if (!id) return CARD_COLORS[0];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return CARD_COLORS[Math.abs(h) % CARD_COLORS.length];
}

function getCuisineEmoji(cuisine) {
  const c = (cuisine || '').toLowerCase();
  if (c.includes('mexican')) return '🌮';
  if (c.includes('thai')) return '🍜';
  if (c.includes('indian')) return '🍛';
  if (c.includes('italian')) return '🍝';
  if (c.includes('chinese')) return '🥡';
  if (c.includes('vietnamese')) return '🍱';
  if (c.includes('korean')) return '🥘';
  if (c.includes('greek') || c.includes('mediterranean')) return '🫒';
  if (c.includes('middle eastern')) return '🧆';
  if (c.includes('modern')) return '🍽️';
  return '🍴';
}

// ============================================================
// SEED RECIPES
// ============================================================
const SEED_RECIPES = [
  {
    id: 'turkey-chili',
    name: 'Turkey Mince Chili',
    cuisine: 'Mexican',
    time: '50 min',
    servings: 2,
    tags: ['high-iron', 'high-protein', 'comfort', 'freezer-friendly', 'weeknight'],
    notes: 'Tastes even better the next day. Black beans and kidney beans are excellent iron and magnesium sources. For heat, add a chopped jalapeño with the peppers.',
    ingredients: [
      { name: 'turkey mince', amount: 400, unit: 'g', aisle: 'meat' },
      { name: 'large onion', amount: 1, unit: '', aisle: 'produce' },
      { name: 'garlic cloves', amount: 4, unit: '', aisle: 'produce' },
      { name: 'red bell pepper', amount: 1, unit: '', aisle: 'produce' },
      { name: 'green bell pepper', amount: 1, unit: '', aisle: 'produce' },
      { name: 'tin chopped tomatoes', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'tin kidney beans', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'tin black beans', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'tomato paste', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'chicken stock', amount: 200, unit: 'ml', aisle: 'pantry' },
      { name: 'ground cumin', amount: 2, unit: 'tsp', aisle: 'spices' },
      { name: 'smoked paprika', amount: 2, unit: 'tsp', aisle: 'spices' },
      { name: 'chili powder', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'dried oregano', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'olive oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'salmon-quinoa',
    name: 'Baked Salmon with Quinoa & Garlicky Spinach',
    cuisine: 'Mediterranean',
    time: '30 min',
    servings: 2,
    tags: ['quick', 'high-protein', 'high-iron', 'weeknight'],
    notes: 'If still frozen, go straight from freezer to oven — add 5 extra minutes. Quinoa is a complete protein and a superb source of magnesium and iron. Adjust amounts to taste.',
    ingredients: [
      { name: 'salmon fillets', amount: 2, unit: '', aisle: 'fish' },
      { name: 'quinoa', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'baby spinach', amount: 200, unit: 'g', aisle: 'produce' },
      { name: 'garlic cloves', amount: 3, unit: '', aisle: 'produce' },
      { name: 'lemon', amount: 1, unit: '', aisle: 'produce' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'smoked paprika', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'chili flakes', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'viet-roast-chicken',
    name: 'Vietnamese-Style Roast Chicken & Asian Veggies',
    cuisine: 'Vietnamese',
    time: '1h 30min',
    servings: 4,
    tags: ['weekend', 'comfort', 'high-protein', 'one-tray'],
    notes: "Stuff the cavity with bruised lemongrass and ginger. Carrots and bok choy go in for the last 20 minutes so they keep their bite. Reserve the pan juices — they're brilliant spooned over rice.",
    ingredients: [
      { name: 'whole chicken', amount: 1.5, unit: 'kg', aisle: 'meat' },
      { name: 'lemongrass stalks', amount: 2, unit: '', aisle: 'produce' },
      { name: 'fresh ginger', amount: 30, unit: 'g', aisle: 'produce' },
      { name: 'garlic cloves', amount: 6, unit: '', aisle: 'produce' },
      { name: 'spring onions', amount: 4, unit: '', aisle: 'produce' },
      { name: 'bok choy', amount: 4, unit: '', aisle: 'produce' },
      { name: 'carrots', amount: 2, unit: '', aisle: 'produce' },
      { name: 'red chili', amount: 1, unit: '', aisle: 'produce' },
      { name: 'lime', amount: 1, unit: '', aisle: 'produce' },
      { name: 'fish sauce', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'honey', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'vegetable oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'five-spice powder', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'thai-red-prawn-curry',
    name: 'Thai Red Prawn Curry',
    cuisine: 'Thai',
    time: '30 min',
    servings: 2,
    tags: ['quick', 'high-protein', 'weeknight'],
    notes: "If your curry paste lacks heat, add a sliced red chili. The prawns go in at the very end — 3–4 minutes is plenty. Don't skip the lime at the finish.",
    ingredients: [
      { name: 'raw king prawns', amount: 300, unit: 'g', aisle: 'fish' },
      { name: 'red curry paste', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'coconut milk', amount: 400, unit: 'ml', aisle: 'pantry' },
      { name: 'jasmine rice', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'red bell pepper', amount: 1, unit: '', aisle: 'produce' },
      { name: 'baby corn', amount: 100, unit: 'g', aisle: 'produce' },
      { name: 'garlic cloves', amount: 2, unit: '', aisle: 'produce' },
      { name: 'fresh ginger', amount: 15, unit: 'g', aisle: 'produce' },
      { name: 'lime', amount: 1, unit: '', aisle: 'produce' },
      { name: 'Thai basil', amount: 1, unit: 'handful', aisle: 'produce' },
      { name: 'fish sauce', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'brown sugar', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'vegetable oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'chicken-couscous-salad',
    name: 'Grilled Chicken Salad with Pearl Couscous & Crispy Chickpeas',
    cuisine: 'Mediterranean',
    time: '35 min',
    servings: 2,
    tags: ['high-protein', 'meal-prep', 'weeknight', 'quick'],
    notes: 'Roast the chickpeas at 200°C for 25 min with oil and paprika until crackly. A bit of lemon zest in the dressing makes the whole thing sing.',
    ingredients: [
      { name: 'chicken breasts', amount: 2, unit: '', aisle: 'meat' },
      { name: 'pearl couscous', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'tin chickpeas', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'mixed salad leaves', amount: 100, unit: 'g', aisle: 'produce' },
      { name: 'cherry tomatoes', amount: 200, unit: 'g', aisle: 'produce' },
      { name: 'cucumber', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'red onion', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'feta', amount: 100, unit: 'g', aisle: 'dairy' },
      { name: 'lemon', amount: 1, unit: '', aisle: 'produce' },
      { name: 'olive oil', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'smoked paprika', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'ground cumin', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'dried oregano', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'lentil-tahini-bowl',
    name: 'Roasted Veggie & Lentil Bowl with Tahini Dressing',
    cuisine: 'Middle Eastern',
    time: '45 min',
    servings: 2,
    tags: ['veggie', 'high-iron', 'high-protein', 'meal-prep', 'comfort'],
    notes: "Loosen the tahini with warm water — it'll seize on you otherwise. Toast the pumpkin seeds dry in a pan for an extra layer of crunch.",
    ingredients: [
      { name: 'green or brown lentils', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'sweet potato', amount: 1, unit: '', aisle: 'produce' },
      { name: 'courgette', amount: 1, unit: '', aisle: 'produce' },
      { name: 'red bell pepper', amount: 1, unit: '', aisle: 'produce' },
      { name: 'red onion', amount: 1, unit: '', aisle: 'produce' },
      { name: 'baby spinach', amount: 100, unit: 'g', aisle: 'produce' },
      { name: 'garlic cloves', amount: 2, unit: '', aisle: 'produce' },
      { name: 'lemon', amount: 1, unit: '', aisle: 'produce' },
      { name: 'tahini', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'olive oil', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'pumpkin seeds', amount: 30, unit: 'g', aisle: 'pantry' },
      { name: 'ground cumin', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'smoked paprika', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'sweet-potato-enchiladas',
    name: 'Black Bean & Sweet Potato Enchiladas',
    cuisine: 'Mexican',
    time: '50 min',
    servings: 2,
    tags: ['veggie', 'comfort', 'high-iron', 'freezer-friendly', 'weeknight'],
    notes: 'Roast the sweet potato cubes first — colder cubes hold their shape when wrapped. A dollop of sour cream on top is non-negotiable.',
    ingredients: [
      { name: 'sweet potato', amount: 2, unit: '', aisle: 'produce' },
      { name: 'tin black beans', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'corn tortillas', amount: 6, unit: '', aisle: 'bakery' },
      { name: 'tin chopped tomatoes', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'grated cheddar', amount: 100, unit: 'g', aisle: 'dairy' },
      { name: 'onion', amount: 1, unit: '', aisle: 'produce' },
      { name: 'garlic cloves', amount: 3, unit: '', aisle: 'produce' },
      { name: 'lime', amount: 1, unit: '', aisle: 'produce' },
      { name: 'fresh coriander', amount: 1, unit: 'handful', aisle: 'produce' },
      { name: 'tomato paste', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'ground cumin', amount: 2, unit: 'tsp', aisle: 'spices' },
      { name: 'smoked paprika', amount: 2, unit: 'tsp', aisle: 'spices' },
      { name: 'chili powder', amount: 1, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'chicken-chickpea-curry',
    name: 'Chicken & Chickpea Coconut Curry with Spinach',
    cuisine: 'Indian',
    time: '40 min',
    servings: 2,
    tags: ['comfort', 'high-iron', 'high-protein', 'freezer-friendly', 'weeknight'],
    notes: 'Thighs over breasts here — they stay tender. Stir the spinach in at the very end so it wilts but stays green.',
    ingredients: [
      { name: 'boneless chicken thighs', amount: 400, unit: 'g', aisle: 'meat' },
      { name: 'tin chickpeas', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'coconut milk', amount: 400, unit: 'ml', aisle: 'pantry' },
      { name: 'baby spinach', amount: 150, unit: 'g', aisle: 'produce' },
      { name: 'onion', amount: 1, unit: '', aisle: 'produce' },
      { name: 'garlic cloves', amount: 3, unit: '', aisle: 'produce' },
      { name: 'fresh ginger', amount: 20, unit: 'g', aisle: 'produce' },
      { name: 'fresh coriander', amount: 1, unit: 'handful', aisle: 'produce' },
      { name: 'tomato paste', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'basmati rice', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'vegetable oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'ground coriander', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'ground cumin', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'turmeric', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'garam masala', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'cayenne pepper', amount: 0.25, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'orange-pork-tenderloin',
    name: 'Orange-Glazed Pork Tenderloin with Sweet Potato & Broccoli',
    cuisine: 'Modern',
    time: '40 min',
    servings: 2,
    tags: ['high-protein', 'one-tray', 'weekend'],
    notes: 'Sear the tenderloin first for colour, then finish in the oven with the glaze brushed on. Internal temp 63°C, then rest 8 minutes before slicing.',
    ingredients: [
      { name: 'pork tenderloin', amount: 500, unit: 'g', aisle: 'meat' },
      { name: 'sweet potato', amount: 2, unit: '', aisle: 'produce' },
      { name: 'tenderstem broccoli', amount: 200, unit: 'g', aisle: 'produce' },
      { name: 'orange', amount: 1, unit: '', aisle: 'produce' },
      { name: 'garlic cloves', amount: 3, unit: '', aisle: 'produce' },
      { name: 'fresh ginger', amount: 15, unit: 'g', aisle: 'produce' },
      { name: 'honey', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'Dijon mustard', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'air-fryer-tandoori',
    name: 'Air Fryer Tandoori Chicken with Raita & Kachumber',
    cuisine: 'Indian',
    time: '35 min (+ marinade)',
    servings: 2,
    tags: ['quick', 'high-protein', 'weeknight'],
    notes: 'Marinate at least 30 minutes, ideally overnight. Air fryer at 200°C for 12–15 minutes. Use half the yogurt for the marinade, half for the raita.',
    ingredients: [
      { name: 'boneless chicken thighs', amount: 400, unit: 'g', aisle: 'meat' },
      { name: 'Greek yogurt', amount: 200, unit: 'g', aisle: 'dairy' },
      { name: 'cucumber', amount: 1, unit: '', aisle: 'produce' },
      { name: 'tomatoes', amount: 2, unit: '', aisle: 'produce' },
      { name: 'red onion', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'fresh mint', amount: 1, unit: 'handful', aisle: 'produce' },
      { name: 'fresh coriander', amount: 1, unit: 'handful', aisle: 'produce' },
      { name: 'garlic cloves', amount: 3, unit: '', aisle: 'produce' },
      { name: 'fresh ginger', amount: 20, unit: 'g', aisle: 'produce' },
      { name: 'lemon', amount: 1, unit: '', aisle: 'produce' },
      { name: 'green chili', amount: 1, unit: '', aisle: 'produce' },
      { name: 'garam masala', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'turmeric', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'smoked paprika', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'ground cumin', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'ground coriander', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'pork-chops-apple',
    name: 'Pork Chops with Apple, Honey-Mustard Glaze & Sweet Potato',
    cuisine: 'Modern',
    time: '40 min',
    servings: 2,
    tags: ['comfort', 'weeknight', 'high-protein'],
    notes: "Pat the chops dry — wet pork won't sear. Add the apple wedges to the pan in the last 4 minutes so they soften but hold their shape.",
    ingredients: [
      { name: 'pork chops', amount: 2, unit: '', aisle: 'meat' },
      { name: 'apple', amount: 1, unit: '', aisle: 'produce' },
      { name: 'sweet potato', amount: 2, unit: '', aisle: 'produce' },
      { name: 'garlic cloves', amount: 2, unit: '', aisle: 'produce' },
      { name: 'fresh thyme', amount: 1, unit: 'tsp', aisle: 'produce' },
      { name: 'Dijon mustard', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'wholegrain mustard', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'honey', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'butter', amount: 20, unit: 'g', aisle: 'dairy' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'marry-me-chicken',
    name: 'Marry Me Chicken & Cannellini Beans',
    cuisine: 'Italian',
    time: '35 min',
    servings: 2,
    tags: ['comfort', 'weeknight', 'high-protein', 'freezer-friendly'],
    notes: 'Use the oil from the sun-dried tomato jar for searing — extra flavour for free. Cannellini beans bring a creamy backbone without needing more cream.',
    ingredients: [
      { name: 'chicken breasts', amount: 2, unit: '', aisle: 'meat' },
      { name: 'tin cannellini beans', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'sun-dried tomatoes', amount: 80, unit: 'g', aisle: 'pantry' },
      { name: 'baby spinach', amount: 100, unit: 'g', aisle: 'produce' },
      { name: 'garlic cloves', amount: 4, unit: '', aisle: 'produce' },
      { name: 'fresh basil', amount: 1, unit: 'handful', aisle: 'produce' },
      { name: 'double cream', amount: 200, unit: 'ml', aisle: 'dairy' },
      { name: 'parmesan', amount: 50, unit: 'g', aisle: 'dairy' },
      { name: 'butter', amount: 20, unit: 'g', aisle: 'dairy' },
      { name: 'chicken stock', amount: 150, unit: 'ml', aisle: 'pantry' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'dried oregano', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'chili flakes', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'sesame-turkey-noodles',
    name: 'Sesame Ginger Turkey Mince Noodles',
    cuisine: 'Chinese-inspired',
    time: '25 min',
    servings: 2,
    tags: ['quick', 'high-protein', 'meal-prep', 'weeknight'],
    notes: "Brown the mince until crispy in places — that texture is the whole dish. Toss the noodles in off the heat so they don't turn to mush. Keeps well for 3 days.",
    ingredients: [
      { name: 'turkey mince', amount: 400, unit: 'g', aisle: 'meat' },
      { name: 'medium egg noodles', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'bok choy', amount: 2, unit: '', aisle: 'produce' },
      { name: 'spring onions', amount: 4, unit: '', aisle: 'produce' },
      { name: 'garlic cloves', amount: 3, unit: '', aisle: 'produce' },
      { name: 'fresh ginger', amount: 25, unit: 'g', aisle: 'produce' },
      { name: 'red chili', amount: 1, unit: '', aisle: 'produce' },
      { name: 'soy sauce', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'oyster sauce', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'rice wine vinegar', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'honey', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'sesame seeds', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'vegetable oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'crispy-tofu-peanut-noodles',
    name: 'Crispy Tofu & Broccoli with Peanut Noodles',
    cuisine: 'Asian-fusion',
    time: '35 min',
    servings: 2,
    tags: ['veggie', 'high-protein', 'meal-prep', 'weeknight'],
    notes: "Press the tofu for at least 20 minutes — the drier it is, the crispier it gets. Coat in cornstarch before frying. The peanut sauce thickens as it sits; loosen with a splash of warm water.",
    ingredients: [
      { name: 'firm tofu', amount: 400, unit: 'g', aisle: 'other' },
      { name: 'rice noodles', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'tenderstem broccoli', amount: 200, unit: 'g', aisle: 'produce' },
      { name: 'spring onions', amount: 3, unit: '', aisle: 'produce' },
      { name: 'red chili', amount: 1, unit: '', aisle: 'produce' },
      { name: 'garlic cloves', amount: 2, unit: '', aisle: 'produce' },
      { name: 'fresh ginger', amount: 15, unit: 'g', aisle: 'produce' },
      { name: 'lime', amount: 1, unit: '', aisle: 'produce' },
      { name: 'peanut butter', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'soy sauce', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'rice wine vinegar', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'honey', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'cornstarch', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sesame seeds', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'vegetable oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'pork-bulgogi-bowl',
    name: 'Korean-Style Pork Bulgogi Bowl',
    cuisine: 'Korean',
    time: '30 min',
    servings: 2,
    tags: ['high-protein', 'meal-prep', 'weeknight', 'quick'],
    notes: "Gochujang is in most Asian supermarkets. If you can't find it, sriracha and miso (2:1) is a reasonable swap. Prep a double batch of the pork — it reheats brilliantly.",
    ingredients: [
      { name: 'pork mince', amount: 400, unit: 'g', aisle: 'meat' },
      { name: 'jasmine rice', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'cucumber', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'spring onions', amount: 3, unit: '', aisle: 'produce' },
      { name: 'garlic cloves', amount: 3, unit: '', aisle: 'produce' },
      { name: 'fresh ginger', amount: 20, unit: 'g', aisle: 'produce' },
      { name: 'gochujang', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'rice wine vinegar', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'brown sugar', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sesame seeds', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'vegetable oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'hoisin-chicken-noodles',
    name: 'Hoisin Chicken Noodle Stir-Fry',
    cuisine: 'Chinese-inspired',
    time: '25 min',
    servings: 2,
    tags: ['quick', 'high-protein', 'meal-prep', 'weeknight'],
    notes: "Slice the chicken thin so it cooks in under 3 minutes. High heat, quick toss — the whole wok stage is 10 minutes once everything is prepped. Fresh udon work best; dried are fine.",
    ingredients: [
      { name: 'boneless chicken thighs', amount: 400, unit: 'g', aisle: 'meat' },
      { name: 'udon noodles', amount: 300, unit: 'g', aisle: 'pantry' },
      { name: 'pak choi', amount: 2, unit: '', aisle: 'produce' },
      { name: 'carrot', amount: 1, unit: '', aisle: 'produce' },
      { name: 'sugar snap peas', amount: 100, unit: 'g', aisle: 'produce' },
      { name: 'spring onions', amount: 3, unit: '', aisle: 'produce' },
      { name: 'garlic cloves', amount: 3, unit: '', aisle: 'produce' },
      { name: 'fresh ginger', amount: 20, unit: 'g', aisle: 'produce' },
      { name: 'hoisin sauce', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'oyster sauce', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sesame oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'vegetable oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'greek-chicken-orzo',
    name: 'Greek Chicken & Orzo Salad',
    cuisine: 'Greek',
    time: '30 min',
    servings: 2,
    tags: ['high-protein', 'meal-prep', 'weeknight', 'quick'],
    notes: 'Dress the orzo while still warm — it absorbs flavour much better than cold. Holds well in the fridge for 2 days; add an extra squeeze of lemon before serving.',
    ingredients: [
      { name: 'chicken breasts', amount: 2, unit: '', aisle: 'meat' },
      { name: 'orzo', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'cherry tomatoes', amount: 200, unit: 'g', aisle: 'produce' },
      { name: 'cucumber', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'kalamata olives', amount: 80, unit: 'g', aisle: 'pantry' },
      { name: 'red onion', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'feta', amount: 100, unit: 'g', aisle: 'dairy' },
      { name: 'fresh parsley', amount: 1, unit: 'handful', aisle: 'produce' },
      { name: 'fresh mint', amount: 1, unit: 'handful', aisle: 'produce' },
      { name: 'lemon', amount: 1, unit: '', aisle: 'produce' },
      { name: 'olive oil', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'dried oregano', amount: 1.5, unit: 'tsp', aisle: 'spices' },
      { name: 'garlic powder', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'aubergine-halloumi-salad',
    name: 'Roasted Aubergine & Halloumi Salad with Pomegranate',
    cuisine: 'Mediterranean',
    time: '40 min',
    servings: 2,
    tags: ['veggie', 'comfort', 'weekend', 'meal-prep'],
    notes: "Salt the aubergine and leave 10 minutes before roasting — removes bitterness and helps it crisp. Toast the pine nuts in a dry pan, 2 minutes max. Grill the halloumi last so it's warm when you plate up.",
    ingredients: [
      { name: 'large aubergine', amount: 1, unit: '', aisle: 'produce' },
      { name: 'halloumi', amount: 250, unit: 'g', aisle: 'dairy' },
      { name: 'rocket', amount: 80, unit: 'g', aisle: 'produce' },
      { name: 'pomegranate seeds', amount: 80, unit: 'g', aisle: 'produce' },
      { name: 'cucumber', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'red onion', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'fresh mint', amount: 1, unit: 'handful', aisle: 'produce' },
      { name: 'pine nuts', amount: 30, unit: 'g', aisle: 'pantry' },
      { name: 'lemon', amount: 1, unit: '', aisle: 'produce' },
      { name: 'tahini', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'olive oil', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'honey', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'ground cumin', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'smoked paprika', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'salt', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black pepper', amount: 0.5, unit: 'tsp', aisle: 'spices' },
    ],
  },
];

// ============================================================
// DEFAULT STATE
// ============================================================
const DEFAULT_STATE = {
  recipes: SEED_RECIPES,
  pantry: [],
  week: Object.fromEntries(DAYS.map(d => [d, null])),
  favourites: [],
  shoppingChecked: [],
  seedSeen: SEED_RECIPES.map(r => r.id),
};

// ============================================================
// UTILITIES
// ============================================================
function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function normalizeName(name) {
  return (name || '').toLowerCase().trim();
}

function formatNum(n) {
  if (n === 0) return '0';
  const rounded = Math.round(n * 100) / 100;
  if (rounded < 0.1) return rounded.toFixed(2);
  if (rounded % 1 === 0) return rounded.toString();
  return rounded.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function formatAmount(amount, unit) {
  const num = formatNum(amount);
  return unit ? `${num} ${unit}` : num;
}

function getDateLabel() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

function aggregateShoppingList(week, recipes, pantry) {
  const map = new Map();
  Object.values(week).forEach(slot => {
    if (!slot || slot.isLeftover) return; // skip empty and leftover days
    const recipe = recipes.find(r => r.id === slot.recipeId);
    if (!recipe) return;
    const factor = (slot.servings || recipe.servings) / recipe.servings;
    recipe.ingredients.forEach(ing => {
      const key = `${normalizeName(ing.name)}|${ing.unit || ''}`;
      const existing = map.get(key);
      const scaled = ing.amount * factor;
      if (existing) {
        existing.amount += scaled;
        if (!existing.recipes.includes(recipe.name)) existing.recipes.push(recipe.name);
      } else {
        map.set(key, { key, name: ing.name, unit: ing.unit, amount: scaled, aisle: ing.aisle || 'other', recipes: [recipe.name] });
      }
    });
  });
  const pantrySet = new Set(pantry.map(normalizeName));
  const filtered = [...map.values()].filter(i => !pantrySet.has(normalizeName(i.name)));
  const byAisle = {};
  filtered.forEach(i => {
    if (!byAisle[i.aisle]) byAisle[i.aisle] = [];
    byAisle[i.aisle].push(i);
  });
  Object.values(byAisle).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
  return byAisle;
}

function allIngredientNames(recipes) {
  const set = new Set();
  recipes.forEach(r => r.ingredients.forEach(i => set.add(i.name)));
  return [...set].sort();
}

// Ensure every recipe has all current fields (handles old stored data gracefully)
function applyRecipeDefaults(r) {
  return { photo: null, mealType: 'dinner', makesLeftovers: false, steps: [], ...r };
}

// Merge any new seed recipes into stored data without overwriting edits or resurrecting deletions
function mergeSeedRecipes(stored) {
  const seedSeen = new Set(stored.seedSeen || []);
  const existingIds = new Set((stored.recipes || []).map(r => r.id));
  const newSeeds = SEED_RECIPES.filter(s => !seedSeen.has(s.id) && !existingIds.has(s.id));
  return {
    ...DEFAULT_STATE,
    ...stored,
    recipes: [...(stored.recipes || []), ...newSeeds].map(applyRecipeDefaults),
    seedSeen: [...new Set([...(stored.seedSeen || []), ...SEED_RECIPES.map(s => s.id)])],
  };
}

// ============================================================
// MAIN APP
// ============================================================
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('recipes');
  const [openRecipeId, setOpenRecipeId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [cookModeRecipe, setCookModeRecipe] = useState(null);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState({ tags: [], favs: false, mealType: 'all' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const lastSavedAt = useRef(null);
  const isSyncing = useRef(false);

  // ── Load ──────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        if (supabase) {
          const { data: row, error } = await supabase
            .from('planner_state')
            .select('data')
            .eq('id', HOUSEHOLD_ID)
            .maybeSingle();

          if (!error && row?.data) {
            setData(mergeSeedRecipes(row.data));
            setSyncStatus('synced');
            setLoading(false);
            return;
          }
          // Row doesn't exist yet — first run on this household
          if (!error && !row) {
            const fresh = DEFAULT_STATE;
            setData(fresh);
            // Seed the row in Supabase so other devices can pick it up
            await supabase.from('planner_state')
              .insert({ id: HOUSEHOLD_ID, data: fresh, updated_at: new Date().toISOString() });
            setSyncStatus('synced');
            setLoading(false);
            return;
          }
        }
        // Supabase not configured or errored — fall back to localStorage
        const raw = localStorage.getItem(STORAGE_KEY);
        setData(raw ? mergeSeedRecipes(JSON.parse(raw)) : DEFAULT_STATE);
      } catch (e) {
        const raw = localStorage.getItem(STORAGE_KEY);
        setData(raw ? mergeSeedRecipes(JSON.parse(raw)) : DEFAULT_STATE);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Save (debounced) ──────────────────────────────────────
  useEffect(() => {
    if (!data || loading) return;
    const t = setTimeout(async () => {
      // Always persist locally so offline still works
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}

      if (!supabase) return;
      if (isSyncing.current) return;
      isSyncing.current = true;
      setSyncStatus('syncing');

      const timestamp = new Date().toISOString();
      lastSavedAt.current = timestamp;

      const { error } = await supabase
        .from('planner_state')
        .upsert({ id: HOUSEHOLD_ID, data, updated_at: timestamp });

      isSyncing.current = false;
      setSyncStatus(error ? 'offline' : 'synced');
    }, 400);
    return () => clearTimeout(t);
  }, [data, loading]);

  // ── Realtime subscription ─────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const channel = supabase
      .channel('planner-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planner_state', filter: `id=eq.${HOUSEHOLD_ID}` },
        (payload) => {
          if (!payload.new?.data) return;
          // Skip updates that we ourselves triggered
          if (payload.new.updated_at === lastSavedAt.current) return;
          setData(mergeSeedRecipes(payload.new.data));
          setSyncStatus('synced');
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const upsertRecipe = (r) => setData(d => {
    const exists = d.recipes.find(x => x.id === r.id);
    return {
      ...d,
      recipes: exists
        ? d.recipes.map(x => x.id === r.id ? r : x)
        : [...d.recipes, { ...r, id: r.id || uid() }],
    };
  });

  const deleteRecipe = (id) => setData(d => ({
    ...d,
    recipes: d.recipes.filter(r => r.id !== id),
    favourites: d.favourites.filter(fid => fid !== id),
    week: Object.fromEntries(Object.entries(d.week).map(([day, slot]) =>
      [day, slot?.recipeId === id ? null : slot])),
  }));

  const toggleFav = (id) => setData(d => ({
    ...d,
    favourites: d.favourites.includes(id) ? d.favourites.filter(f => f !== id) : [...d.favourites, id],
  }));

  const setDaySlot = (day, slot) => setData(d => ({ ...d, week: { ...d.week, [day]: slot } }));

  const togglePantry = (name) => setData(d => ({
    ...d,
    pantry: d.pantry.includes(name) ? d.pantry.filter(p => p !== name) : [...d.pantry, name],
  }));

  const toggleCheck = (key) => setData(d => ({
    ...d,
    shoppingChecked: d.shoppingChecked.includes(key)
      ? d.shoppingChecked.filter(k => k !== key)
      : [...d.shoppingChecked, key],
  }));

  const clearChecks = () => setData(d => ({ ...d, shoppingChecked: [] }));
  const clearWeek = () => setData(d => ({ ...d, week: Object.fromEntries(DAYS.map(day => [day, null])) }));

  const fillWeekRandom = () => {
    if (!data.recipes.length) return;
    const shuffled = [...data.recipes].sort(() => Math.random() - 0.5);
    let ri = 0;
    const newWeek = { ...data.week };
    DAYS.forEach(day => {
      if (!newWeek[day]) {
        newWeek[day] = { recipeId: shuffled[ri % shuffled.length].id, servings: shuffled[ri % shuffled.length].servings };
        ri++;
      }
    });
    setData(d => ({ ...d, week: newWeek }));
  };

  const markLeftover = (sourceDay) => {
    const idx = DAYS.indexOf(sourceDay);
    const nextDay = DAYS[idx + 1];
    if (!nextDay) return;
    const slot = data.week[sourceDay];
    if (!slot || slot.isLeftover) return;
    const recipe = data.recipes.find(r => r.id === slot.recipeId);
    setData(d => ({
      ...d,
      week: { ...d.week, [nextDay]: { isLeftover: true, fromDay: sourceDay, recipeName: recipe?.name || '' } }
    }));
  };

  if (loading || !data) return <Loader />;

  const openRecipe = openRecipeId ? data.recipes.find(r => r.id === openRecipeId) : null;

  const filteredRecipes = data.recipes.filter(r => {
    if (activeFilters.favs && !data.favourites.includes(r.id)) return false;
    if (activeFilters.tags.length && !activeFilters.tags.every(t => r.tags?.includes(t))) return false;
    if (activeFilters.mealType !== 'all' && r.mealType !== activeFilters.mealType) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.name.toLowerCase().includes(s) &&
          !r.ingredients.some(i => i.name.toLowerCase().includes(s)) &&
          !r.cuisine?.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const weekCount = Object.values(data.week).filter(s => s && !s.isLeftover).length;

  // If cook mode is active, render it full screen
  if (cookModeRecipe) {
    return <CookModeView recipe={cookModeRecipe} onClose={() => setCookModeRecipe(null)} />;
  }

  return (
    <div className="mp-root">
      <header className="mp-header">
        <div>
          <div className="mp-meta">{getDateLabel()}</div>
          <h1 className="mp-display mp-title">
            {{ recipes: 'Recipes', week: 'This Week', shopping: 'Shopping', pantry: 'Pantry' }[tab]}
          </h1>
          {tab === 'week' && weekCount > 0 && <div className="mp-subtitle">{weekCount} {weekCount === 1 ? 'meal' : 'meals'} planned</div>}
          {tab === 'recipes' && <div className="mp-subtitle">{filteredRecipes.length} of {data.recipes.length}</div>}
        </div>
        <div className="mp-header-actions">
          <SyncDot status={syncStatus} hasSupabase={!!supabase} />
          {tab === 'recipes' && <>
            <button className="mp-icon-btn" onClick={() => setImporting(true)} title="Import from URL"><Link size={18} /></button>
            <button className={`mp-icon-btn ${(activeFilters.tags.length || activeFilters.favs || activeFilters.mealType !== 'all') ? 'mp-icon-btn-active' : ''}`} onClick={() => setFilterOpen(true)}><Filter size={18} /></button>
            <button className="mp-icon-btn mp-icon-btn-primary" onClick={() => setEditing({})}><Plus size={20} /></button>
          </>}
          {tab === 'week' && <>
            <button className="mp-icon-btn" onClick={fillWeekRandom} title="Fill empty days randomly"><Shuffle size={18} /></button>
            {weekCount > 0 && <button className="mp-icon-btn" onClick={() => { if (window.confirm('Clear the whole week?')) clearWeek(); }}><RotateCcw size={18} /></button>}
          </>}
          {tab === 'shopping' && data.shoppingChecked.length > 0 && <button className="mp-icon-btn" onClick={clearChecks}><RotateCcw size={18} /></button>}
        </div>
      </header>

      {tab === 'recipes' && (
        <div className="mp-search-row">
          <div className="mp-search">
            <Search size={16} />
            <input type="text" placeholder="Search recipes & ingredients…" value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button className="mp-search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
          </div>
        </div>
      )}

      <main className="mp-main">
        {tab === 'recipes' && <RecipesTab recipes={filteredRecipes} favourites={data.favourites} onOpen={setOpenRecipeId} onToggleFav={toggleFav} isEmpty={data.recipes.length === 0} />}
        {tab === 'week' && <WeekTab week={data.week} recipes={data.recipes} onOpen={setOpenRecipeId} onUnassign={(day) => setDaySlot(day, null)} onMarkLeftover={markLeftover} />}
        {tab === 'shopping' && <ShoppingTab data={data} onToggleCheck={toggleCheck} />}
        {tab === 'pantry' && <PantryTab recipes={data.recipes} pantry={data.pantry} onToggle={togglePantry} />}
      </main>

      <nav className="mp-bottom-nav">
        <NavBtn icon={<ChefHat size={20} />} label="Recipes" active={tab === 'recipes'} onClick={() => setTab('recipes')} />
        <NavBtn icon={<Calendar size={20} />} label="Week" active={tab === 'week'} onClick={() => setTab('week')} badge={weekCount || null} />
        <NavBtn icon={<ShoppingBasket size={20} />} label="Shopping" active={tab === 'shopping'} onClick={() => setTab('shopping')} />
        <NavBtn icon={<Package size={20} />} label="Pantry" active={tab === 'pantry'} onClick={() => setTab('pantry')} />
      </nav>

      {openRecipe && (
        <RecipeDetailSheet
          recipe={openRecipe} week={data.week} isFav={data.favourites.includes(openRecipe.id)}
          onClose={() => setOpenRecipeId(null)} onToggleFav={() => toggleFav(openRecipe.id)}
          onEdit={() => { setEditing(openRecipe); setOpenRecipeId(null); }}
          onDelete={() => { if (window.confirm(`Delete "${openRecipe.name}"?`)) { deleteRecipe(openRecipe.id); setOpenRecipeId(null); } }}
          onAssignDay={(day, servings) => setDaySlot(day, { recipeId: openRecipe.id, servings })}
          onUnassignDay={(day) => setDaySlot(day, null)}
          onStartCook={() => { setOpenRecipeId(null); setCookModeRecipe(openRecipe); }}
        />
      )}

      {editing !== null && (
        <EditRecipeSheet recipe={editing} onClose={() => setEditing(null)} onSave={(r) => { upsertRecipe(r); setEditing(null); }} />
      )}

      {filterOpen && (
        <FilterSheet filters={activeFilters} setFilters={setActiveFilters} favourites={data.favourites} onClose={() => setFilterOpen(false)} />
      )}

      {importing && (
        <ImportSheet
          onClose={() => setImporting(false)}
          onSave={(r) => { upsertRecipe({ ...applyRecipeDefaults(r), id: uid() }); setImporting(false); }}
        />
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function SyncDot({ status, hasSupabase }) {
  if (!hasSupabase) return null;
  const map = {
    idle:    { cls: 'mp-sync-idle',    title: 'Connecting…' },
    syncing: { cls: 'mp-sync-syncing', title: 'Syncing…' },
    synced:  { cls: 'mp-sync-synced',  title: 'Synced across devices' },
    offline: { cls: 'mp-sync-offline', title: 'Offline — changes saved locally' },
  };
  const { cls, title } = map[status] || map.idle;
  return (
    <div className={`mp-sync-dot ${cls}`} title={title}>
      {status === 'syncing' && <RefreshCw size={10} />}
    </div>
  );
}

function Loader() {
  return (
    <div className="mp-root mp-loader">
      <div className="mp-display mp-loader-text">setting the table…</div>
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, badge }) {
  return (
    <button className={`mp-nav-btn ${active ? 'mp-nav-active' : ''}`} onClick={onClick}>
      <div className="mp-nav-icon-wrap">
        {icon}
        {badge ? <span className="mp-nav-badge">{badge}</span> : null}
      </div>
      <span className="mp-nav-label">{label}</span>
    </button>
  );
}

function RecipesTab({ recipes, favourites, onOpen, onToggleFav, isEmpty }) {
  if (isEmpty) return <div className="mp-empty"><div className="mp-display mp-empty-title">An empty kitchen.</div><p className="mp-empty-text">Tap + to add your first recipe.</p></div>;
  if (recipes.length === 0) return <div className="mp-empty"><div className="mp-display mp-empty-title">Nothing matches.</div><p className="mp-empty-text">Try clearing your search or filters.</p></div>;
  return (
    <div className="mp-recipe-list">
      {recipes.map(r => <RecipeCard key={r.id} recipe={r} isFav={favourites.includes(r.id)} onOpen={() => onOpen(r.id)} onToggleFav={() => onToggleFav(r.id)} />)}
    </div>
  );
}

function RecipeCard({ recipe, isFav, onOpen, onToggleFav }) {
  const mealTypeLabel = MEAL_TYPES.find(m => m.id === recipe.mealType);
  return (
    <article className="mp-card" onClick={onOpen} role="button">
      <div
        className="mp-card-photo"
        style={recipe.photo
          ? { backgroundImage: `url(${recipe.photo})` }
          : { background: getCardColor(recipe.id) }
        }
      >
        {!recipe.photo && <span className="mp-card-emoji">{getCuisineEmoji(recipe.cuisine)}</span>}
        <button
          className={`mp-fav-btn mp-fav-photo ${isFav ? 'mp-fav-on' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
          aria-label={isFav ? 'Unfavourite' : 'Favourite'}
        >
          <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="mp-card-body">
        <div className="mp-card-top">
          <div className="mp-card-meta">{recipe.cuisine || 'Recipe'} · {recipe.time || `serves ${recipe.servings}`}</div>
          {mealTypeLabel && mealTypeLabel.id !== 'dinner' && (
            <span className="mp-meal-badge">{mealTypeLabel.emoji} {mealTypeLabel.label}</span>
          )}
        </div>
        <h2 className="mp-display mp-card-title">{recipe.name}</h2>
        {recipe.tags?.length > 0 && (
          <div className="mp-tag-row">
            {recipe.tags.slice(0, 4).map(t => <span className="mp-tag" key={t}>{t}</span>)}
            {recipe.tags.length > 4 && <span className="mp-tag mp-tag-more">+{recipe.tags.length - 4}</span>}
          </div>
        )}
      </div>
    </article>
  );
}

function WeekTab({ week, recipes, onOpen, onUnassign, onMarkLeftover }) {
  return (
    <div className="mp-week">
      {DAYS.map(day => {
        const slot = week[day];
        const recipe = (slot && !slot.isLeftover) ? recipes.find(r => r.id === slot.recipeId) : null;
        const isLeftover = slot?.isLeftover;
        return (
          <div key={day} className="mp-week-row">
            <div className="mp-week-day"><div className="mp-display mp-week-daylabel">{DAY_LONG[day]}</div></div>
            {recipe ? (
              <div className="mp-week-card" onClick={() => onOpen(recipe.id)}>
                <div style={{flex:1, minWidth:0}}>
                  <div className="mp-week-recipe-meta">{recipe.cuisine || ''} {recipe.time ? `· ${recipe.time}` : ''}</div>
                  <div className="mp-display mp-week-recipe-name">{recipe.name}</div>
                  <div style={{display:'flex', alignItems:'center', gap:8, marginTop:2}}>
                    <div className="mp-week-servings">serves {slot.servings}</div>
                    {recipe.makesLeftovers && DAYS.indexOf(day) < 6 && !week[DAYS[DAYS.indexOf(day)+1]] && (
                      <button
                        className="mp-leftover-btn"
                        onClick={(e) => { e.stopPropagation(); onMarkLeftover(day); }}
                        title="Mark tomorrow as leftovers"
                      >
                        <Repeat2 size={12} /> leftovers tomorrow?
                      </button>
                    )}
                  </div>
                </div>
                <button className="mp-week-remove" onClick={(e) => { e.stopPropagation(); onUnassign(day); }}><X size={16} /></button>
              </div>
            ) : isLeftover ? (
              <div className="mp-week-leftover">
                <Repeat2 size={14} />
                <div>
                  <div className="mp-week-leftover-title">Leftovers</div>
                  <div className="mp-week-leftover-from">from {DAY_LONG[slot.fromDay]}: {slot.recipeName}</div>
                </div>
                <button className="mp-week-remove" onClick={() => onUnassign(day)}><X size={16} /></button>
              </div>
            ) : (
              <div className="mp-week-empty"><span>Nothing planned</span></div>
            )}
          </div>
        );
      })}
      <div className="mp-hint">Tap a recipe → assign it to a day. Tap <Shuffle size={12} style={{verticalAlign:'-2px'}} /> to fill the week randomly.</div>
    </div>
  );
}

function ShoppingTab({ data, onToggleCheck }) {
  const byAisle = useMemo(() => aggregateShoppingList(data.week, data.recipes, data.pantry), [data.week, data.recipes, data.pantry]);
  const totalItems = Object.values(byAisle).reduce((s, arr) => s + arr.length, 0);
  if (totalItems === 0) return <div className="mp-empty"><div className="mp-display mp-empty-title">Empty basket.</div><p className="mp-empty-text">Plan some meals for the week to fill this list.</p></div>;
  return (
    <div className="mp-shopping">
      <div className="mp-shopping-meta">{totalItems} {totalItems === 1 ? 'item' : 'items'} · {data.shoppingChecked.length} ticked</div>
      {AISLES.filter(a => byAisle[a.id]?.length).map(aisle => (
        <section key={aisle.id} className="mp-aisle">
          <h3 className="mp-aisle-label">{aisle.label}</h3>
          <ul className="mp-aisle-list">
            {byAisle[aisle.id].map(item => {
              const checked = data.shoppingChecked.includes(item.key);
              return (
                <li key={item.key} className={`mp-shopping-item ${checked ? 'mp-shopping-checked' : ''}`} onClick={() => onToggleCheck(item.key)}>
                  <div className={`mp-check ${checked ? 'mp-check-on' : ''}`}>{checked && <Check size={14} />}</div>
                  <div className="mp-shopping-text">
                    <div className="mp-shopping-name">{item.name}</div>
                    <div className="mp-shopping-sub">{formatAmount(item.amount, item.unit)}<span className="mp-shopping-from"> · {item.recipes.join(', ')}</span></div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function PantryTab({ recipes, pantry, onToggle }) {
  const known = useMemo(() => allIngredientNames(recipes), [recipes]);
  const [showAll, setShowAll] = useState(false);
  const commonNotYet = COMMON_PANTRY.filter(p => !pantry.includes(p));
  return (
    <div className="mp-pantry">
      <p className="mp-pantry-blurb">Mark what you already keep at home. Anything ticked is hidden from your shopping list.</p>
      {commonNotYet.length > 0 && (
        <div className="mp-pantry-quick">
          <div className="mp-pantry-quick-label">Quick add:</div>
          <div className="mp-tag-row">{commonNotYet.map(name => <button key={name} className="mp-tag mp-tag-btn" onClick={() => onToggle(name)}>+ {name}</button>)}</div>
        </div>
      )}
      {pantry.length > 0 && (
        <section className="mp-pantry-section">
          <h3 className="mp-aisle-label">In my pantry</h3>
          <div className="mp-tag-row">{pantry.map(name => <button key={name} className="mp-pantry-pill mp-pantry-pill-on" onClick={() => onToggle(name)}>{name} <X size={12} /></button>)}</div>
        </section>
      )}
      <section className="mp-pantry-section">
        <div className="mp-pantry-section-head">
          <h3 className="mp-aisle-label">From your recipes</h3>
          <button className="mp-link" onClick={() => setShowAll(s => !s)}>{showAll ? 'show less' : 'show all'}</button>
        </div>
        <div className="mp-tag-row">
          {(showAll ? known : known.slice(0, 18)).map(name => (
            <button key={name} className={`mp-pantry-pill ${pantry.includes(name) ? 'mp-pantry-pill-on' : ''}`} onClick={() => onToggle(name)}>{name}</button>
          ))}
          {!showAll && known.length > 18 && <button className="mp-pantry-pill mp-pantry-pill-more" onClick={() => setShowAll(true)}>+{known.length - 18} more</button>}
        </div>
      </section>
    </div>
  );
}

function RecipeDetailSheet({ recipe, week, isFav, onClose, onToggleFav, onEdit, onDelete, onAssignDay, onUnassignDay, onStartCook }) {
  const [servings, setServings] = useState(recipe.servings);
  const factor = servings / recipe.servings;
  const assignedDays = Object.entries(week).filter(([, s]) => s?.recipeId === recipe.id).map(([d]) => d);
  const hasSteps = recipe.steps?.length > 0;

  return (
    <div className="mp-sheet" onClick={onClose}>
      <div className="mp-sheet-content" onClick={e => e.stopPropagation()}>
        {/* Safe-area-aware sticky header */}
        <header className="mp-sheet-header mp-sheet-header-safe">
          <button className="mp-back" onClick={onClose} aria-label="Close"><ChevronLeft size={22} /></button>
          <button className={`mp-fav-btn mp-fav-big ${isFav ? 'mp-fav-on' : ''}`} onClick={onToggleFav}>
            <Star size={20} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </header>

        <div className="mp-sheet-body">
          <div className="mp-meta">{recipe.cuisine || 'Recipe'} · {recipe.time || `serves ${recipe.servings}`}</div>
          <h2 className="mp-display mp-sheet-title">{recipe.name}</h2>

          {recipe.tags?.length > 0 && <div className="mp-tag-row mp-tag-row-spacious">{recipe.tags.map(t => <span key={t} className="mp-tag">{t}</span>)}</div>}

          {/* Cook Mode entry */}
          <button
            className={`mp-cook-btn ${!hasSteps ? 'mp-cook-btn-dim' : ''}`}
            onClick={hasSteps ? onStartCook : undefined}
            title={hasSteps ? 'Start cook mode' : 'Add steps to use cook mode'}
          >
            <UtensilsCrossed size={18} />
            <span>{hasSteps ? `Cook Mode · ${recipe.steps.length} steps` : 'Cook Mode — add steps to enable'}</span>
            {hasSteps && <ChevronRight size={16} style={{marginLeft:'auto'}} />}
          </button>

          <section className="mp-sheet-section">
            <h3 className="mp-aisle-label">Servings</h3>
            <ServingsStepper value={servings} onChange={setServings} />
            {servings !== recipe.servings && <div className="mp-tiny">scaled from {recipe.servings}</div>}
          </section>

          <section className="mp-sheet-section">
            <h3 className="mp-aisle-label">Cook on</h3>
            <div className="mp-day-chips">
              {DAYS.map(day => {
                const slot = week[day];
                const mine = slot?.recipeId === recipe.id;
                const otherTaken = slot && !mine;
                return (
                  <button key={day} className={`mp-day-chip ${mine ? 'mp-day-chip-on' : ''} ${otherTaken ? 'mp-day-chip-busy' : ''}`}
                    onClick={() => {
                      if (mine) { onUnassignDay(day); }
                      else if (otherTaken) { if (window.confirm(`${DAY_LONG[day]} already has a meal. Replace it?`)) onAssignDay(day, servings); }
                      else { onAssignDay(day, servings); }
                    }}>
                    {DAY_SHORT[day]}
                  </button>
                );
              })}
            </div>
            {assignedDays.length > 0 && <div className="mp-tiny">on {assignedDays.map(d => DAY_LONG[d]).join(', ')}</div>}
          </section>

          <section className="mp-sheet-section">
            <h3 className="mp-aisle-label">Ingredients</h3>
            <ul className="mp-ing-list">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="mp-ing-row">
                  <span className="mp-ing-amount">{formatAmount(ing.amount * factor, ing.unit)}</span>
                  <span className="mp-ing-name">{ing.name}</span>
                </li>
              ))}
            </ul>
          </section>

          {recipe.notes && <section className="mp-sheet-section"><h3 className="mp-aisle-label">Notes</h3><p className="mp-notes">{recipe.notes}</p></section>}

          <div className="mp-sheet-actions">
            <button className="mp-btn mp-btn-ghost" onClick={onEdit}><Edit3 size={16} /> Edit</button>
            <button className="mp-btn mp-btn-danger" onClick={onDelete}><Trash2 size={16} /> Delete</button>
          </div>
        </div>

        {/* Accessible close button anchored to bottom — always thumb-reachable */}
        <div className="mp-sheet-close-footer">
          <button className="mp-sheet-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function CookModeView({ recipe, onClose }) {
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const steps = recipe.steps || [];

  // Keep screen awake while cooking
  useEffect(() => {
    let lock = null;
    navigator.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    return () => { lock?.release(); };
  }, []);

  return (
    <div className="mp-cookmode">
      <div className="mp-cookmode-header">
        <div>
          <div className="mp-cookmode-recipe-name">{recipe.name}</div>
          <div className="mp-cookmode-progress">
            {steps.length > 0 ? `Step ${step + 1} of ${steps.length}` : 'No steps'}
          </div>
        </div>
        <button className="mp-cookmode-close" onClick={onClose}><X size={22} /></button>
      </div>

      {/* Progress bar */}
      {steps.length > 0 && (
        <div className="mp-cookmode-bar">
          <div className="mp-cookmode-bar-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      )}

      <div className="mp-cookmode-body">
        {steps.length === 0 ? (
          <div className="mp-cookmode-empty">
            <UtensilsCrossed size={48} style={{opacity:0.3, marginBottom:16}} />
            <div style={{fontSize:22, fontWeight:500, marginBottom:8}}>No steps yet</div>
            <p style={{color:'rgba(255,255,255,0.6)', fontSize:15, lineHeight:1.6}}>
              Add cooking steps to this recipe in the editor to use Cook Mode.
            </p>
          </div>
        ) : (
          <>
            <div className="mp-cookmode-step-num">Step {step + 1}</div>
            <div className="mp-cookmode-step-text">{steps[step]}</div>
          </>
        )}
      </div>

      {/* Ingredient drawer */}
      <div className={`mp-cookmode-ingredients ${showIngredients ? 'open' : ''}`}>
        <button className="mp-cookmode-ing-toggle" onClick={() => setShowIngredients(s => !s)}>
          <ClipboardList size={16} />
          {showIngredients ? 'Hide ingredients' : 'Show ingredients'}
          <ChevronRight size={14} style={{ transform: showIngredients ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
        </button>
        {showIngredients && (
          <ul className="mp-cookmode-ing-list">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}><span style={{color:'rgba(255,255,255,0.5)', minWidth:80, display:'inline-block'}}>{formatAmount(ing.amount, ing.unit)}</span>{ing.name}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Navigation */}
      {steps.length > 0 && (
        <div className="mp-cookmode-nav">
          <button
            className={`mp-cookmode-nav-btn ${step === 0 ? 'disabled' : ''}`}
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ChevronLeft size={22} /> Prev
          </button>
          {step < steps.length - 1 ? (
            <button className="mp-cookmode-nav-btn mp-cookmode-nav-next" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight size={22} />
            </button>
          ) : (
            <button className="mp-cookmode-nav-btn mp-cookmode-nav-done" onClick={onClose}>
              <Check size={20} /> Done
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ServingsStepper({ value, onChange, min = 1 }) {
  return (
    <div className="mp-stepper">
      <button onClick={() => onChange(Math.max(min, value - 1))}><Minus size={16} /></button>
      <span className="mp-stepper-value">{value}</span>
      <button onClick={() => onChange(value + 1)}><Plus size={16} /></button>
    </div>
  );
}

function EditRecipeSheet({ recipe, onClose, onSave }) {
  const isNew = !recipe.id;
  const [form, setForm] = useState({
    id: recipe.id,
    name: recipe.name || '',
    cuisine: recipe.cuisine || '',
    time: recipe.time || '',
    servings: recipe.servings || 2,
    mealType: recipe.mealType || 'dinner',
    makesLeftovers: recipe.makesLeftovers || false,
    photo: recipe.photo || '',
    tags: recipe.tags || [],
    notes: recipe.notes || '',
    steps: recipe.steps || [],
    ingredients: recipe.ingredients?.length ? [...recipe.ingredients] : [{ name: '', amount: 1, unit: '', aisle: 'pantry' }],
  });
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setIng = (i, k, v) => setForm(f => ({ ...f, ingredients: f.ingredients.map((x, idx) => idx === i ? { ...x, [k]: v } : x) }));
  const addIng = () => setForm(f => ({ ...f, ingredients: [...f.ingredients, { name: '', amount: 1, unit: '', aisle: 'pantry' }] }));
  const removeIng = (i) => setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, idx) => idx !== i) }));
  const setStep = (i, v) => setForm(f => ({ ...f, steps: f.steps.map((s, idx) => idx === i ? v : s) }));
  const addStep = () => setForm(f => ({ ...f, steps: [...f.steps, ''] }));
  const removeStep = (i) => setForm(f => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }));
  const toggleTag = (t) => setField('tags', form.tags.includes(t) ? form.tags.filter(x => x !== t) : [...form.tags, t]);
  const canSave = form.name.trim() && form.ingredients.some(i => i.name.trim());
  const handleSave = () => onSave({
    ...form,
    name: form.name.trim(),
    servings: Number(form.servings) || 1,
    photo: form.photo || null,
    steps: form.steps.filter(s => s.trim()),
    ingredients: form.ingredients.filter(i => i.name.trim()).map(i => ({ ...i, name: i.name.trim(), amount: Number(i.amount) || 0 })),
  });

  return (
    <div className="mp-sheet" onClick={onClose}>
      <div className="mp-sheet-content" onClick={e => e.stopPropagation()}>
        <header className="mp-sheet-header mp-sheet-header-safe">
          <button className="mp-back" onClick={onClose}><X size={22} /></button>
          <button className={`mp-btn mp-btn-primary mp-btn-small ${canSave ? '' : 'mp-btn-disabled'}`} disabled={!canSave} onClick={handleSave}>Save</button>
        </header>
        <div className="mp-sheet-body">
          <div className="mp-meta">{isNew ? 'New recipe' : 'Editing'}</div>
          <h2 className="mp-display mp-sheet-title">{isNew ? 'Add a recipe' : form.name || 'Untitled'}</h2>

          <section className="mp-sheet-section">
            <label className="mp-label">Name</label>
            <input className="mp-input" value={form.name} onChange={e => setField('name', e.target.value)} placeholder="e.g. Chickpea curry" />
          </section>

          <section className="mp-sheet-section mp-form-grid">
            <div><label className="mp-label">Cuisine</label><input className="mp-input" value={form.cuisine} onChange={e => setField('cuisine', e.target.value)} placeholder="Indian" /></div>
            <div><label className="mp-label">Time</label><input className="mp-input" value={form.time} onChange={e => setField('time', e.target.value)} placeholder="30 min" /></div>
            <div><label className="mp-label">Servings</label><input className="mp-input" type="number" min="1" value={form.servings} onChange={e => setField('servings', e.target.value)} /></div>
          </section>

          <section className="mp-sheet-section">
            <label className="mp-label">Meal type</label>
            <div className="mp-tag-row">
              {MEAL_TYPES.map(mt => (
                <button key={mt.id} className={`mp-tag mp-tag-btn ${form.mealType === mt.id ? 'mp-tag-on' : ''}`} onClick={() => setField('mealType', mt.id)}>
                  {mt.emoji} {mt.label}
                </button>
              ))}
            </div>
          </section>

          <section className="mp-sheet-section">
            <div className="mp-toggle-row" onClick={() => setField('makesLeftovers', !form.makesLeftovers)}>
              <div>
                <div style={{fontWeight:500, fontSize:14}}>Makes leftovers</div>
                <div style={{fontSize:12, color:'var(--ink-2)', marginTop:2}}>Shows a "leftovers tomorrow?" prompt in the week view</div>
              </div>
              <div className={`mp-toggle ${form.makesLeftovers ? 'mp-toggle-on' : ''}`} />
            </div>
          </section>

          <section className="mp-sheet-section">
            <label className="mp-label">Tags</label>
            <div className="mp-tag-row">{TAGS.map(t => <button key={t} className={`mp-tag mp-tag-btn ${form.tags.includes(t) ? 'mp-tag-on' : ''}`} onClick={() => toggleTag(t)}>{t}</button>)}</div>
          </section>

          <section className="mp-sheet-section">
            <label className="mp-label">Photo URL (optional)</label>
            <input className="mp-input" type="url" placeholder="https://example.com/photo.jpg" value={form.photo || ''} onChange={e => setField('photo', e.target.value)} />
            {form.photo && (
              <div style={{marginTop:8, height:80, borderRadius:8, backgroundImage:`url(${form.photo})`, backgroundSize:'cover', backgroundPosition:'center', border:'0.5px solid var(--line)'}} />
            )}
          </section>

          <section className="mp-sheet-section">
            <div className="mp-pantry-section-head">
              <label className="mp-label">Ingredients</label>
              <button className="mp-link" onClick={addIng}>+ add</button>
            </div>
            <div className="mp-ing-edit-list">
              {form.ingredients.map((ing, i) => (
                <div key={i} className="mp-ing-edit">
                  <input className="mp-input mp-input-name" placeholder="ingredient" value={ing.name} onChange={e => setIng(i, 'name', e.target.value)} />
                  <input className="mp-input mp-input-amount" type="number" step="0.1" placeholder="qty" value={ing.amount} onChange={e => setIng(i, 'amount', e.target.value)} />
                  <input className="mp-input mp-input-unit" placeholder="unit" value={ing.unit} onChange={e => setIng(i, 'unit', e.target.value)} />
                  <select className="mp-input mp-input-aisle" value={ing.aisle} onChange={e => setIng(i, 'aisle', e.target.value)}>
                    {AISLES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                  <button className="mp-ing-del" onClick={() => removeIng(i)}><Trash size={14} /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="mp-sheet-section">
            <div className="mp-pantry-section-head">
              <label className="mp-label">Cooking steps</label>
              <button className="mp-link" onClick={addStep}>+ add step</button>
            </div>
            {form.steps.length === 0 && (
              <p style={{fontSize:13, color:'var(--ink-3)', fontStyle:'italic', margin:'4px 0'}}>No steps added yet. Steps power Cook Mode.</p>
            )}
            <div className="mp-steps-list">
              {form.steps.map((s, i) => (
                <div key={i} className="mp-step-edit">
                  <div className="mp-step-num">{i + 1}</div>
                  <textarea className="mp-input mp-textarea" rows={2} placeholder={`Step ${i + 1}…`} value={s} onChange={e => setStep(i, e.target.value)} />
                  <button className="mp-ing-del" onClick={() => removeStep(i)}><Trash size={14} /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="mp-sheet-section">
            <label className="mp-label">Notes</label>
            <textarea className="mp-input mp-textarea" rows="3" value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="Tips, substitutions, side dish ideas…" />
          </section>
        </div>

        <div className="mp-sheet-close-footer">
          <button className="mp-sheet-close-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function FilterSheet({ filters, setFilters, favourites, onClose }) {
  const toggleTag = (t) => setFilters(f => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t] }));
  return (
    <div className="mp-sheet mp-sheet-bottom" onClick={onClose}>
      <div className="mp-sheet-content mp-sheet-content-bottom" onClick={e => e.stopPropagation()}>
        <header className="mp-sheet-header">
          <h3 className="mp-display mp-filter-title">Filter</h3>
          <button className="mp-back" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="mp-sheet-body">
          <section className="mp-sheet-section">
            <button className={`mp-tag mp-tag-btn ${filters.favs ? 'mp-tag-on' : ''}`} onClick={() => setFilters(f => ({ ...f, favs: !f.favs }))}>
              <Star size={12} fill={filters.favs ? 'currentColor' : 'none'} style={{ marginRight: 4, verticalAlign: '-2px' }} />
              favourites only ({favourites.length})
            </button>
          </section>
          <section className="mp-sheet-section">
            <label className="mp-label">Meal type</label>
            <div className="mp-tag-row">
              <button className={`mp-tag mp-tag-btn ${filters.mealType === 'all' ? 'mp-tag-on' : ''}`} onClick={() => setFilters(f => ({ ...f, mealType: 'all' }))}>All</button>
              {MEAL_TYPES.map(mt => (
                <button key={mt.id} className={`mp-tag mp-tag-btn ${filters.mealType === mt.id ? 'mp-tag-on' : ''}`} onClick={() => setFilters(f => ({ ...f, mealType: mt.id }))}>
                  {mt.emoji} {mt.label}
                </button>
              ))}
            </div>
          </section>
          <section className="mp-sheet-section">
            <label className="mp-label">Tags</label>
            <div className="mp-tag-row">{TAGS.map(t => <button key={t} className={`mp-tag mp-tag-btn ${filters.tags.includes(t) ? 'mp-tag-on' : ''}`} onClick={() => toggleTag(t)}>{t}</button>)}</div>
          </section>
          <div className="mp-sheet-actions">
            <button className="mp-btn mp-btn-ghost" onClick={() => setFilters({ tags: [], favs: false, mealType: 'all' })}>clear all</button>
            <button className="mp-btn mp-btn-primary" onClick={onClose}>done</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Recipe Import ──────────────────────────────────────────
function ImportSheet({ onClose, onSave }) {
  const [mode, setMode] = useState('url');
  const [url, setUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState('');

  const extract = async () => {
    setLoading(true);
    setError('');
    try {
      const prompt = mode === 'url'
        ? `Fetch and extract the recipe from this URL: ${url}`
        : `Extract and structure this recipe:\n\n${pasteText}`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          ...(mode === 'url' ? { tools: [{ type: 'web_search_20250305', name: 'web_search' }] } : {}),
          system: 'You extract recipes and return ONLY a valid JSON object — no markdown, no explanation, no backticks.',
          messages: [{ role: 'user', content: `${prompt}

Return ONLY this JSON:
{"name":"","cuisine":"","time":"","servings":2,"mealType":"dinner","makesLeftovers":false,"photo":null,"tags":[],"notes":"","steps":[],"ingredients":[{"name":"","amount":1,"unit":"","aisle":"pantry"}]}

For aisle use: produce|meat|fish|dairy|pantry|spices|bakery|frozen|other
For tags choose from: quick|veggie|high-iron|high-protein|comfort|freezer-friendly|one-tray|weeknight|weekend|meal-prep` }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message);

      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No recipe data found in response');

      const recipe = JSON.parse(match[0]);
      setExtracted(recipe);
    } catch (e) {
      setError(`Could not extract: ${e.message}. Try the "Paste text" tab instead.`);
    } finally {
      setLoading(false);
    }
  };

  if (extracted) {
    return (
      <div className="mp-sheet" onClick={onClose}>
        <div className="mp-sheet-content" onClick={e => e.stopPropagation()}>
          <header className="mp-sheet-header mp-sheet-header-safe">
            <button className="mp-back" onClick={() => setExtracted(null)}><ChevronLeft size={22} /></button>
            <button className="mp-btn mp-btn-primary mp-btn-small" onClick={() => onSave(extracted)}>Save recipe</button>
          </header>
          <div className="mp-sheet-body">
            <div className="mp-meta">Looks right? Tap Save to add it.</div>
            <h2 className="mp-display mp-sheet-title">{extracted.name || 'Unnamed recipe'}</h2>
            <div className="mp-meta" style={{marginTop:4}}>{extracted.cuisine} · {extracted.time} · serves {extracted.servings}</div>
            {extracted.steps?.length > 0 && (
              <section className="mp-sheet-section">
                <h3 className="mp-aisle-label">{extracted.steps.length} cooking steps</h3>
                <p className="mp-notes">{extracted.steps[0]}{extracted.steps.length > 1 ? '…' : ''}</p>
              </section>
            )}
            <section className="mp-sheet-section">
              <h3 className="mp-aisle-label">{extracted.ingredients?.length || 0} ingredients</h3>
              <ul className="mp-ing-list">
                {(extracted.ingredients || []).slice(0, 6).map((ing, i) => (
                  <li key={i} className="mp-ing-row">
                    <span className="mp-ing-amount">{formatAmount(ing.amount, ing.unit)}</span>
                    <span className="mp-ing-name">{ing.name}</span>
                  </li>
                ))}
                {(extracted.ingredients?.length || 0) > 6 && (
                  <li className="mp-ing-row" style={{color:'var(--ink-3)', fontSize:13}}>+{extracted.ingredients.length - 6} more…</li>
                )}
              </ul>
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mp-sheet mp-sheet-bottom" onClick={onClose}>
      <div className="mp-sheet-content mp-sheet-content-bottom" onClick={e => e.stopPropagation()}>
        <header className="mp-sheet-header">
          <h3 className="mp-display mp-filter-title">Import Recipe</h3>
          <button className="mp-back" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="mp-sheet-body">
          <div className="mp-tag-row" style={{marginBottom:'1.25rem'}}>
            <button className={`mp-tag mp-tag-btn ${mode==='url'?'mp-tag-on':''}`} onClick={() => setMode('url')}><Link size={12} style={{marginRight:4, verticalAlign:'-2px'}} />From URL</button>
            <button className={`mp-tag mp-tag-btn ${mode==='paste'?'mp-tag-on':''}`} onClick={() => setMode('paste')}><ClipboardList size={12} style={{marginRight:4, verticalAlign:'-2px'}} />Paste text</button>
          </div>

          {mode === 'url' ? (
            <>
              <label className="mp-label">Recipe URL</label>
              <input className="mp-input" type="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} autoFocus />
              <p style={{fontSize:13, color:'var(--ink-2)', margin:'8px 0 0', lineHeight:1.6}}>Paste any recipe URL. Claude fetches and extracts the ingredients and steps automatically.</p>
            </>
          ) : (
            <>
              <label className="mp-label">Recipe text</label>
              <textarea className="mp-input mp-textarea" rows={7} placeholder="Paste the full recipe here — title, ingredients, steps, everything…" value={pasteText} onChange={e => setPasteText(e.target.value)} autoFocus />
            </>
          )}

          {error && (
            <div style={{background:'#FEE2E2', borderRadius:8, padding:'10px 12px', fontSize:13, color:'#B91C1C', marginTop:10, lineHeight:1.5}}>{error}</div>
          )}

          <button
            className={`mp-btn mp-btn-primary ${(!loading && (mode==='url' ? url : pasteText)) ? '' : 'mp-btn-disabled'}`}
            style={{width:'100%', marginTop:'1rem'}}
            disabled={loading || !(mode === 'url' ? url : pasteText)}
            onClick={extract}
          >
            {loading ? (
              <><RefreshCw size={16} style={{animation:'mp-spin 1s linear infinite'}} /> Extracting…</>
            ) : 'Extract Recipe'}
          </button>
        </div>
      </div>
    </div>
  );
}
