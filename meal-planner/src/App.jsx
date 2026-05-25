import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus, Star, X, Minus, ChefHat, Calendar, ShoppingBasket, Package,
  Edit3, Trash2, Search, Check, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  Trash, RotateCcw, Filter, RefreshCw, Shuffle, Play, Link, ClipboardList,
  UtensilsCrossed, Repeat2, Camera, Timer, GripVertical, Settings, Sparkles, Activity
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

const MEAL_SLOTS = MEAL_TYPES.map(m => m.id); // ['breakfast', 'lunch', 'dinner', 'snack']

const emptyDaySlots = () => Object.fromEntries(MEAL_SLOTS.map(s => [s, null]));

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
  // ────────────────────────────────────────────────────────────
  // New recipes added by request
  // ────────────────────────────────────────────────────────────
  {
    id: 'cacio-e-pere',
    name: 'Cacio e Pere',
    cuisine: 'Italian',
    time: '20 min',
    servings: 2,
    mealType: 'dinner',
    tags: ['quick', 'veggie', 'comfort'],
    makesLeftovers: false,
    notes: 'Roman pasta with pears, pecorino and lots of black pepper. The pear melts into the cheese sauce — surprising and delicious.',
    steps: [
      'Bring a large pot of salted water to a boil.',
      'Peel one of the pears, cut into small dice. Finely grate the second pear (skin on).',
      'Toast cracked black pepper in a wide dry pan for 30 seconds until fragrant.',
      'Cook the pasta until 2 minutes shy of al dente. Reserve 1 cup of pasta water.',
      'Add the diced pear and a ladle of pasta water to the pan with pepper. Simmer 1 minute.',
      'Drain pasta, add to pan with a knob of butter. Toss off the heat.',
      'Add the grated pear and pecorino in handfuls, tossing rapidly with a splash of pasta water to make a creamy sauce. Finish with parmesan and more pepper.',
    ],
    ingredients: [
      { name: 'tonnarelli or spaghetti', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'pecorino romano', amount: 80, unit: 'g', aisle: 'dairy' },
      { name: 'parmigiano reggiano', amount: 20, unit: 'g', aisle: 'dairy' },
      { name: 'ripe williams pears', amount: 2, unit: '', aisle: 'produce' },
      { name: 'butter', amount: 20, unit: 'g', aisle: 'dairy' },
      { name: 'black pepper, freshly cracked', amount: 2, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'slow-chicken-peas-carrots-gravy',
    name: 'Slow-cooked Chicken with Peas, Carrots and Gravy',
    cuisine: 'Comfort',
    time: '1 hr 5 min',
    servings: 4,
    mealType: 'dinner',
    tags: ['comfort', 'meal-prep', 'freezer-friendly', 'weekend'],
    makesLeftovers: true,
    notes: 'Recipe from Simple Home Edit (Nicole Maguire). Tender chicken in a rich gravy. Serve over mashed potato.',
    steps: [
      'Combine the chicken with paprika, oregano, thyme, onion powder, salt, pepper, sugar and olive oil. Toss to coat.',
      'Heat a large heavy pan over medium-high. Brown the chicken 4–5 minutes per side until golden. Remove and set aside.',
      'Reduce heat to medium. Add onion, cook 5–6 minutes, then add carrots and cook 3–4 minutes more.',
      'Add butter and garlic, cook 1 minute until fragrant. Sprinkle in flour, stir 1–2 minutes. Add tomato paste, cook 1 minute.',
      'Pour in half the stock, stir smooth, then add remaining stock and water. Add thyme, Worcestershire and dark soy.',
      'Return chicken to pan. Simmer partially covered on low for 35–40 minutes.',
      'Uncover, simmer 10–15 minutes more until gravy is glossy and thick.',
      'Stir in peas, cook 5 minutes until vibrant. Season to taste. Serve over mashed potato.',
    ],
    ingredients: [
      { name: 'boneless skinless chicken thighs', amount: 800, unit: 'g', aisle: 'meat' },
      { name: 'sweet paprika', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'dried oregano', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'dried thyme', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'onion powder', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'white sugar', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'brown onion, finely diced', amount: 1, unit: '', aisle: 'produce' },
      { name: 'carrots, thickly sliced', amount: 4, unit: '', aisle: 'produce' },
      { name: 'unsalted butter', amount: 30, unit: 'g', aisle: 'dairy' },
      { name: 'garlic, minced', amount: 1, unit: 'tsp', aisle: 'produce' },
      { name: 'plain flour', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'tomato paste', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'beef stock', amount: 500, unit: 'ml', aisle: 'pantry' },
      { name: 'water', amount: 60, unit: 'ml', aisle: 'pantry' },
      { name: 'fresh thyme sprigs', amount: 4, unit: '', aisle: 'produce' },
      { name: 'worcestershire sauce', amount: 2, unit: 'tsp', aisle: 'pantry' },
      { name: 'dark soy sauce', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'frozen peas', amount: 155, unit: 'g', aisle: 'frozen' },
    ],
  },
  {
    id: 'bean-carbonara',
    name: 'Bean Carbonara',
    cuisine: 'Italian-inspired',
    time: '25 min',
    servings: 2,
    mealType: 'dinner',
    tags: ['quick', 'high-protein', 'high-iron', 'weeknight', 'comfort'],
    makesLeftovers: false,
    notes: 'Bold Bean Co\'s riff on carbonara — butter beans for extra protein and fibre alongside the pancetta. Surprisingly close to the original.',
    steps: [
      'Bring a large pot of salted water to a boil. Cook the spaghetti.',
      'While the pasta cooks, fry pancetta in a wide pan over medium heat until crisp and golden, 5 minutes.',
      'Drain the butter beans, add to the pan with the pancetta. Mash about half lightly with a fork. Cook 2 minutes.',
      'In a bowl, whisk egg yolks, whole egg, pecorino, parmesan and lots of black pepper.',
      'Reserve a cup of pasta water. Drain pasta and add to pan off the heat with a splash of pasta water.',
      'Toss in the egg mix, tossing vigorously — add more pasta water to loosen to a glossy creamy sauce. Never put back on heat or the eggs scramble.',
      'Serve immediately with extra cheese and pepper.',
    ],
    ingredients: [
      { name: 'spaghetti', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'pancetta or smoked bacon, diced', amount: 100, unit: 'g', aisle: 'meat' },
      { name: 'butter beans (jar or tin)', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'egg yolks', amount: 3, unit: '', aisle: 'dairy' },
      { name: 'whole egg', amount: 1, unit: '', aisle: 'dairy' },
      { name: 'pecorino romano, finely grated', amount: 60, unit: 'g', aisle: 'dairy' },
      { name: 'parmesan, finely grated', amount: 20, unit: 'g', aisle: 'dairy' },
      { name: 'black pepper, lots, freshly cracked', amount: 1, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'savoury-crepes-ham-gruyere',
    name: 'Savoury Crepes with Ham, Gruyere & Eggs',
    cuisine: 'French',
    time: '40 min',
    servings: 2,
    mealType: 'breakfast',
    tags: ['comfort', 'weekend'],
    makesLeftovers: false,
    notes: 'Brunch showstopper. Make the crepe batter ahead and rest in the fridge.',
    steps: [
      'Whisk flour, eggs, milk and a pinch of salt to a smooth batter. Stir in melted butter and chives. Rest 20 minutes.',
      'Make a quick hollandaise: melt butter. Whisk egg yolks with lemon and a splash of warm water over a bain marie until pale. Slowly drizzle in melted butter, whisking constantly. Season.',
      'Heat a non-stick pan over medium heat, lightly buttered. Pour in a thin layer of batter, swirl. Cook 1 minute per side. Repeat for 4 crepes total.',
      'Spread each crepe with dijon, layer with gruyere and ham. Fold into quarters and warm gently in the pan to melt the cheese.',
      'Fry the eggs in butter, sunny-side up.',
      'Plate two folded crepes per person, top with a fried egg, spoon hollandaise over and finish with extra chives.',
    ],
    ingredients: [
      { name: 'plain flour', amount: 120, unit: 'g', aisle: 'pantry' },
      { name: 'milk', amount: 250, unit: 'ml', aisle: 'dairy' },
      { name: 'eggs', amount: 6, unit: '', aisle: 'dairy' },
      { name: 'melted butter', amount: 30, unit: 'g', aisle: 'dairy' },
      { name: 'chives, finely chopped', amount: 3, unit: 'tbsp', aisle: 'produce' },
      { name: 'dijon mustard', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'smoked ham slices', amount: 120, unit: 'g', aisle: 'meat' },
      { name: 'gruyere, grated', amount: 100, unit: 'g', aisle: 'dairy' },
      { name: 'butter for cooking', amount: 30, unit: 'g', aisle: 'dairy' },
      { name: 'butter for hollandaise', amount: 100, unit: 'g', aisle: 'dairy' },
      { name: 'lemon, juiced', amount: 0.5, unit: '', aisle: 'produce' },
    ],
  },
  {
    id: 'korean-fried-chicken-tenders',
    name: 'Korean Fried Chicken Tenders',
    cuisine: 'Korean',
    time: '40 min',
    servings: 3,
    mealType: 'dinner',
    tags: ['high-protein', 'weekend', 'comfort'],
    makesLeftovers: false,
    notes: 'Double-fried for that signature shatter-crisp coating. The gochujang glaze is the star.',
    steps: [
      'Cut chicken into strips. Toss with salt and a splash of milk to tenderise (15 min).',
      'Whisk cornstarch and flour. Coat each tender thoroughly, shaking off excess.',
      'Heat oil to 160°C. Fry chicken in batches for 6 minutes — pale and just cooked. Drain.',
      'For the glaze: in a small pan, simmer gochujang, soy, honey, rice vinegar, garlic and ginger for 2 minutes until glossy. Stir in sesame oil.',
      'Heat oil to 190°C. Fry the chicken a second time for 2–3 minutes until deep golden and crisp. Drain briefly.',
      'Toss hot chicken in the warm glaze. Plate, sprinkle generously with sesame seeds and scallions.',
    ],
    ingredients: [
      { name: 'chicken tenders or breast', amount: 600, unit: 'g', aisle: 'meat' },
      { name: 'milk', amount: 100, unit: 'ml', aisle: 'dairy' },
      { name: 'cornstarch', amount: 100, unit: 'g', aisle: 'pantry' },
      { name: 'plain flour', amount: 50, unit: 'g', aisle: 'pantry' },
      { name: 'neutral oil for frying', amount: 1, unit: 'l', aisle: 'pantry' },
      { name: 'gochujang', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'honey', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'rice vinegar', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'garlic, minced', amount: 3, unit: '', aisle: 'produce' },
      { name: 'fresh ginger, grated', amount: 1, unit: 'tbsp', aisle: 'produce' },
      { name: 'sesame oil', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'sesame seeds', amount: 1, unit: 'tbsp', aisle: 'spices' },
      { name: 'scallions, sliced', amount: 3, unit: '', aisle: 'produce' },
    ],
  },
  {
    id: 'lagomchef-quinoa-bowl',
    name: 'Lagomchef\'s Quinoa, Asparagus & Pea Bowl',
    cuisine: 'Modern',
    time: '25 min',
    servings: 2,
    mealType: 'lunch',
    tags: ['quick', 'veggie', 'high-protein', 'meal-prep', 'high-iron'],
    makesLeftovers: true,
    notes: 'Bright, punchy and very meal-preppable. Add chicken thighs and crushed peanuts for protein.',
    steps: [
      'Cook the quinoa in salted water for 12 minutes until tender. Drain.',
      'Bring a pot of salted water to a boil. Blanch asparagus and green beans for 2 minutes, then drop in peas for 30 seconds. Drain and shock in cold water.',
      'Whisk the dressing: soy, olive oil, vinegar, honey, sriracha, ginger and garlic.',
      'If using chicken: season thighs, pan fry for 6 minutes per side until golden and cooked through. Slice.',
      'Toss quinoa and veg with most of the dressing. Top with chicken (if using), tear mint over, scatter peanuts, drizzle remaining dressing.',
    ],
    ingredients: [
      { name: 'quinoa', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'asparagus, trimmed', amount: 200, unit: 'g', aisle: 'produce' },
      { name: 'green beans, trimmed', amount: 150, unit: 'g', aisle: 'produce' },
      { name: 'peas', amount: 100, unit: 'g', aisle: 'frozen' },
      { name: 'soy sauce', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'olive oil', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'rice vinegar', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'honey', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sriracha', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'fresh ginger, grated', amount: 1, unit: 'tbsp', aisle: 'produce' },
      { name: 'garlic, minced', amount: 2, unit: '', aisle: 'produce' },
      { name: 'mint leaves', amount: 0.5, unit: 'cup', aisle: 'produce' },
      { name: 'chicken thighs (optional)', amount: 300, unit: 'g', aisle: 'meat' },
      { name: 'roasted peanuts, crushed (optional)', amount: 40, unit: 'g', aisle: 'pantry' },
    ],
  },
  {
    id: 'asparagus-wild-garlic-couscous',
    name: 'Asparagus & Wild Garlic Couscous',
    cuisine: 'Mediterranean',
    time: '20 min',
    servings: 2,
    mealType: 'lunch',
    tags: ['quick', 'veggie', 'weeknight'],
    makesLeftovers: false,
    notes: 'Inspired by Tish Wonders. If you can\'t find wild garlic, use baby spinach plus an extra garlic clove.',
    steps: [
      'Bring stock to a boil, pour over the couscous in a bowl. Cover and rest for 5 minutes.',
      'Roast or pan-fry asparagus in olive oil until charred, 5 minutes.',
      'Blitz wild garlic with olive oil, parmesan, pine nuts, lemon juice and salt to a rough pesto.',
      'Fluff the couscous with a fork. Fold through most of the pesto.',
      'Top with the asparagus, dollops of remaining pesto, and a squeeze of lemon. Shave extra parmesan over.',
    ],
    ingredients: [
      { name: 'couscous', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'vegetable stock', amount: 200, unit: 'ml', aisle: 'pantry' },
      { name: 'asparagus, trimmed', amount: 250, unit: 'g', aisle: 'produce' },
      { name: 'olive oil', amount: 4, unit: 'tbsp', aisle: 'pantry' },
      { name: 'wild garlic leaves (or baby spinach)', amount: 60, unit: 'g', aisle: 'produce' },
      { name: 'parmesan, grated', amount: 30, unit: 'g', aisle: 'dairy' },
      { name: 'pine nuts, toasted', amount: 30, unit: 'g', aisle: 'pantry' },
      { name: 'lemon', amount: 1, unit: '', aisle: 'produce' },
    ],
  },
  {
    id: 'pan-seared-steak-classic-side',
    name: 'Pan-Seared Steak with Buttery Greens',
    cuisine: 'Modern',
    time: '20 min',
    servings: 2,
    mealType: 'dinner',
    tags: ['quick', 'high-protein', 'high-iron', 'weekend'],
    makesLeftovers: false,
    notes: 'Simple, no fuss. The two keys: dry the steak hard before searing, and rest properly.',
    steps: [
      'Take steaks out of the fridge 30 minutes before cooking. Pat very dry with paper towels and season generously with salt.',
      'Heat a heavy pan (cast iron is best) until smoking hot.',
      'Add neutral oil. Sear steaks for 2–3 minutes per side undisturbed.',
      'Add butter, garlic and thyme. Tilt the pan and spoon the foaming butter over the steaks for 1 minute.',
      'Rest steaks on a board for 5 minutes — non-negotiable.',
      'Meanwhile, blanch the greens for 2 minutes. Drain, toss in the steak pan with butter, lemon and salt.',
      'Slice steak against the grain. Plate with greens and spoon over any resting juices.',
    ],
    ingredients: [
      { name: 'ribeye or sirloin steaks (2cm thick)', amount: 2, unit: '', aisle: 'meat' },
      { name: 'neutral oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'butter', amount: 40, unit: 'g', aisle: 'dairy' },
      { name: 'garlic cloves, smashed', amount: 3, unit: '', aisle: 'produce' },
      { name: 'fresh thyme sprigs', amount: 4, unit: '', aisle: 'produce' },
      { name: 'tenderstem broccoli or green beans', amount: 300, unit: 'g', aisle: 'produce' },
      { name: 'lemon', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'flaky salt', amount: 1, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'silken-tofu-ginger-soy',
    name: 'Cold Silken Tofu with Soy & Ginger',
    cuisine: 'Chinese-inspired',
    time: '10 min',
    servings: 2,
    mealType: 'lunch',
    tags: ['quick', 'veggie', 'high-protein'],
    makesLeftovers: false,
    notes: 'Five minutes of work. Cooling, savoury, and the texture is glorious. Eat with rice or as a starter.',
    steps: [
      'Carefully turn the silken tofu out onto a serving plate. Pat the top dry with paper towel.',
      'Whisk soy sauce, black vinegar, sesame oil, sugar and a tablespoon of water.',
      'Pour the dressing around (not over) the tofu.',
      'Top with grated ginger, finely sliced scallions and a generous drizzle of chili crisp.',
      'Scatter with sesame seeds. Spoon into bowls at the table.',
    ],
    ingredients: [
      { name: 'silken tofu', amount: 350, unit: 'g', aisle: 'dairy' },
      { name: 'soy sauce', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'chinese black vinegar (or rice vinegar)', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sesame oil', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'sugar', amount: 0.5, unit: 'tsp', aisle: 'pantry' },
      { name: 'fresh ginger, finely grated', amount: 1, unit: 'tbsp', aisle: 'produce' },
      { name: 'scallions, finely sliced', amount: 2, unit: '', aisle: 'produce' },
      { name: 'chili crisp (Lao Gan Ma or similar)', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sesame seeds', amount: 1, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'smoothie-choc-pb-banana',
    name: 'Chocolate Peanut Butter Banana Smoothie',
    cuisine: 'Smoothie',
    time: '5 min',
    servings: 1,
    mealType: 'breakfast',
    tags: ['quick', 'high-protein'],
    makesLeftovers: false,
    notes: '~35g protein. Tastes like a milkshake but somehow good for you.',
    steps: [
      'Add all ingredients to a blender.',
      'Blend until smooth and creamy. Pour and drink.',
    ],
    ingredients: [
      { name: 'frozen banana', amount: 1, unit: '', aisle: 'frozen' },
      { name: 'natural peanut butter', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'unsweetened cocoa powder', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'chocolate whey or plant protein', amount: 30, unit: 'g', aisle: 'pantry' },
      { name: 'unsweetened almond milk', amount: 300, unit: 'ml', aisle: 'dairy' },
      { name: 'rolled oats', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'ice cubes', amount: 4, unit: '', aisle: 'frozen' },
    ],
  },
  {
    id: 'smoothie-berry-greek',
    name: 'Berry Greek Yogurt Smoothie',
    cuisine: 'Smoothie',
    time: '5 min',
    servings: 1,
    mealType: 'breakfast',
    tags: ['quick', 'high-protein'],
    makesLeftovers: false,
    notes: '~30g protein. Thick, creamy, properly filling.',
    steps: [
      'Add all ingredients to a blender. Blend until smooth.',
    ],
    ingredients: [
      { name: 'frozen mixed berries', amount: 150, unit: 'g', aisle: 'frozen' },
      { name: 'greek yogurt 0% or 2%', amount: 200, unit: 'g', aisle: 'dairy' },
      { name: 'vanilla protein powder', amount: 25, unit: 'g', aisle: 'pantry' },
      { name: 'milk', amount: 200, unit: 'ml', aisle: 'dairy' },
      { name: 'honey', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'chia seeds', amount: 1, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'smoothie-green-pineapple',
    name: 'Green Spinach Pineapple Smoothie',
    cuisine: 'Smoothie',
    time: '5 min',
    servings: 1,
    mealType: 'breakfast',
    tags: ['quick', 'veggie', 'high-protein', 'high-iron'],
    makesLeftovers: false,
    notes: '~28g protein with a clean tropical flavour. The pineapple completely overpowers the spinach.',
    steps: [
      'Add all ingredients to a blender. Blend until very smooth.',
    ],
    ingredients: [
      { name: 'baby spinach', amount: 50, unit: 'g', aisle: 'produce' },
      { name: 'frozen pineapple chunks', amount: 150, unit: 'g', aisle: 'frozen' },
      { name: 'frozen banana', amount: 0.5, unit: '', aisle: 'frozen' },
      { name: 'vanilla protein powder', amount: 30, unit: 'g', aisle: 'pantry' },
      { name: 'coconut water', amount: 250, unit: 'ml', aisle: 'pantry' },
      { name: 'fresh ginger', amount: 1, unit: 'tsp', aisle: 'produce' },
      { name: 'lime juice', amount: 1, unit: 'tsp', aisle: 'produce' },
    ],
  },
  {
    id: 'smoothie-vanilla-almond-oat',
    name: 'Vanilla Almond Oat Smoothie',
    cuisine: 'Smoothie',
    time: '5 min',
    servings: 1,
    mealType: 'breakfast',
    tags: ['quick', 'high-protein', 'high-iron'],
    makesLeftovers: false,
    notes: '~32g protein. Pre-workout fuel that tastes like a vanilla shake.',
    steps: [
      'Add all ingredients to a blender. Blend until creamy.',
    ],
    ingredients: [
      { name: 'almond butter', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'rolled oats', amount: 40, unit: 'g', aisle: 'pantry' },
      { name: 'vanilla protein powder', amount: 30, unit: 'g', aisle: 'pantry' },
      { name: 'frozen banana', amount: 1, unit: '', aisle: 'frozen' },
      { name: 'unsweetened almond milk', amount: 300, unit: 'ml', aisle: 'dairy' },
      { name: 'cinnamon', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'maple syrup', amount: 1, unit: 'tsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'smoothie-strawberry-tropical',
    name: 'Strawberry Tropical Protein Smoothie',
    cuisine: 'Smoothie',
    time: '5 min',
    servings: 1,
    mealType: 'breakfast',
    tags: ['quick', 'high-protein'],
    makesLeftovers: false,
    notes: '~30g protein. Bright, summery, sunshine in a glass.',
    steps: [
      'Add all ingredients to a blender. Blend until smooth.',
    ],
    ingredients: [
      { name: 'frozen strawberries', amount: 150, unit: 'g', aisle: 'frozen' },
      { name: 'frozen mango chunks', amount: 80, unit: 'g', aisle: 'frozen' },
      { name: 'greek yogurt 0%', amount: 150, unit: 'g', aisle: 'dairy' },
      { name: 'vanilla protein powder', amount: 25, unit: 'g', aisle: 'pantry' },
      { name: 'orange juice', amount: 150, unit: 'ml', aisle: 'pantry' },
      { name: 'flax seeds', amount: 1, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'spaghetti-carbonara-italian',
    name: 'Spaghetti Carbonara (Italian)',
    cuisine: 'Italian',
    time: '20 min',
    servings: 2,
    mealType: 'dinner',
    tags: ['quick', 'comfort', 'weeknight'],
    makesLeftovers: false,
    notes: 'No cream, no garlic, no peas. Just eggs, cheese, guanciale and pepper — like in Rome.',
    steps: [
      'Bring a large pot of salted water to a boil.',
      'Cut guanciale into thin lardons. Fry in a dry cold pan over medium heat — the fat will render. Cook 6 minutes until crisp and golden. Turn off heat.',
      'Whisk egg yolks, whole egg, pecorino and lots of fresh black pepper in a bowl.',
      'Cook spaghetti until al dente. Reserve a cup of pasta water.',
      'Drain pasta and add immediately to the pan with the guanciale (off the heat). Toss to coat in the fat.',
      'Add a splash of pasta water to the egg mix to temper it, then pour over the pasta. Toss vigorously, adding more pasta water as needed, until the sauce is glossy and creamy. The residual heat cooks the eggs.',
      'Serve immediately with extra pecorino and pepper.',
    ],
    ingredients: [
      { name: 'spaghetti or tonnarelli', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'guanciale (or pancetta)', amount: 120, unit: 'g', aisle: 'meat' },
      { name: 'egg yolks', amount: 4, unit: '', aisle: 'dairy' },
      { name: 'whole egg', amount: 1, unit: '', aisle: 'dairy' },
      { name: 'pecorino romano, finely grated', amount: 70, unit: 'g', aisle: 'dairy' },
      { name: 'black pepper, freshly cracked', amount: 1, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'thai-spicy-turkey-noodles',
    name: 'Thai Spicy Turkey Noodles with Holy Basil',
    cuisine: 'Thai',
    time: '20 min',
    servings: 2,
    mealType: 'dinner',
    tags: ['quick', 'high-protein', 'weeknight'],
    makesLeftovers: true,
    notes: 'Pad Krapow-inspired noodles. Properly spicy. Top with a crispy fried egg if you want the full hit.',
    steps: [
      'Soak the rice noodles in just-boiled water for 5 minutes until pliable. Drain.',
      'Pound garlic and bird\'s eye chilies in a mortar (or finely chop).',
      'Heat a wok or large pan with oil until smoking. Add the garlic-chili paste, fry 30 seconds.',
      'Add turkey mince and break up, frying hard for 3 minutes until starting to crisp at the edges.',
      'Add soy sauces, fish sauce, oyster sauce and sugar. Toss for 1 minute.',
      'Add noodles and a splash of water. Toss to coat for 1 minute.',
      'Off the heat, fold through huge handfuls of thai basil and sliced shallot. Serve with lime.',
    ],
    ingredients: [
      { name: 'flat rice noodles', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'turkey mince', amount: 400, unit: 'g', aisle: 'meat' },
      { name: 'garlic cloves', amount: 5, unit: '', aisle: 'produce' },
      { name: 'bird\'s eye chilies', amount: 3, unit: '', aisle: 'produce' },
      { name: 'neutral oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'light soy sauce', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'dark soy sauce', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'fish sauce', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'oyster sauce', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sugar', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'thai basil leaves', amount: 1, unit: 'cup', aisle: 'produce' },
      { name: 'shallot, sliced', amount: 1, unit: '', aisle: 'produce' },
      { name: 'lime wedges', amount: 2, unit: '', aisle: 'produce' },
    ],
  },
  {
    id: 'duck-blueberry-confit-potatoes',
    name: 'Duck Breast with Blueberry Sauce & Confit Potatoes',
    cuisine: 'French',
    time: '1 hr',
    servings: 2,
    mealType: 'dinner',
    tags: ['weekend', 'high-protein', 'high-iron'],
    makesLeftovers: false,
    notes: 'Special occasion territory. Score the duck fat properly — that\'s what gives you the crisp skin.',
    steps: [
      'Heat the oven to 160°C. Halve baby potatoes. Submerge in duck fat (or olive oil) with garlic and thyme. Bake uncovered for 50 minutes until tender and golden.',
      'Score the duck breast skin in a cross-hatch, cutting through the fat but not the meat. Season heavily with salt.',
      'Place duck breasts skin-side down in a cold pan. Turn heat to medium. Render for 8–10 minutes until the skin is deep golden and crisp.',
      'Pour off most of the fat (save it). Flip duck breasts and cook 3–4 minutes for medium-rare. Rest on a board for 5 minutes.',
      'In the same pan, add blueberries, port (or red wine), sugar and a splash of water. Reduce for 4 minutes until syrupy. Whisk in cold butter off the heat. Season.',
      'Slice duck against the grain. Plate with confit potatoes. Spoon blueberry sauce around.',
    ],
    ingredients: [
      { name: 'duck breasts', amount: 2, unit: '', aisle: 'meat' },
      { name: 'baby potatoes', amount: 500, unit: 'g', aisle: 'produce' },
      { name: 'duck fat (or olive oil)', amount: 200, unit: 'ml', aisle: 'pantry' },
      { name: 'garlic cloves, smashed', amount: 4, unit: '', aisle: 'produce' },
      { name: 'fresh thyme sprigs', amount: 6, unit: '', aisle: 'produce' },
      { name: 'fresh or frozen blueberries', amount: 150, unit: 'g', aisle: 'produce' },
      { name: 'port (or red wine)', amount: 80, unit: 'ml', aisle: 'pantry' },
      { name: 'sugar', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'cold butter', amount: 30, unit: 'g', aisle: 'dairy' },
    ],
  },
  {
    id: 'lentil-chickpea-curry',
    name: 'Quick Lentil & Chickpea Curry',
    cuisine: 'Indian',
    time: '30 min',
    servings: 4,
    mealType: 'dinner',
    tags: ['veggie', 'high-protein', 'high-iron', 'freezer-friendly', 'meal-prep', 'weeknight'],
    makesLeftovers: true,
    notes: 'Honestly easy. Big batch, freezes brilliantly. Brilliant for next-day lunches with rice.',
    steps: [
      'Heat oil in a large pot. Add onion, cook 5 minutes. Add garlic and ginger, cook 1 minute.',
      'Add curry powder, cumin, turmeric and tomato paste. Cook 2 minutes until fragrant.',
      'Add tinned tomatoes, coconut milk, stock, lentils and chickpeas. Bring to a simmer.',
      'Cook 20 minutes, stirring occasionally, until lentils are tender and sauce thickens.',
      'Stir in baby spinach until wilted. Squeeze in lime, season with salt.',
      'Serve over rice with a dollop of yogurt and fresh coriander.',
    ],
    ingredients: [
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'large onion, diced', amount: 1, unit: '', aisle: 'produce' },
      { name: 'garlic cloves, minced', amount: 4, unit: '', aisle: 'produce' },
      { name: 'fresh ginger, grated', amount: 1, unit: 'tbsp', aisle: 'produce' },
      { name: 'curry powder', amount: 2, unit: 'tbsp', aisle: 'spices' },
      { name: 'ground cumin', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'ground turmeric', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'tomato paste', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'tinned chopped tomatoes', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'coconut milk', amount: 400, unit: 'ml', aisle: 'pantry' },
      { name: 'vegetable stock', amount: 300, unit: 'ml', aisle: 'pantry' },
      { name: 'red lentils, rinsed', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'chickpeas, drained', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'baby spinach', amount: 150, unit: 'g', aisle: 'produce' },
      { name: 'lime', amount: 1, unit: '', aisle: 'produce' },
      { name: 'fresh coriander', amount: 0.5, unit: 'cup', aisle: 'produce' },
      { name: 'greek yogurt to serve', amount: 200, unit: 'g', aisle: 'dairy' },
      { name: 'basmati rice', amount: 300, unit: 'g', aisle: 'pantry' },
    ],
  },
  {
    id: 'mediterranean-tuna-grain-bowl',
    name: 'Mediterranean Tuna Grain Bowl',
    cuisine: 'Mediterranean',
    time: '20 min',
    servings: 4,
    mealType: 'lunch',
    tags: ['quick', 'high-protein', 'meal-prep', 'high-iron'],
    makesLeftovers: true,
    notes: 'Make a big batch on Sunday. Holds for 4 days in the fridge. Add dressing only just before eating.',
    steps: [
      'Cook the farro in salted water for 25 minutes until tender with a bite. Drain and cool.',
      'In a large bowl, combine farro, tuna, cherry tomatoes, cucumber, olives, red onion, chickpeas and parsley.',
      'Whisk dressing: olive oil, lemon juice, dijon, garlic, oregano, salt and pepper.',
      'For meal prep: keep dressing separate. Portion into containers.',
      'When eating: dress, crumble feta over the top, finish with extra olive oil and lemon.',
    ],
    ingredients: [
      { name: 'pearl farro (or barley)', amount: 250, unit: 'g', aisle: 'pantry' },
      { name: 'tinned tuna in olive oil, drained', amount: 320, unit: 'g', aisle: 'pantry' },
      { name: 'cherry tomatoes, halved', amount: 300, unit: 'g', aisle: 'produce' },
      { name: 'cucumber, diced', amount: 1, unit: '', aisle: 'produce' },
      { name: 'kalamata olives', amount: 100, unit: 'g', aisle: 'pantry' },
      { name: 'red onion, thinly sliced', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'chickpeas, drained', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'fresh parsley', amount: 1, unit: 'cup', aisle: 'produce' },
      { name: 'feta', amount: 150, unit: 'g', aisle: 'dairy' },
      { name: 'olive oil', amount: 5, unit: 'tbsp', aisle: 'pantry' },
      { name: 'lemon juice', amount: 3, unit: 'tbsp', aisle: 'produce' },
      { name: 'dijon mustard', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'garlic clove, minced', amount: 1, unit: '', aisle: 'produce' },
      { name: 'dried oregano', amount: 1, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'black-bean-quinoa-burrito-bowl',
    name: 'Black Bean & Quinoa Burrito Bowls',
    cuisine: 'Mexican',
    time: '30 min',
    servings: 4,
    mealType: 'lunch',
    tags: ['veggie', 'high-protein', 'high-iron', 'meal-prep', 'freezer-friendly'],
    makesLeftovers: true,
    notes: 'Smoky, satisfying, batch-cook champion. Build bowls fresh each day with toppings of choice.',
    steps: [
      'Cook quinoa in stock for 12 minutes until tender. Drain if needed.',
      'In a pan, heat oil. Add onion and pepper, cook 5 minutes.',
      'Add garlic, smoked paprika, cumin and chili powder. Cook 1 minute.',
      'Add black beans, sweetcorn and a splash of water. Simmer 5 minutes. Squeeze in lime, season.',
      'For meal prep: portion the quinoa and beans into 4 containers. Top with avocado, salsa, jalapeño and coriander only when eating.',
    ],
    ingredients: [
      { name: 'quinoa', amount: 250, unit: 'g', aisle: 'pantry' },
      { name: 'vegetable stock', amount: 500, unit: 'ml', aisle: 'pantry' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'red onion, diced', amount: 1, unit: '', aisle: 'produce' },
      { name: 'red bell pepper, diced', amount: 1, unit: '', aisle: 'produce' },
      { name: 'garlic cloves, minced', amount: 3, unit: '', aisle: 'produce' },
      { name: 'smoked paprika', amount: 2, unit: 'tsp', aisle: 'spices' },
      { name: 'ground cumin', amount: 2, unit: 'tsp', aisle: 'spices' },
      { name: 'chili powder', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'black beans, drained', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'tinned sweetcorn, drained', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'limes', amount: 2, unit: '', aisle: 'produce' },
      { name: 'avocado', amount: 2, unit: '', aisle: 'produce' },
      { name: 'tomato salsa', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'fresh coriander', amount: 0.5, unit: 'cup', aisle: 'produce' },
      { name: 'pickled jalapeños', amount: 50, unit: 'g', aisle: 'pantry' },
    ],
  },
  // ────────────────────────────────────────────────────────────
  // Snacks
  // ────────────────────────────────────────────────────────────
  {
    id: 'apple-almond-butter',
    name: 'Apple with Almond Butter',
    cuisine: 'Snack',
    time: '2 min',
    servings: 1,
    mealType: 'snack',
    tags: ['quick', 'veggie', 'high-protein'],
    makesLeftovers: false,
    notes: 'Crunchy + creamy. Add cinnamon for extra warmth.',
    steps: [
      'Slice the apple into wedges, removing the core.',
      'Spread or dollop almond butter over the slices.',
      'Sprinkle with cinnamon if using.',
    ],
    ingredients: [
      { name: 'apple', amount: 1, unit: '', aisle: 'produce' },
      { name: 'almond butter', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'cinnamon (optional)', amount: 0.25, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'greek-yogurt-honey-nuts',
    name: 'Greek Yogurt with Honey & Nuts',
    cuisine: 'Snack',
    time: '3 min',
    servings: 1,
    mealType: 'snack',
    tags: ['quick', 'high-protein', 'veggie'],
    makesLeftovers: false,
    notes: '20g+ protein per bowl. Add berries if you have them.',
    steps: [
      'Spoon yogurt into a bowl.',
      'Drizzle honey over the top.',
      'Scatter chopped walnuts (or your favourite nuts).',
    ],
    ingredients: [
      { name: 'greek yogurt 0% or 2%', amount: 200, unit: 'g', aisle: 'dairy' },
      { name: 'honey', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'mixed nuts, chopped', amount: 20, unit: 'g', aisle: 'pantry' },
    ],
  },
  {
    id: 'avocado-toast-snack',
    name: 'Avocado on Toast',
    cuisine: 'Snack',
    time: '5 min',
    servings: 1,
    mealType: 'snack',
    tags: ['quick', 'veggie'],
    makesLeftovers: false,
    notes: 'A classic. Add chili flakes and a squeeze of lemon if you like.',
    steps: [
      'Toast the bread until golden.',
      'Mash the avocado roughly with a fork. Season with salt and a squeeze of lemon.',
      'Pile the avocado onto the toast. Finish with chili flakes and a drizzle of olive oil.',
    ],
    ingredients: [
      { name: 'sourdough bread', amount: 2, unit: 'slices', aisle: 'bakery' },
      { name: 'avocado', amount: 1, unit: '', aisle: 'produce' },
      { name: 'lemon', amount: 0.25, unit: '', aisle: 'produce' },
      { name: 'chili flakes', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'olive oil', amount: 1, unit: 'tsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'energy-balls',
    name: 'Date & Peanut Butter Energy Balls',
    cuisine: 'Snack',
    time: '10 min + chill',
    servings: 12,
    mealType: 'snack',
    tags: ['veggie', 'high-protein', 'meal-prep', 'freezer-friendly'],
    makesLeftovers: true,
    notes: 'Makes 12 balls — keeps in the fridge for 2 weeks, freezer for 3 months. Grab and go.',
    steps: [
      'In a food processor, blend the dates until they form a paste.',
      'Add oats, peanut butter, cocoa, chia seeds, vanilla and salt. Pulse until combined.',
      'If the mix is too sticky, add a tablespoon more oats. Too dry — a splash of water.',
      'Roll into balls (about 1 tbsp each), then roll in desiccated coconut or extra cocoa.',
      'Chill in the fridge for 30 minutes before eating.',
    ],
    ingredients: [
      { name: 'medjool dates, pitted', amount: 200, unit: 'g', aisle: 'pantry' },
      { name: 'rolled oats', amount: 100, unit: 'g', aisle: 'pantry' },
      { name: 'natural peanut butter', amount: 80, unit: 'g', aisle: 'pantry' },
      { name: 'cocoa powder', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'chia seeds', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'vanilla extract', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'sea salt', amount: 0.25, unit: 'tsp', aisle: 'spices' },
      { name: 'desiccated coconut, for rolling', amount: 30, unit: 'g', aisle: 'pantry' },
    ],
  },
  {
    id: 'hummus-veggie-plate',
    name: 'Hummus & Veggie Plate',
    cuisine: 'Snack',
    time: '5 min',
    servings: 2,
    mealType: 'snack',
    tags: ['quick', 'veggie', 'high-iron'],
    makesLeftovers: false,
    notes: 'A proper snack plate. Use shop-bought hummus or whatever you have.',
    steps: [
      'Cut the carrots, cucumber and peppers into sticks.',
      'Halve the cherry tomatoes.',
      'Spoon hummus into a bowl, drizzle with olive oil and a dust of paprika.',
      'Arrange the veggies around the bowl with a pile of olives. Serve.',
    ],
    ingredients: [
      { name: 'hummus', amount: 200, unit: 'g', aisle: 'dairy' },
      { name: 'carrot', amount: 1, unit: '', aisle: 'produce' },
      { name: 'cucumber', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'red bell pepper', amount: 1, unit: '', aisle: 'produce' },
      { name: 'cherry tomatoes', amount: 100, unit: 'g', aisle: 'produce' },
      { name: 'olives', amount: 50, unit: 'g', aisle: 'pantry' },
      { name: 'olive oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'sweet paprika', amount: 0.25, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'cottage-cheese-berries',
    name: 'Cottage Cheese Bowl with Berries',
    cuisine: 'Snack',
    time: '2 min',
    servings: 1,
    mealType: 'snack',
    tags: ['quick', 'high-protein', 'veggie'],
    makesLeftovers: false,
    notes: '25g+ protein. The savoury-sweet thing works — trust it.',
    steps: [
      'Scoop cottage cheese into a bowl.',
      'Top with berries, a drizzle of honey, and a scatter of seeds.',
      'Crack black pepper over the top (yes, really — it works).',
    ],
    ingredients: [
      { name: 'cottage cheese', amount: 200, unit: 'g', aisle: 'dairy' },
      { name: 'mixed berries', amount: 80, unit: 'g', aisle: 'produce' },
      { name: 'honey', amount: 1, unit: 'tsp', aisle: 'pantry' },
      { name: 'pumpkin or sunflower seeds', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'black pepper', amount: 1, unit: 'pinch', aisle: 'spices' },
    ],
  },
  // ────────────────────────────────────────────────────────────
  // High-protein breakfasts
  // ────────────────────────────────────────────────────────────
  {
    id: 'protein-banana-egg-pancakes',
    name: 'Protein, Banana & Egg Pancakes',
    cuisine: 'Breakfast',
    time: '10 min',
    servings: 2,
    mealType: 'breakfast',
    tags: ['high-protein', 'quick', 'gluten-free', 'veggie'],
    makesLeftovers: false,
    notes: '35g+ protein per stack. The banana binds everything and adds sweetness without sugar.',
    steps: [
      'Mash the bananas thoroughly in a bowl until almost smooth.',
      'Whisk in the eggs, then stir in the protein powder, oats and cinnamon. Let the batter sit for 2 minutes to thicken.',
      'Heat a non-stick pan over medium-low heat with a little butter or oil.',
      'Ladle small pancakes (about 8cm) into the pan. Cook 2-3 minutes until bubbles form on top and the edges set, then flip and cook another 1-2 minutes.',
      'Stack and top with berries, a drizzle of nut butter and a splash of maple syrup.',
    ],
    ingredients: [
      { name: 'banana', amount: 2, unit: '', aisle: 'produce' },
      { name: 'egg', amount: 4, unit: '', aisle: 'dairy' },
      { name: 'vanilla protein powder', amount: 50, unit: 'g', aisle: 'pantry' },
      { name: 'rolled oats', amount: 40, unit: 'g', aisle: 'pantry' },
      { name: 'ground cinnamon', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'butter for the pan', amount: 1, unit: 'tsp', aisle: 'dairy' },
      { name: 'mixed berries', amount: 80, unit: 'g', aisle: 'produce' },
      { name: 'almond or peanut butter', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'maple syrup', amount: 1, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'high-protein-omelette',
    name: 'High-Protein Veggie Omelette',
    cuisine: 'Breakfast',
    time: '12 min',
    servings: 1,
    mealType: 'breakfast',
    tags: ['high-protein', 'quick', 'veggie', 'low-carb'],
    makesLeftovers: false,
    notes: 'Around 40g protein. The cottage cheese melts into pockets and keeps it tender — trust it.',
    steps: [
      'Whisk the eggs and egg whites with a pinch of salt and pepper.',
      'Heat butter in a non-stick pan over medium heat. Add the spinach, cherry tomatoes and spring onion. Cook 1-2 minutes until the spinach wilts.',
      'Pour in the eggs and let them set on the bottom for 30 seconds.',
      'Scatter the cottage cheese and feta across one half of the omelette. Gently drag the edges to the centre with a spatula, tilting the pan so raw egg flows underneath.',
      'When mostly set but still slightly glossy, fold the omelette over and slide onto a plate. Top with chives and chili flakes.',
    ],
    ingredients: [
      { name: 'egg', amount: 3, unit: '', aisle: 'dairy' },
      { name: 'egg whites', amount: 100, unit: 'ml', aisle: 'dairy' },
      { name: 'cottage cheese', amount: 60, unit: 'g', aisle: 'dairy' },
      { name: 'feta', amount: 30, unit: 'g', aisle: 'dairy' },
      { name: 'baby spinach', amount: 30, unit: 'g', aisle: 'produce' },
      { name: 'cherry tomato', amount: 6, unit: '', aisle: 'produce' },
      { name: 'spring onion', amount: 1, unit: '', aisle: 'produce' },
      { name: 'chives', amount: 1, unit: 'tbsp', aisle: 'produce' },
      { name: 'butter for the pan', amount: 1, unit: 'tsp', aisle: 'dairy' },
      { name: 'chili flakes', amount: 0.25, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'spiced-beef-breakfast-bowl',
    name: 'Spiced Beef Breakfast Bowl with Feta',
    cuisine: 'Tex-Mex',
    time: '15 min',
    servings: 2,
    mealType: 'breakfast',
    tags: ['high-protein', 'high-fat', 'low-carb', 'quick', 'gluten-free'],
    makesLeftovers: false,
    notes: '40g+ protein, eats like a savoury breakfast bowl. The runny yolk into the spiced beef is the whole point — set a timer for the eggs.',
    steps: [
      'Bring a small pan of water to a boil. Gently lower in the eggs and boil for 6 minutes 30 seconds for jammy yolks. Drain, run under cold water, then peel.',
      'Heat olive oil in a wide pan over medium-high heat. Add the beef mince and break it up with a wooden spoon. Cook for 3-4 minutes, undisturbed at first to get a proper sear on the bottom.',
      'Stir in the cumin, sweet paprika, smoked paprika, garlic powder, cayenne, dried oregano, salt and pepper. Cook another 3-4 minutes, breaking the mince up further, until it\'s deeply browned and crispy in places. Don\'t rush this — the crispy edges are everything.',
      'Meanwhile, slice the red bell pepper into batons. Cut the cucumber into thick batons. Peel the carrots and slice into batons (or use a vegetable peeler for ribbons).',
      'Divide the spiced beef between two bowls. Crumble the feta over the top — the residual heat will soften it slightly. Halve the eggs and place two halves on each bowl.',
      'Arrange the raw veg alongside the beef. Scatter chopped coriander, give a generous squeeze of lemon, and finish with a crack of black pepper. Add a dollop of yogurt if using.',
    ],
    ingredients: [
      { name: 'beef mince (5%+ fat)', amount: 300, unit: 'g', aisle: 'meat' },
      { name: 'egg', amount: 2, unit: '', aisle: 'dairy' },
      { name: 'feta', amount: 100, unit: 'g', aisle: 'dairy' },
      { name: 'red bell pepper', amount: 1, unit: '', aisle: 'produce' },
      { name: 'cucumber', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'carrot', amount: 2, unit: '', aisle: 'produce' },
      { name: 'fresh coriander', amount: 1, unit: 'small bunch', aisle: 'produce' },
      { name: 'lemon', amount: 0.5, unit: '', aisle: 'produce' },
      { name: 'olive oil', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'ground cumin', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'sweet paprika', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'smoked paprika', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'garlic powder', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'cayenne pepper', amount: 0.25, unit: 'tsp', aisle: 'spices' },
      { name: 'dried oregano', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'greek yogurt (optional)', amount: 100, unit: 'g', aisle: 'dairy' },
    ],
  },
  // ────────────────────────────────────────────────────────────
  // High-fibre
  // ────────────────────────────────────────────────────────────
  {
    id: 'overnight-oats-chia-berries',
    name: 'Overnight Oats with Chia & Berries',
    cuisine: 'Breakfast',
    time: '5 min + overnight',
    servings: 2,
    mealType: 'breakfast',
    tags: ['high-fibre', 'high-protein', 'meal-prep', 'veggie'],
    makesLeftovers: true,
    notes: '12g+ fibre. Make 4 jars on Sunday — eat them through the week. Add berries fresh in the morning.',
    steps: [
      'In a jar or container, combine the oats, chia seeds, protein powder (if using) and cinnamon.',
      'Pour in the milk and yogurt, then add the honey or maple syrup. Stir thoroughly until no dry oats remain.',
      'Seal and refrigerate overnight (at least 6 hours).',
      'In the morning, give it a stir. If it\'s too thick, splash in more milk. Top with berries, a spoon of nut butter and seeds.',
    ],
    ingredients: [
      { name: 'rolled oats', amount: 100, unit: 'g', aisle: 'pantry' },
      { name: 'chia seeds', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'vanilla protein powder', amount: 30, unit: 'g', aisle: 'pantry' },
      { name: 'ground cinnamon', amount: 0.5, unit: 'tsp', aisle: 'spices' },
      { name: 'milk', amount: 300, unit: 'ml', aisle: 'dairy' },
      { name: 'greek yogurt', amount: 100, unit: 'g', aisle: 'dairy' },
      { name: 'honey or maple syrup', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'mixed berries', amount: 120, unit: 'g', aisle: 'produce' },
      { name: 'almond or peanut butter', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'pumpkin or sunflower seeds', amount: 2, unit: 'tbsp', aisle: 'pantry' },
    ],
  },
  {
    id: 'roasted-root-quinoa-bowl',
    name: 'Roasted Root Veg & Quinoa Bowl',
    cuisine: 'Sheet pan',
    time: '40 min',
    servings: 2,
    mealType: 'lunch',
    tags: ['high-fibre', 'high-iron', 'veggie', 'meal-prep', 'gluten-free'],
    makesLeftovers: true,
    notes: '15g+ fibre. Roast extra veg and use it for lunches all week. The tahini dressing is the soul of this bowl.',
    steps: [
      'Heat the oven to 220°C. Cut the sweet potato, carrots, parsnips and red onion into chunks.',
      'Spread the veg on a baking tray, drizzle with olive oil and toss with cumin, paprika, salt and pepper. Roast for 25-30 minutes until caramelised at the edges.',
      'Meanwhile, rinse the quinoa and cook in salted water (1:2 ratio) for 15 minutes, until the little tails appear. Drain and fluff.',
      'Whisk the tahini with lemon juice, garlic, a pinch of salt and just enough warm water to loosen it into a pourable dressing.',
      'Massage the kale with a little olive oil and a squeeze of lemon until softened.',
      'Build bowls: quinoa, then roasted veg, then kale, then chickpeas. Drizzle with tahini dressing, scatter pomegranate seeds and pumpkin seeds.',
    ],
    ingredients: [
      { name: 'sweet potato', amount: 1, unit: 'large', aisle: 'produce' },
      { name: 'carrot', amount: 3, unit: '', aisle: 'produce' },
      { name: 'parsnip', amount: 2, unit: '', aisle: 'produce' },
      { name: 'red onion', amount: 1, unit: '', aisle: 'produce' },
      { name: 'quinoa', amount: 150, unit: 'g', aisle: 'pantry' },
      { name: 'tinned chickpeas, drained', amount: 240, unit: 'g', aisle: 'pantry' },
      { name: 'kale', amount: 100, unit: 'g', aisle: 'produce' },
      { name: 'tahini', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'lemon', amount: 1, unit: '', aisle: 'produce' },
      { name: 'garlic', amount: 1, unit: 'clove', aisle: 'produce' },
      { name: 'pomegranate seeds', amount: 50, unit: 'g', aisle: 'produce' },
      { name: 'pumpkin seeds', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'olive oil', amount: 3, unit: 'tbsp', aisle: 'pantry' },
      { name: 'ground cumin', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'sweet paprika', amount: 1, unit: 'tsp', aisle: 'spices' },
    ],
  },
  {
    id: 'black-bean-sweet-potato-chili',
    name: 'Black Bean & Sweet Potato Chili',
    cuisine: 'Mexican-inspired',
    time: '45 min',
    servings: 4,
    mealType: 'dinner',
    tags: ['high-fibre', 'veggie', 'one-pot', 'meal-prep', 'freezer-friendly'],
    makesLeftovers: true,
    notes: '14g+ fibre per bowl, gets better the next day. Freezes beautifully — double it.',
    steps: [
      'Heat olive oil in a large pot over medium heat. Add the onion and cook for 4-5 minutes until softening.',
      'Add the garlic, sweet potato, peppers, cumin, smoked paprika, chipotle and oregano. Cook another 2 minutes, stirring, until fragrant.',
      'Tip in the tinned tomatoes, black beans, kidney beans, stock and a generous pinch of salt. Bring to a simmer.',
      'Cover and cook for 25 minutes, until the sweet potato is tender. Uncover for the last 5 minutes to thicken.',
      'Stir in the lime juice and a handful of coriander. Taste and adjust salt.',
      'Serve in bowls topped with yogurt, more coriander, avocado, and a wedge of lime.',
    ],
    ingredients: [
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'onion', amount: 1, unit: 'large', aisle: 'produce' },
      { name: 'garlic', amount: 4, unit: 'cloves', aisle: 'produce' },
      { name: 'sweet potato', amount: 600, unit: 'g', aisle: 'produce' },
      { name: 'red bell pepper', amount: 2, unit: '', aisle: 'produce' },
      { name: 'ground cumin', amount: 2, unit: 'tsp', aisle: 'spices' },
      { name: 'smoked paprika', amount: 2, unit: 'tsp', aisle: 'spices' },
      { name: 'chipotle paste or chili powder', amount: 1, unit: 'tbsp', aisle: 'spices' },
      { name: 'dried oregano', amount: 1, unit: 'tsp', aisle: 'spices' },
      { name: 'tinned tomatoes', amount: 400, unit: 'g', aisle: 'pantry' },
      { name: 'tinned black beans, drained', amount: 480, unit: 'g', aisle: 'pantry' },
      { name: 'tinned kidney beans, drained', amount: 240, unit: 'g', aisle: 'pantry' },
      { name: 'vegetable stock', amount: 400, unit: 'ml', aisle: 'pantry' },
      { name: 'lime', amount: 2, unit: '', aisle: 'produce' },
      { name: 'fresh coriander', amount: 30, unit: 'g', aisle: 'produce' },
      { name: 'greek yogurt', amount: 200, unit: 'g', aisle: 'dairy' },
      { name: 'avocado', amount: 2, unit: '', aisle: 'produce' },
    ],
  },
  // ────────────────────────────────────────────────────────────
  // Fresh & light (fruits / vegetables)
  // ────────────────────────────────────────────────────────────
  {
    id: 'tropical-fruit-yogurt-bowl',
    name: 'Tropical Fruit & Yogurt Bowl',
    cuisine: 'Breakfast',
    time: '5 min',
    servings: 2,
    mealType: 'breakfast',
    tags: ['quick', 'high-protein', 'veggie', 'fresh'],
    makesLeftovers: false,
    notes: 'Brighter than a smoothie, more substantial than fruit alone. Use whatever\'s ripe.',
    steps: [
      'Cut the mango, pineapple and papaya (or whatever tropical fruit you have) into bite-sized chunks.',
      'Halve the strawberries. Slice the kiwi.',
      'Divide the yogurt between two bowls.',
      'Pile the fruit on top in colourful sections. Scatter granola, coconut flakes and chia seeds. Drizzle with honey and a squeeze of lime.',
    ],
    ingredients: [
      { name: 'greek yogurt', amount: 300, unit: 'g', aisle: 'dairy' },
      { name: 'mango', amount: 1, unit: '', aisle: 'produce' },
      { name: 'pineapple chunks', amount: 200, unit: 'g', aisle: 'produce' },
      { name: 'kiwi', amount: 2, unit: '', aisle: 'produce' },
      { name: 'strawberries', amount: 150, unit: 'g', aisle: 'produce' },
      { name: 'granola', amount: 60, unit: 'g', aisle: 'pantry' },
      { name: 'coconut flakes', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'chia seeds', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'honey', amount: 1, unit: 'tbsp', aisle: 'pantry' },
      { name: 'lime', amount: 0.5, unit: '', aisle: 'produce' },
    ],
  },
  {
    id: 'mediterranean-veg-platter',
    name: 'Mediterranean Veg Platter',
    cuisine: 'Mezze',
    time: '15 min',
    servings: 2,
    mealType: 'lunch',
    tags: ['veggie', 'high-fibre', 'fresh', 'quick', 'no-cook'],
    makesLeftovers: false,
    notes: 'A graze board lunch. Mix and match what\'s in the fridge — this is just a starting structure.',
    steps: [
      'Slice the cucumber into batons. Cut the bell peppers into strips. Halve the cherry tomatoes. Slice the radishes thinly.',
      'Pit the olives if needed. Crumble the feta into chunks. Drain the artichokes and sundried tomatoes.',
      'Arrange everything on a big board or two large plates, grouping by colour. Add piles of hummus and tzatziki.',
      'Drizzle olive oil over the feta, scatter chopped parsley and a generous twist of black pepper.',
      'Serve with warm pita bread or crusty sourdough.',
    ],
    ingredients: [
      { name: 'cucumber', amount: 1, unit: '', aisle: 'produce' },
      { name: 'red bell pepper', amount: 1, unit: '', aisle: 'produce' },
      { name: 'yellow bell pepper', amount: 1, unit: '', aisle: 'produce' },
      { name: 'cherry tomato', amount: 200, unit: 'g', aisle: 'produce' },
      { name: 'radish', amount: 100, unit: 'g', aisle: 'produce' },
      { name: 'feta', amount: 150, unit: 'g', aisle: 'dairy' },
      { name: 'kalamata olives', amount: 100, unit: 'g', aisle: 'pantry' },
      { name: 'artichoke hearts', amount: 100, unit: 'g', aisle: 'pantry' },
      { name: 'sundried tomatoes', amount: 60, unit: 'g', aisle: 'pantry' },
      { name: 'hummus', amount: 200, unit: 'g', aisle: 'dairy' },
      { name: 'tzatziki', amount: 150, unit: 'g', aisle: 'dairy' },
      { name: 'pita bread', amount: 4, unit: '', aisle: 'bakery' },
      { name: 'olive oil', amount: 2, unit: 'tbsp', aisle: 'pantry' },
      { name: 'flat-leaf parsley', amount: 1, unit: 'small bunch', aisle: 'produce' },
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
  week: Object.fromEntries(DAYS.map(d => [d, emptyDaySlots()])),
  favourites: [],
  shoppingChecked: [],
  seedSeen: SEED_RECIPES.map(r => r.id),
  aisleOrder: AISLES.map(a => a.id),
  customShoppingItems: [],
  defaultServings: 2,
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

// Stronger ingredient matching: strips modifiers, normalises plurals,
// and maps common synonyms so "garlic", "garlic clove", "garlic cloves",
// "minced garlic" all resolve to the same canonical name.
const PLURAL_MAP = {
  eggs: 'egg', tomatoes: 'tomato', potatoes: 'potato', onions: 'onion',
  lemons: 'lemon', limes: 'lime', oranges: 'orange', apples: 'apple',
  bananas: 'banana', carrots: 'carrot', mushrooms: 'mushroom',
  shallots: 'shallot', cucumbers: 'cucumber', avocados: 'avocado',
  peaches: 'peach', pears: 'pear', plums: 'plum', berries: 'berry',
  strawberries: 'strawberry', blueberries: 'blueberry', raspberries: 'raspberry',
  cherries: 'cherry', grapes: 'grape', figs: 'fig', dates: 'date',
  peppers: 'pepper', chillies: 'chili', chilies: 'chili', chillis: 'chili',
  jalapeños: 'jalapeño', jalapenos: 'jalapeño',
  beans: 'bean', lentils: 'lentil', chickpeas: 'chickpea',
  herbs: 'herb', leaves: 'leaf', stalks: 'stalk',
  cloves: 'clove', sprigs: 'sprig',
};

const SYNONYM_MAP = {
  'garlic clove': 'garlic', 'garlic cloves': 'garlic',
  'clove garlic': 'garlic', 'cloves garlic': 'garlic',
  'clove of garlic': 'garlic', 'cloves of garlic': 'garlic',
  'spring onion': 'spring onion', 'scallion': 'spring onion', 'scallions': 'spring onion', 'green onion': 'spring onion',
  'coriander': 'coriander', 'cilantro': 'coriander',
  'aubergine': 'aubergine', 'eggplant': 'aubergine',
  'courgette': 'courgette', 'zucchini': 'courgette',
  'rocket': 'rocket', 'arugula': 'rocket',
  'plain flour': 'plain flour', 'all-purpose flour': 'plain flour', 'all purpose flour': 'plain flour',
  'caster sugar': 'caster sugar', 'superfine sugar': 'caster sugar',
  'icing sugar': 'icing sugar', 'powdered sugar': 'icing sugar', 'confectioners sugar': 'icing sugar',
  'double cream': 'double cream', 'heavy cream': 'double cream',
  'single cream': 'single cream', 'light cream': 'single cream',
  'soft cheese': 'cream cheese', 'cream cheese': 'cream cheese',
  'rapeseed oil': 'rapeseed oil', 'canola oil': 'rapeseed oil',
  'tinned tomatoes': 'tinned tomatoes', 'canned tomatoes': 'tinned tomatoes', 'chopped tomatoes': 'tinned tomatoes',
  'cherry tomato': 'cherry tomato', 'cherry tomatoes': 'cherry tomato',
  'spring greens': 'spring greens', 'collard greens': 'spring greens',
};

const MODIFIERS = [
  'fresh', 'large', 'medium', 'small', 'ripe', 'free-range', 'free range', 'organic',
  'extra virgin', 'extra-virgin', 'finely', 'roughly', 'thinly', 'thickly',
  'chopped', 'sliced', 'minced', 'diced', 'grated', 'crushed', 'peeled', 'whole',
  'cubed', 'shredded', 'beaten', 'mashed', 'cooked', 'raw',
  'soft', 'hard', 'cold', 'warm', 'hot', 'room temperature', 'room-temperature',
  'unsalted', 'salted', 'low-sodium', 'low sodium',
  'plain', 'self-raising', 'self raising', 'self-rising',
  'good-quality', 'good quality', 'best-quality', 'best quality',
  'optional', 'to taste', 'to serve', 'for serving', 'for garnish',
  'a pinch of', 'pinch of', 'splash of', 'drizzle of',
];

function canonicalIngredientName(name) {
  if (!name) return '';
  let n = name.toLowerCase().trim();
  // Strip parentheticals: "(about 200g)" etc
  n = n.replace(/\([^)]*\)/g, '').trim();
  // Strip leading numbers (in case amount got mashed into name)
  n = n.replace(/^\d+\s*/, '');
  // Strip modifier phrases
  for (const m of MODIFIERS) {
    n = n.replace(new RegExp(`\\b${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), ' ');
  }
  // Clean punctuation, collapse spaces
  n = n.replace(/[,.;]/g, ' ').replace(/\s+/g, ' ').trim();
  // Check synonym map FIRST (multi-word entries)
  if (SYNONYM_MAP[n]) return SYNONYM_MAP[n];
  // Plural map
  if (PLURAL_MAP[n]) return PLURAL_MAP[n];
  // Try last word (e.g. "garlic clove" → "clove" wouldn't help, but "garlic cloves" → strip plural)
  const lastWord = n.split(' ').pop();
  if (PLURAL_MAP[lastWord]) {
    const replaced = n.replace(new RegExp(lastWord + '$'), PLURAL_MAP[lastWord]);
    if (SYNONYM_MAP[replaced]) return SYNONYM_MAP[replaced];
    return replaced;
  }
  return n;
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
  const map = new Map(); // key = canon|unit
  Object.values(week).forEach(daySlots => {
    if (!daySlots) return;
    Object.values(daySlots).forEach(slot => {
      if (!slot || slot.isLeftover || slot.isSkipped) return;
      const recipe = recipes.find(r => r.id === slot.recipeId);
      if (!recipe) return;
      const factor = (slot.servings || recipe.servings) / recipe.servings;
      recipe.ingredients.forEach(ing => {
        const canon = canonicalIngredientName(ing.name);
        const normUnit = (ing.unit || '').toLowerCase().trim();
        const key = `${canon}|${normUnit}`;
        const existing = map.get(key);
        const scaled = ing.amount * factor;
        if (existing) {
          existing.amount += scaled;
          if (!existing.recipes.includes(recipe.name)) existing.recipes.push(recipe.name);
        } else {
          map.set(key, {
            key,
            canon,
            name: canon, // use canonical for display so "garlic clove" + "garlic" merge visually
            unit: ing.unit,
            amount: scaled,
            aisle: ing.aisle || 'other',
            recipes: [recipe.name],
          });
        }
      });
    });
  });

  // Filter out pantry items (canonical match)
  const pantrySet = new Set(pantry.map(p => canonicalIngredientName(p)));
  const filtered = [...map.values()].filter(i => !pantrySet.has(i.canon));

  // Group entries with the same canonical name (different units stay separate items
  // but render together). E.g., "garlic | clove" + "garlic | head" → one group, two rows.
  const groupedByCanon = new Map();
  for (const item of filtered) {
    if (!groupedByCanon.has(item.canon)) {
      groupedByCanon.set(item.canon, { canon: item.canon, name: item.canon, aisle: item.aisle, units: [] });
    }
    groupedByCanon.get(item.canon).units.push(item);
  }

  // Group by aisle
  const byAisle = {};
  for (const group of groupedByCanon.values()) {
    if (!byAisle[group.aisle]) byAisle[group.aisle] = [];
    byAisle[group.aisle].push(group);
  }
  Object.values(byAisle).forEach(arr => arr.sort((a, b) => a.canon.localeCompare(b.canon)));
  return byAisle;
}

function allIngredientNames(recipes) {
  const set = new Set();
  recipes.forEach(r => r.ingredients.forEach(i => set.add(i.name)));
  return [...set].sort();
}

// Detect time mentions in a step and return timer objects
function findTimers(text) {
  const timers = [];
  const seen = new Set();
  const patterns = [
    { re: /(\d+)\s*h(?:our)?s?\s*(?:and\s*)?(\d+)\s*m(?:in(?:ute)?s?)/gi, fn: m => parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 },
    { re: /(\d+(?:\.\d+)?)\s*h(?:our)?s?(?!\s*(?:and\s*)?\d)/gi, fn: m => Math.round(parseFloat(m[1]) * 3600) },
    { re: /(\d+)\s*m(?:in(?:ute)?s?)(?!\s*\d)/gi, fn: m => parseInt(m[1]) * 60 },
    { re: /(\d+)\s*s(?:ec(?:ond)?s?)/gi, fn: m => parseInt(m[1]) },
  ];
  for (const { re, fn } of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      if (!seen.has(m.index)) {
        const secs = fn(m);
        if (secs >= 10) { timers.push({ label: m[0].trim(), seconds: secs }); seen.add(m.index); }
      }
    }
  }
  return timers;
}

// Split step text into plain-text and tappable ingredient spans
function parseStepIngredients(text, ingredients) {
  if (!ingredients?.length || !text) return [{ text, ing: null }];
  const sorted = [...ingredients].sort((a, b) => b.name.length - a.name.length);
  const pattern = sorted.map(i => i.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  return text.split(regex).filter(Boolean).map(part => {
    const ing = ingredients.find(i => i.name.toLowerCase() === part.toLowerCase());
    return { text: part, ing: ing || null };
  });
}

// Ensure every recipe has all current fields (handles old stored data gracefully)
function applyRecipeDefaults(r) {
  return { photo: null, mealType: 'dinner', makesLeftovers: false, steps: [], cookLog: [], ...r };
}

// Migrate older week data (single slot per day) to multi-slot structure
function migrateWeek(week) {
  const result = {};
  DAYS.forEach(day => {
    const stored = week?.[day];
    if (!stored) {
      result[day] = emptyDaySlots();
    } else if (stored.breakfast !== undefined || stored.lunch !== undefined || stored.dinner !== undefined || stored.snack !== undefined) {
      // already new format — ensure all slots exist
      result[day] = { ...emptyDaySlots(), ...stored };
    } else {
      // legacy: a single recipe slot or leftover. Move it to dinner.
      result[day] = { ...emptyDaySlots(), dinner: stored };
    }
  });
  return result;
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
    week: migrateWeek(stored.week),
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
  const [recipeTab, setRecipeTab] = useState('all'); // all | breakfast | lunch-dinner | snack
  const [openRecipeId, setOpenRecipeId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [importing, setImporting] = useState(false);
  const [cookModeRecipe, setCookModeRecipe] = useState(null);
  const [search, setSearch] = useState('');
  const [activeFilters, setActiveFilters] = useState({ tags: [], favs: false, mealType: 'all' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [shuffleMenuOpen, setShuffleMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inventOpen, setInventOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [diagnostics, setDiagnostics] = useState({
    realtimeStatus: 'connecting',  // connecting | subscribed | error | timeout | closed
    lastSaveOk: null,    // Date | null
    lastSaveError: null, // string | null
    lastLoadOk: null,
    lastLoadError: null,
    pollCount: 0,
    saveCount: 0,
    incomingCount: 0,
  });
  const lastSavedAt = useRef(null);
  const localChangePending = useRef(false);
  const saveAttempts = useRef(0);

  // ── Load ──────────────────────────────────────────────────
  // Fetches state from Supabase on mount. Falls back to localStorage.
  useEffect(() => {
    (async () => {
      try {
        if (supabase) {
          const { data: row, error } = await supabase
            .from('planner_state')
            .select('data, updated_at')
            .eq('id', HOUSEHOLD_ID)
            .maybeSingle();

          if (!error && row?.data) {
            setData(mergeSeedRecipes(row.data));
            lastSavedAt.current = row.updated_at;
            setSyncStatus('synced');
            setLastSyncedAt(new Date());
            setDiagnostics(d => ({ ...d, lastLoadOk: new Date(), lastLoadError: null }));
            setLoading(false);
            return;
          }
          // Row doesn't exist yet — first run on this household
          if (!error && !row) {
            const fresh = DEFAULT_STATE;
            const timestamp = new Date().toISOString();
            setData(fresh);
            const ins = await supabase.from('planner_state')
              .insert({ id: HOUSEHOLD_ID, data: fresh, updated_at: timestamp });
            lastSavedAt.current = timestamp;
            setSyncStatus('synced');
            setLastSyncedAt(new Date());
            setDiagnostics(d => ({ ...d, lastLoadOk: new Date(), lastLoadError: ins.error?.message || null }));
            setLoading(false);
            return;
          }
          if (error) {
            console.warn('Supabase load failed:', error.message);
            setDiagnostics(d => ({ ...d, lastLoadError: error.message }));
          }
          setSyncStatus('offline');
        }
        // No Supabase or error — fall back to localStorage
        const raw = localStorage.getItem(STORAGE_KEY);
        setData(raw ? mergeSeedRecipes(JSON.parse(raw)) : DEFAULT_STATE);
      } catch (e) {
        console.warn('Initial load error:', e.message);
        setDiagnostics(d => ({ ...d, lastLoadError: e.message }));
        const raw = localStorage.getItem(STORAGE_KEY);
        setData(raw ? mergeSeedRecipes(JSON.parse(raw)) : DEFAULT_STATE);
        setSyncStatus('offline');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Save (debounced) — no isSyncing guard, retries on transient failure ──
  useEffect(() => {
    if (!data || loading) return;
    localChangePending.current = true;
    const t = setTimeout(async () => {
      // Always persist locally for offline use
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (_) {}

      if (!supabase) { localChangePending.current = false; return; }

      setSyncStatus('syncing');
      const timestamp = new Date().toISOString();
      lastSavedAt.current = timestamp;

      try {
        const { error } = await supabase
          .from('planner_state')
          .upsert({ id: HOUSEHOLD_ID, data, updated_at: timestamp });

        if (error) {
          saveAttempts.current += 1;
          setSyncStatus('offline');
          setDiagnostics(d => ({ ...d, lastSaveError: error.message, saveCount: d.saveCount + 1 }));
          console.warn('Save error:', error.message);
        } else {
          saveAttempts.current = 0;
          localChangePending.current = false;
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
          setDiagnostics(d => ({ ...d, lastSaveOk: new Date(), lastSaveError: null, saveCount: d.saveCount + 1 }));
        }
      } catch (e) {
        setSyncStatus('offline');
        setDiagnostics(d => ({ ...d, lastSaveError: e.message }));
        console.warn('Save threw:', e.message);
      }
    }, 600); // slightly longer debounce — batches rapid edits
    return () => clearTimeout(t);
  }, [data, loading]);

  // ── Realtime subscription + automatic reconnection ────────
  useEffect(() => {
    if (!supabase) {
      setDiagnostics(d => ({ ...d, realtimeStatus: 'not-configured' }));
      return;
    }
    let channel = null;
    let cancelled = false;

    const setupChannel = () => {
      setDiagnostics(d => ({ ...d, realtimeStatus: 'connecting' }));
      channel = supabase
        .channel('planner-sync-' + HOUSEHOLD_ID)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'planner_state', filter: `id=eq.${HOUSEHOLD_ID}` },
          (payload) => {
            setDiagnostics(d => ({ ...d, incomingCount: d.incomingCount + 1 }));
            if (!payload.new?.data) return;
            if (payload.new.updated_at === lastSavedAt.current) return;
            if (localChangePending.current) return;
            setData(mergeSeedRecipes(payload.new.data));
            lastSavedAt.current = payload.new.updated_at;
            setSyncStatus('synced');
            setLastSyncedAt(new Date());
          }
        )
        .subscribe((status) => {
          setDiagnostics(d => ({ ...d, realtimeStatus: status.toLowerCase().replace('_', '-') }));
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (!cancelled) {
              console.warn('Realtime channel error, will retry in 5s');
              setTimeout(() => { if (!cancelled) { supabase.removeChannel(channel); setupChannel(); } }, 5000);
            }
          }
        });
    };

    setupChannel();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, []);

  // ── Pull-on-visibility: when app becomes visible, force-fetch latest ───
  // Handles the case where the phone was asleep and missed realtime updates.
  useEffect(() => {
    if (!supabase) return;
    const refetchFromServer = async () => {
      if (document.visibilityState !== 'visible') return;
      if (localChangePending.current) return; // don't clobber unsaved local edits
      try {
        const { data: row, error } = await supabase
          .from('planner_state')
          .select('data, updated_at')
          .eq('id', HOUSEHOLD_ID)
          .maybeSingle();
        if (error || !row?.data) return;
        // Only apply if newer than what we have
        if (row.updated_at !== lastSavedAt.current) {
          setData(mergeSeedRecipes(row.data));
          lastSavedAt.current = row.updated_at;
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
        }
      } catch (e) {
        console.warn('Visibility refetch failed:', e.message);
      }
    };
    document.addEventListener('visibilitychange', refetchFromServer);
    window.addEventListener('online', refetchFromServer);
    window.addEventListener('focus', refetchFromServer);
    return () => {
      document.removeEventListener('visibilitychange', refetchFromServer);
      window.removeEventListener('online', refetchFromServer);
      window.removeEventListener('focus', refetchFromServer);
    };
  }, []);

  // ── PWA update detection ──────────────────────────────────
  useEffect(() => {
    const handleUpdate = (e) => setUpdateAvailable(e.detail);
    window.addEventListener('pwa-update-available', handleUpdate);
    return () => window.removeEventListener('pwa-update-available', handleUpdate);
  }, []);

  // ── Polling fallback ──────────────────────────────────────
  // Every 20 seconds, check Supabase for changes. This is belt-and-braces in
  // case realtime subscription has silently disconnected (which happens on
  // mobile networks and after device sleep).
  useEffect(() => {
    if (!supabase) return;
    const POLL_MS = 20000;
    let timeoutId = null;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') {
        timeoutId = setTimeout(poll, POLL_MS);
        return;
      }
      if (localChangePending.current) {
        timeoutId = setTimeout(poll, POLL_MS);
        return;
      }
      try {
        const { data: row, error } = await supabase
          .from('planner_state')
          .select('data, updated_at')
          .eq('id', HOUSEHOLD_ID)
          .maybeSingle();
        setDiagnostics(d => ({ ...d, pollCount: d.pollCount + 1 }));
        if (!error && row?.data && row.updated_at !== lastSavedAt.current) {
          setData(mergeSeedRecipes(row.data));
          lastSavedAt.current = row.updated_at;
          setSyncStatus('synced');
          setLastSyncedAt(new Date());
        }
      } catch (_) { /* silent */ }
      if (!cancelled) timeoutId = setTimeout(poll, POLL_MS);
    };

    timeoutId = setTimeout(poll, POLL_MS);
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, []);

  // Manual force-sync — user can tap the sync dot to trigger this
  const forceSync = async () => {
    if (!supabase) return;
    setSyncStatus('syncing');
    try {
      const { data: row, error } = await supabase
        .from('planner_state')
        .select('data, updated_at')
        .eq('id', HOUSEHOLD_ID)
        .maybeSingle();
      if (error) throw error;
      if (row?.data) {
        if (!localChangePending.current && row.updated_at !== lastSavedAt.current) {
          setData(mergeSeedRecipes(row.data));
          lastSavedAt.current = row.updated_at;
        }
      }
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setDiagnostics(d => ({ ...d, lastLoadOk: new Date(), lastLoadError: null }));
    } catch (e) {
      setSyncStatus('offline');
      setDiagnostics(d => ({ ...d, lastLoadError: e.message }));
      console.warn('Force sync failed:', e.message);
    }
  };

  // Hard reset — wipes local data and pulls fresh from server.
  // Use this if a device gets out of sync and you want to force it to match the server.
  const hardResyncFromServer = async () => {
    if (!supabase) return;
    if (!window.confirm('Wipe local changes and pull fresh from server? Other devices keep their data.')) return;
    try {
      const { data: row, error } = await supabase
        .from('planner_state')
        .select('data, updated_at')
        .eq('id', HOUSEHOLD_ID)
        .maybeSingle();
      if (error) throw error;
      if (row?.data) {
        try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
        localChangePending.current = false;
        setData(mergeSeedRecipes(row.data));
        lastSavedAt.current = row.updated_at;
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        window.alert('Reset complete — local data replaced with server version.');
      } else {
        window.alert('No data found on server. Nothing to restore.');
      }
    } catch (e) {
      window.alert(`Reset failed: ${e.message}`);
    }
  };

  // Test write — runs a no-op upsert to verify the round-trip works
  const testWrite = async () => {
    if (!supabase) { window.alert('Supabase not configured on this build.'); return; }
    try {
      const { error } = await supabase
        .from('planner_state')
        .upsert({ id: HOUSEHOLD_ID, data, updated_at: new Date().toISOString() });
      if (error) {
        window.alert(`Test write FAILED: ${error.message}\n\nCheck your Supabase RLS policies and table permissions.`);
        setDiagnostics(d => ({ ...d, lastSaveError: error.message }));
      } else {
        window.alert(`Test write OK ✓\nHousehold: ${HOUSEHOLD_ID}\nOther devices should now receive this update.`);
        setDiagnostics(d => ({ ...d, lastSaveOk: new Date(), lastSaveError: null }));
      }
    } catch (e) {
      window.alert(`Test write THREW: ${e.message}`);
    }
  };

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

  const setDaySlot = (day, mealSlot, value) => setData(d => ({
    ...d,
    week: {
      ...d.week,
      [day]: { ...(d.week[day] || emptyDaySlots()), [mealSlot]: value },
    },
  }));

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
  const clearWeek = () => setData(d => ({ ...d, week: Object.fromEntries(DAYS.map(day => [day, emptyDaySlots()])) }));

  const logCook = (recipeId, entry) => setData(d => ({
    ...d,
    recipes: d.recipes.map(r => r.id === recipeId
      ? { ...r, cookLog: [entry, ...(r.cookLog || [])].slice(0, 20) }
      : r
    ),
  }));

  const reorderAisles = (newOrder) => setData(d => ({ ...d, aisleOrder: newOrder }));

  const setDefaultServings = (n) => setData(d => ({ ...d, defaultServings: Math.max(1, Math.min(20, n)) }));

  // Store AI-generated nutrition info on a recipe
  const setRecipeNutrition = (recipeId, nutrition) => setData(d => ({
    ...d,
    recipes: d.recipes.map(r => r.id === recipeId ? { ...r, nutrition } : r),
  }));

  const addCustomItem = (item) => setData(d => ({
    ...d,
    customShoppingItems: [...(d.customShoppingItems || []), { id: `custom-${uid()}`, ...item }],
  }));

  const deleteCustomItem = (id) => setData(d => ({
    ...d,
    customShoppingItems: (d.customShoppingItems || []).filter(i => i.id !== id),
    shoppingChecked: d.shoppingChecked.filter(k => k !== id),
  }));

  const fillWeekRandom = (onlyMealTypes = null) => {
    if (!data.recipes.length) return;
    const targetSlots = onlyMealTypes || MEAL_SLOTS;
    // Group recipes by meal type
    const byType = {};
    MEAL_SLOTS.forEach(s => { byType[s] = []; });
    data.recipes.forEach(r => {
      const t = r.mealType || 'dinner';
      if (byType[t]) byType[t].push(r);
    });
    // Shuffle each pool
    Object.keys(byType).forEach(t => { byType[t] = byType[t].sort(() => Math.random() - 0.5); });

    const newWeek = { ...data.week };
    const idx = {}; MEAL_SLOTS.forEach(s => { idx[s] = 0; });
    DAYS.forEach(day => {
      const daySlots = { ...(newWeek[day] || emptyDaySlots()) };
      targetSlots.forEach(mealSlot => {
        if (!daySlots[mealSlot] && byType[mealSlot].length > 0) {
          const pool = byType[mealSlot];
          const recipe = pool[idx[mealSlot] % pool.length];
          idx[mealSlot]++;
          daySlots[mealSlot] = { recipeId: recipe.id, servings: data.defaultServings || recipe.servings };
        }
      });
      newWeek[day] = daySlots;
    });
    setData(d => ({ ...d, week: newWeek }));
  };

  const markLeftover = (sourceDay, mealSlot) => {
    const idx = DAYS.indexOf(sourceDay);
    const nextDay = DAYS[idx + 1];
    if (!nextDay) return;
    const slot = data.week[sourceDay]?.[mealSlot];
    if (!slot || slot.isLeftover) return;
    const recipe = data.recipes.find(r => r.id === slot.recipeId);
    setData(d => ({
      ...d,
      week: {
        ...d.week,
        [nextDay]: {
          ...(d.week[nextDay] || emptyDaySlots()),
          [mealSlot]: { isLeftover: true, fromDay: sourceDay, fromMealSlot: mealSlot, recipeName: recipe?.name || '' },
        },
      },
    }));
  };

  const markSkipped = (day, mealSlot) => setData(d => ({
    ...d,
    week: {
      ...d.week,
      [day]: { ...(d.week[day] || emptyDaySlots()), [mealSlot]: { isSkipped: true } },
    },
  }));

  if (loading || !data) return <Loader />;

  const openRecipe = openRecipeId ? data.recipes.find(r => r.id === openRecipeId) : null;

  const filteredRecipes = data.recipes.filter(r => {
    // Sub-tab filter (Breakfast / Lunch+Dinner / Snacks)
    if (recipeTab === 'breakfast' && r.mealType !== 'breakfast') return false;
    if (recipeTab === 'lunch-dinner' && r.mealType !== 'lunch' && r.mealType !== 'dinner') return false;
    if (recipeTab === 'snack' && r.mealType !== 'snack') return false;
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

  const weekCount = Object.values(data.week).reduce((sum, daySlots) => {
    if (!daySlots) return sum;
    return sum + Object.values(daySlots).filter(s => s && !s.isLeftover).length;
  }, 0);

  // If cook mode is active, render it full screen
  if (cookModeRecipe) {
    return <CookModeView
      recipe={cookModeRecipe}
      onClose={() => setCookModeRecipe(null)}
      onLogCook={(entry) => logCook(cookModeRecipe.id, entry)}
    />;
  }

  return (
    <div className="mp-root">
      {updateAvailable && (
        <UpdateBanner
          onUpdate={() => updateAvailable.updateSW(true)}
          onDismiss={() => setUpdateAvailable(null)}
        />
      )}
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
          <button className="mp-icon-btn" onClick={() => setSettingsOpen(true)} title="Settings"><Settings size={18} /></button>
          <SyncDot status={syncStatus} hasSupabase={!!supabase} lastSyncedAt={lastSyncedAt} onForceSync={forceSync} />
          {tab === 'recipes' && <>
            <button className="mp-icon-btn" onClick={() => setImporting(true)} title="Import from URL"><Link size={18} /></button>
            <button className={`mp-icon-btn ${(activeFilters.tags.length || activeFilters.favs || activeFilters.mealType !== 'all') ? 'mp-icon-btn-active' : ''}`} onClick={() => setFilterOpen(true)}><Filter size={18} /></button>
            <button className="mp-icon-btn mp-icon-btn-primary" onClick={() => setEditing({})}><Plus size={20} /></button>
          </>}
          {tab === 'week' && <>
            <div className="mp-shuffle-menu-wrap">
              <button className="mp-icon-btn" onClick={() => setShuffleMenuOpen(s => !s)} title="Fill randomly">
                <Shuffle size={18} />
              </button>
              {shuffleMenuOpen && (
                <>
                  <div className="mp-shuffle-menu-backdrop" onClick={() => setShuffleMenuOpen(false)} />
                  <div className="mp-shuffle-menu">
                    <button onClick={() => { fillWeekRandom(); setShuffleMenuOpen(false); }}>Fill empty slots (all meals)</button>
                    {MEAL_TYPES.map(mt => (
                      <button key={mt.id} onClick={() => { fillWeekRandom([mt.id]); setShuffleMenuOpen(false); }}>
                        {mt.emoji} Just fill {mt.label.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {weekCount > 0 && <button className="mp-icon-btn" onClick={() => { if (window.confirm('Clear the whole week?')) clearWeek(); }}><RotateCcw size={18} /></button>}
          </>}
          {tab === 'shopping' && data.shoppingChecked.length > 0 && <button className="mp-icon-btn" onClick={clearChecks}><RotateCcw size={18} /></button>}
        </div>
      </header>

      {tab === 'recipes' && (
        <>
          <div className="mp-search-row">
            <div className="mp-search">
              <Search size={16} />
              <input type="text" placeholder="Search recipes & ingredients…" value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button className="mp-search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
            </div>
          </div>
          <div className="mp-subtabs">
            {[
              { id: 'all',          label: 'All' },
              { id: 'breakfast',    label: 'Breakfast' },
              { id: 'lunch-dinner', label: 'Lunch & Dinner' },
              { id: 'snack',        label: 'Snacks' },
            ].map(t => (
              <button
                key={t.id}
                className={`mp-subtab ${recipeTab === t.id ? 'mp-subtab-on' : ''}`}
                onClick={() => setRecipeTab(t.id)}
              >{t.label}</button>
            ))}
          </div>
        </>
      )}

      <main className="mp-main">
        {tab === 'recipes' && <RecipesTab recipes={filteredRecipes} favourites={data.favourites} onOpen={setOpenRecipeId} onToggleFav={toggleFav} isEmpty={data.recipes.length === 0} />}
        {tab === 'week' && <WeekTab week={data.week} recipes={data.recipes} onOpen={setOpenRecipeId} onUnassign={(day, mealSlot) => setDaySlot(day, mealSlot, null)} onMarkLeftover={markLeftover} onMarkSkipped={markSkipped} />}
        {tab === 'shopping' && <ShoppingTab data={data} onToggleCheck={toggleCheck} onReorderAisles={reorderAisles} onAddCustom={addCustomItem} onDeleteCustom={deleteCustomItem} />}
        {tab === 'pantry' && <PantryTab recipes={data.recipes} pantry={data.pantry} onToggle={togglePantry} onOpenRecipe={setOpenRecipeId} onInventOpen={() => setInventOpen(true)} />}
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
          defaultServings={data.defaultServings || 2}
          onClose={() => setOpenRecipeId(null)} onToggleFav={() => toggleFav(openRecipe.id)}
          onEdit={() => { setEditing(openRecipe); setOpenRecipeId(null); }}
          onDelete={() => { if (window.confirm(`Delete "${openRecipe.name}"?`)) { deleteRecipe(openRecipe.id); setOpenRecipeId(null); } }}
          onAssignDay={(day, mealSlot, servings) => setDaySlot(day, mealSlot, { recipeId: openRecipe.id, servings })}
          onUnassignDay={(day, mealSlot) => setDaySlot(day, mealSlot, null)}
          onStartCook={() => { setOpenRecipeId(null); setCookModeRecipe(openRecipe); }}
          onNutritionUpdate={setRecipeNutrition}
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

      {settingsOpen && (
        <SettingsSheet
          defaultServings={data.defaultServings || 2}
          onSetServings={setDefaultServings}
          onClose={() => setSettingsOpen(false)}
          diagnostics={diagnostics}
          householdId={HOUSEHOLD_ID}
          hasSupabase={!!supabase}
          onForceSync={forceSync}
          onTestWrite={testWrite}
          onHardResync={hardResyncFromServer}
        />
      )}

      {inventOpen && (
        <InventRecipeSheet
          pantry={data.pantry}
          defaultServings={data.defaultServings || 2}
          onClose={() => setInventOpen(false)}
          onSaveRecipe={(r) => { upsertRecipe({ ...applyRecipeDefaults(r), id: uid() }); }}
        />
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================
function SyncDot({ status, hasSupabase, lastSyncedAt, onForceSync }) {
  if (!hasSupabase) return null;
  const map = {
    idle:    { cls: 'mp-sync-idle',    title: 'Connecting…' },
    syncing: { cls: 'mp-sync-syncing', title: 'Syncing…' },
    synced:  { cls: 'mp-sync-synced',  title: 'Synced — tap to refresh' },
    offline: { cls: 'mp-sync-offline', title: 'Offline — tap to retry' },
  };
  const { cls, title } = map[status] || map.idle;

  // Format "last synced" tooltip
  let tooltip = title;
  if (lastSyncedAt && status === 'synced') {
    const seconds = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
    if (seconds < 60) tooltip = `Synced just now — tap to refresh`;
    else if (seconds < 3600) tooltip = `Synced ${Math.floor(seconds / 60)}m ago — tap to refresh`;
    else tooltip = `Synced ${Math.floor(seconds / 3600)}h ago — tap to refresh`;
  }

  return (
    <button
      className={`mp-sync-dot mp-sync-dot-btn ${cls}`}
      title={tooltip}
      onClick={onForceSync}
      aria-label={tooltip}
    >
      {status === 'syncing' && <RefreshCw size={10} className="mp-sync-spin" />}
    </button>
  );
}

function UpdateBanner({ onUpdate, onDismiss }) {
  return (
    <div className="mp-update-banner">
      <RefreshCw size={14} />
      <span>New version available</span>
      <button className="mp-update-btn" onClick={onUpdate}>Refresh</button>
      <button className="mp-update-dismiss" onClick={onDismiss} aria-label="Dismiss"><X size={14} /></button>
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
      {recipe.photo ? (
        <div className="mp-card-photo" style={{ backgroundImage: `url(${recipe.photo})` }}>
          <button
            className={`mp-fav-btn mp-fav-photo ${isFav ? 'mp-fav-on' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            aria-label={isFav ? 'Unfavourite' : 'Favourite'}
          >
            <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
          </button>
        </div>
      ) : (
        <div className="mp-card-stripe" style={{ background: getCardColor(recipe.id) }} />
      )}
      <div className="mp-card-body">
        <div className="mp-card-top">
          <div className="mp-card-meta">{recipe.cuisine || 'Recipe'} · {recipe.time || `serves ${recipe.servings}`}</div>
          {!recipe.photo && (
            <button
              className={`mp-fav-btn ${isFav ? 'mp-fav-on' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
              aria-label={isFav ? 'Unfavourite' : 'Favourite'}
            >
              <Star size={16} fill={isFav ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
        <h2 className="mp-display mp-card-title">{recipe.name}</h2>
        <div className="mp-card-bottom">
          {recipe.tags?.length > 0 && (
            <div className="mp-tag-row">
              {recipe.tags.slice(0, 3).map(t => <span className="mp-tag" key={t}>{t}</span>)}
              {recipe.tags.length > 3 && <span className="mp-tag mp-tag-more">+{recipe.tags.length - 3}</span>}
            </div>
          )}
          {mealTypeLabel && mealTypeLabel.id !== 'dinner' && (
            <span className="mp-meal-badge">{mealTypeLabel.label}</span>
          )}
        </div>
      </div>
    </article>
  );
}

function WeekTab({ week, recipes, onOpen, onUnassign, onMarkLeftover, onMarkSkipped }) {
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('week-view-mode') || 'expanded');
  const [expandedDays, setExpandedDays] = useState(() => new Set([DAYS[todayIdx]]));

  const setMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('week-view-mode', mode);
  };

  const toggleExpanded = (day) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  };

  return (
    <div className="mp-week">
      <div className="mp-week-mode-toggle">
        <button className={`mp-week-mode-btn ${viewMode === 'expanded' ? 'mp-week-mode-on' : ''}`} onClick={() => setMode('expanded')}>Expanded</button>
        <button className={`mp-week-mode-btn ${viewMode === 'compact' ? 'mp-week-mode-on' : ''}`} onClick={() => setMode('compact')}>Compact</button>
      </div>

      {DAYS.map((day, dayIdx) => {
        const daySlots = week[day] || emptyDaySlots();
        const slotsPlanned = MEAL_SLOTS.filter(s => daySlots[s] && !daySlots[s].isLeftover && !daySlots[s].isSkipped).length;
        const slotsSkipped = MEAL_SLOTS.filter(s => daySlots[s]?.isSkipped).length;
        const isToday = dayIdx === todayIdx;
        const isExpanded = viewMode === 'expanded' || expandedDays.has(day);

        // Compact summary text
        const plannedNames = MEAL_SLOTS
          .filter(s => daySlots[s] && !daySlots[s].isLeftover && !daySlots[s].isSkipped)
          .map(s => recipes.find(r => r.id === daySlots[s].recipeId)?.name)
          .filter(Boolean)
          .slice(0, 2);

        return (
          <div key={day} className={`mp-week-daycard ${isToday ? 'mp-week-daycard-today' : ''}`}>
            <div
              className="mp-week-daycard-head"
              onClick={viewMode === 'compact' ? () => toggleExpanded(day) : undefined}
              style={viewMode === 'compact' ? { cursor: 'pointer' } : {}}
            >
              <div className="mp-display mp-week-daylabel">
                {DAY_LONG[day]}
                {isToday && <span className="mp-today-pill">today</span>}
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                {slotsPlanned > 0 && <div className="mp-week-meal-count">{slotsPlanned} {slotsPlanned === 1 ? 'meal' : 'meals'}</div>}
                {viewMode === 'compact' && (
                  <ChevronDown size={16} style={{ color: 'var(--ink-3)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                )}
              </div>
            </div>

            {/* Compact summary line shown when collapsed */}
            {viewMode === 'compact' && !isExpanded && (
              <div className="mp-week-compact-summary">
                {plannedNames.length > 0
                  ? <>{plannedNames.join(' · ')}{slotsPlanned > plannedNames.length && <span> · +{slotsPlanned - plannedNames.length} more</span>}</>
                  : <span style={{color:'var(--ink-3)', fontStyle:'italic'}}>Nothing planned</span>}
                {slotsSkipped > 0 && <span style={{color:'var(--ink-3)'}}> · {slotsSkipped} out</span>}
              </div>
            )}

            {isExpanded && (
              <div className="mp-meal-slots">
                {MEAL_TYPES.map(mt => {
                  const slot = daySlots[mt.id];
                  const recipe = (slot && !slot.isLeftover && !slot.isSkipped) ? recipes.find(r => r.id === slot.recipeId) : null;
                  const isLeftover = slot?.isLeftover;
                  const isSkipped = slot?.isSkipped;
                  const canLeftover = recipe?.makesLeftovers && dayIdx < 6 && !daySlots[mt.id]?.isLeftover && !week[DAYS[dayIdx + 1]]?.[mt.id];
                  return (
                    <div key={mt.id} className={`mp-meal-slot ${recipe ? 'mp-meal-slot-filled' : isLeftover ? 'mp-meal-slot-leftover' : isSkipped ? 'mp-meal-slot-skipped' : 'mp-meal-slot-empty'}`}>
                      <div className="mp-meal-slot-label">
                        <span className="mp-meal-slot-emoji">{mt.emoji}</span>
                        <span className="mp-meal-slot-type">{mt.label}</span>
                      </div>
                      {recipe ? (
                        <div className="mp-meal-slot-body" onClick={() => onOpen(recipe.id)}>
                          <div className="mp-meal-slot-name">{recipe.name}</div>
                          <div className="mp-meal-slot-meta">
                            serves {slot.servings}
                            {canLeftover && (
                              <button
                                className="mp-leftover-btn"
                                onClick={(e) => { e.stopPropagation(); onMarkLeftover(day, mt.id); }}
                                title="Mark tomorrow's same slot as leftovers"
                              >
                                <Repeat2 size={10} /> tomorrow?
                              </button>
                            )}
                          </div>
                        </div>
                      ) : isLeftover ? (
                        <div className="mp-meal-slot-body">
                          <div className="mp-meal-slot-leftover-text">
                            <Repeat2 size={11} /> Leftovers from {DAY_LONG[slot.fromDay]} ({slot.recipeName})
                          </div>
                        </div>
                      ) : isSkipped ? (
                        <div className="mp-meal-slot-body">
                          <div className="mp-meal-slot-skipped-text">
                            <UtensilsCrossed size={11} /> Eating out
                          </div>
                        </div>
                      ) : (
                        <div className="mp-meal-slot-body">
                          <button className="mp-meal-slot-skip-link" onClick={() => onMarkSkipped(day, mt.id)} title="Mark as eating out">
                            <span className="mp-meal-slot-empty-text">— skip</span>
                          </button>
                        </div>
                      )}
                      {(recipe || isLeftover || isSkipped) && (
                        <button className="mp-meal-slot-remove" onClick={(e) => { e.stopPropagation(); onUnassign(day, mt.id); }} aria-label="Remove">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      <div className="mp-hint">Open a recipe → choose meal slot + days. Tap <Shuffle size={12} style={{verticalAlign:'-2px'}} /> to fill empty slots randomly.</div>
    </div>
  );
}

function ShoppingTab({ data, onToggleCheck, onReorderAisles, onAddCustom, onDeleteCustom }) {
  const [reordering, setReordering] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', amount: '', unit: '', aisle: 'other' });
  const [showCompleted, setShowCompleted] = useState(false);
  const aisleOrder = data.aisleOrder || AISLES.map(a => a.id);
  const customItems = data.customShoppingItems || [];

  // Returns: { aisleId: [ {canon, name, aisle, units: [{key,amount,unit,recipes}], isCustom?} ] }
  const byAisle = useMemo(() => {
    const recipeBased = aggregateShoppingList(data.week, data.recipes, data.pantry);
    // Add custom items as their own single-unit "groups"
    customItems.forEach(item => {
      if (!recipeBased[item.aisle]) recipeBased[item.aisle] = [];
      recipeBased[item.aisle].push({
        canon: item.id, // unique key for custom items
        name: item.name,
        aisle: item.aisle,
        isCustom: true,
        units: [{
          key: item.id,
          amount: item.amount ? Number(item.amount) : null,
          unit: item.unit || '',
          recipes: ['added by you'],
        }],
      });
    });
    Object.values(recipeBased).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
    return recipeBased;
  }, [data.week, data.recipes, data.pantry, customItems]);

  // A "group" is checked when all its units are checked.
  const isGroupChecked = (group) => group.units.every(u => data.shoppingChecked.includes(u.key));

  // Split into pending vs completed groups for display
  const pending = {};
  const completed = [];
  for (const aisle of aisleOrder) {
    const arr = byAisle[aisle] || [];
    arr.forEach(group => {
      if (isGroupChecked(group)) {
        completed.push(group);
      } else {
        if (!pending[aisle]) pending[aisle] = [];
        pending[aisle].push(group);
      }
    });
  }

  const totalPending = Object.values(pending).reduce((s, arr) => s + arr.length, 0);
  const totalCompleted = completed.length;
  const totalItems = totalPending + totalCompleted;

  const moveAisle = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= aisleOrder.length) return;
    const next = [...aisleOrder];
    [next[i], next[j]] = [next[j], next[i]];
    onReorderAisles(next);
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    onAddCustom({ name: newItem.name.trim(), amount: newItem.amount, unit: newItem.unit, aisle: newItem.aisle });
    setNewItem({ name: '', amount: '', unit: '', aisle: 'other' });
    setAddingItem(false);
  };

  // Toggle all units in a group at once
  const toggleGroup = (group) => {
    const allChecked = isGroupChecked(group);
    group.units.forEach(u => {
      const isOn = data.shoppingChecked.includes(u.key);
      // If not all checked, only check the unchecked ones. If all checked, uncheck all.
      if (allChecked) { onToggleCheck(u.key); }
      else if (!isOn) { onToggleCheck(u.key); }
    });
  };

  if (reordering) {
    return (
      <div className="mp-shopping">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
          <div className="mp-shopping-meta">Tap arrows to match your store</div>
          <button className="mp-btn mp-btn-primary mp-btn-small" style={{flex:0}} onClick={() => setReordering(false)}>Done</button>
        </div>
        <div className="mp-aisle-order-list">
          {aisleOrder.map((id, i) => {
            const aisle = AISLES.find(a => a.id === id);
            const count = byAisle[id]?.length || 0;
            return (
              <div key={id} className="mp-aisle-order-row">
                <GripVertical size={16} style={{color:'var(--ink-3)', flexShrink:0}} />
                <span className="mp-aisle-order-label">
                  {aisle?.label}
                  {count > 0 && <span className="mp-aisle-order-count">{count}</span>}
                </span>
                <div className="mp-aisle-order-btns">
                  <button onClick={() => moveAisle(i, -1)} disabled={i === 0}><ChevronUp size={16} /></button>
                  <button onClick={() => moveAisle(i, 1)} disabled={i === aisleOrder.length - 1}><ChevronDown size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const orderedAisles = aisleOrder
    .map(id => AISLES.find(a => a.id === id))
    .filter(a => a && byAisle[a.id]?.length);

  return (
    <div className="mp-shopping">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'0.75rem', gap:8}}>
        <div className="mp-shopping-meta">
          {totalItems === 0 ? 'Empty list' : `${totalPending} to get${totalCompleted > 0 ? ` · ${totalCompleted} done` : ''}`}
        </div>
        <div style={{display:'flex', gap:6}}>
          <button className="mp-icon-btn" style={{width:32, height:32}} onClick={() => setAddingItem(true)} title="Add custom item">
            <Plus size={16} />
          </button>
          <button className="mp-icon-btn" style={{width:32, height:32}} onClick={() => setReordering(true)} title="Arrange aisles">
            <GripVertical size={16} />
          </button>
        </div>
      </div>

      {addingItem && (
        <div className="mp-custom-add">
          <input
            className="mp-input mp-input-name" autoFocus
            placeholder="e.g. Toilet paper, batteries…"
            value={newItem.name}
            onChange={e => setNewItem(i => ({ ...i, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleAddItem()}
          />
          <div className="mp-custom-add-row">
            <input className="mp-input mp-input-amount" type="number" step="0.1" placeholder="qty" value={newItem.amount} onChange={e => setNewItem(i => ({ ...i, amount: e.target.value }))} />
            <input className="mp-input mp-input-unit" placeholder="unit" value={newItem.unit} onChange={e => setNewItem(i => ({ ...i, unit: e.target.value }))} />
            <select className="mp-input mp-input-aisle" value={newItem.aisle} onChange={e => setNewItem(i => ({ ...i, aisle: e.target.value }))}>
              {AISLES.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          <div style={{display:'flex', gap:8, marginTop:8}}>
            <button className="mp-btn mp-btn-ghost" onClick={() => { setAddingItem(false); setNewItem({ name: '', amount: '', unit: '', aisle: 'other' }); }}>Cancel</button>
            <button className={`mp-btn mp-btn-primary ${newItem.name.trim() ? '' : 'mp-btn-disabled'}`} disabled={!newItem.name.trim()} onClick={handleAddItem}>Add</button>
          </div>
        </div>
      )}

      {totalItems === 0 && !addingItem && (
        <div className="mp-empty" style={{padding:'2rem 1rem'}}>
          <div className="mp-display mp-empty-title">Empty basket.</div>
          <p className="mp-empty-text">Plan some meals or tap + to add household items.</p>
        </div>
      )}

      {totalItems > 0 && totalPending === 0 && (
        <div className="mp-empty" style={{padding:'2rem 1rem'}}>
          <div className="mp-display mp-empty-title">All done! 🎉</div>
          <p className="mp-empty-text">Tap "Show completed" below to review or un-tick anything.</p>
        </div>
      )}

      {orderedAisles.filter(a => pending[a.id]).map(aisle => (
        <section key={aisle.id} className="mp-aisle">
          <h3 className="mp-aisle-label">{aisle.label}</h3>
          <ul className="mp-aisle-list">
            {pending[aisle.id].map(group => {
              const hasMultipleUnits = group.units.length > 1;
              return (
                <li key={group.canon} className="mp-shopping-item" onClick={() => toggleGroup(group)}>
                  <div className="mp-check">{/* unchecked */}</div>
                  <div className="mp-shopping-text">
                    <div className="mp-shopping-name">
                      {group.name}
                      {group.isCustom && <span className="mp-custom-pill">custom</span>}
                    </div>
                    {hasMultipleUnits ? (
                      <div className="mp-shopping-sub">
                        {group.units.map((u, i) => (
                          <span key={u.key}>
                            {i > 0 && <span style={{opacity:0.5}}> + </span>}
                            {u.amount ? formatAmount(u.amount, u.unit) : (u.unit || '1')}
                          </span>
                        ))}
                        {!group.isCustom && (
                          <span className="mp-shopping-from">
                            {' · '}
                            {[...new Set(group.units.flatMap(u => u.recipes))].join(', ')}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="mp-shopping-sub">
                        {group.units[0].amount ? formatAmount(group.units[0].amount, group.units[0].unit) : ''}
                        {!group.isCustom && <span className="mp-shopping-from"> · {group.units[0].recipes.join(', ')}</span>}
                      </div>
                    )}
                  </div>
                  {group.isCustom && (
                    <button className="mp-shopping-del" onClick={(e) => { e.stopPropagation(); onDeleteCustom(group.units[0].key); }}><Trash size={14} /></button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {totalCompleted > 0 && (
        <div className="mp-completed-section">
          <button className="mp-completed-toggle" onClick={() => setShowCompleted(s => !s)}>
            <ChevronDown size={14} style={{transform: showCompleted ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s'}} />
            {showCompleted ? 'Hide' : 'Show'} {totalCompleted} completed
          </button>
          {showCompleted && (
            <ul className="mp-aisle-list mp-aisle-list-completed">
              {completed.map(group => (
                <li key={group.canon} className="mp-shopping-item mp-shopping-checked" onClick={() => toggleGroup(group)}>
                  <div className="mp-check mp-check-on"><Check size={14} /></div>
                  <div className="mp-shopping-text">
                    <div className="mp-shopping-name">{group.name}{group.isCustom && <span className="mp-custom-pill">custom</span>}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PantryTab({ recipes, pantry, onToggle, onOpenRecipe, onInventOpen }) {
  const known = useMemo(() => allIngredientNames(recipes), [recipes]);
  const [showAll, setShowAll] = useState(false);

  // Suggest recipes based on pantry match
  const suggestions = useMemo(() => {
    if (!pantry.length) return [];
    const pantrySet = new Set(pantry.map(p => p.toLowerCase()));
    return recipes.map(r => {
      const total = r.ingredients.length;
      const have = r.ingredients.filter(i => pantrySet.has(i.name.toLowerCase())).length;
      const missing = r.ingredients.filter(i => !pantrySet.has(i.name.toLowerCase()));
      return { recipe: r, have, total, pct: total > 0 ? have / total : 0, missing };
    })
    .filter(s => s.pct >= 0.5)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 6);
  }, [recipes, pantry]);

  const commonNotYet = COMMON_PANTRY.filter(p => !pantry.includes(p));
  return (
    <div className="mp-pantry">
      <p className="mp-pantry-blurb">Mark what you already keep at home. Anything ticked is hidden from your shopping list.</p>

      <button className="mp-invent-btn" onClick={onInventOpen} disabled={pantry.length === 0}>
        <Sparkles size={16} />
        <div style={{flex:1, textAlign:'left'}}>
          <div style={{fontWeight:500, fontSize:14}}>Invent a recipe with what I have</div>
          <div style={{fontSize:11, opacity:0.7, marginTop:2}}>
            {pantry.length === 0 ? 'Add some pantry items first' : `Claude will suggest dishes using your ${pantry.length} items`}
          </div>
        </div>
        <ChevronRight size={16} />
      </button>

      {suggestions.length > 0 && (
        <section className="mp-pantry-section">
          <div className="mp-pantry-section-head">
            <h3 className="mp-aisle-label">What can I make?</h3>
            <span className="mp-tiny">from your existing recipes</span>
          </div>
          <div className="mp-suggestions">
            {suggestions.map(s => (
              <div key={s.recipe.id} className="mp-suggestion" onClick={() => onOpenRecipe(s.recipe.id)}>
                <div className="mp-suggestion-bar">
                  <div className="mp-suggestion-bar-fill" style={{ width: `${Math.round(s.pct * 100)}%` }} />
                </div>
                <div className="mp-suggestion-body">
                  <div className="mp-suggestion-name">{s.recipe.name}</div>
                  <div className="mp-suggestion-meta">
                    {s.have} of {s.total} ingredients
                    {s.missing.length > 0 && s.missing.length <= 3 && (
                      <span> · need {s.missing.map(m => m.name).join(', ')}</span>
                    )}
                    {s.missing.length > 3 && <span> · need {s.missing.length} more</span>}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </section>
      )}

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

function RecipeDetailSheet({ recipe, week, isFav, defaultServings, onClose, onToggleFav, onEdit, onDelete, onAssignDay, onUnassignDay, onStartCook, onNutritionUpdate }) {
  const [servings, setServings] = useState(defaultServings || recipe.servings);
  const [mealSlot, setMealSlot] = useState(recipe.mealType || 'dinner');
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState('');

  const fetchNutrition = async () => {
    setNutritionLoading(true);
    setNutritionError('');
    try {
      const ingredientList = recipe.ingredients.map(i => `${i.amount}${i.unit ? ' ' + i.unit : ''} ${i.name}`).join('\n');
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          system: 'You estimate nutrition for recipes. Return ONLY a JSON object — no markdown.',
          messages: [{
            role: 'user',
            content: `Estimate nutrition per serving for this recipe (serves ${recipe.servings}):

${recipe.name}

Ingredients:
${ingredientList}

Return ONLY this JSON:
{"calories": 0, "protein": 0, "carbs": 0, "fat": 0, "fibre": 0}

All values per ONE serving. Numbers only, no units, rounded to whole numbers. Best estimate.`
          }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('Could not parse nutrition data');
      const nutrition = JSON.parse(match[0]);
      onNutritionUpdate(recipe.id, nutrition);
    } catch (e) {
      setNutritionError(`Couldn't estimate: ${e.message}`);
    } finally {
      setNutritionLoading(false);
    }
  };
  const factor = servings / recipe.servings;
  const hasSteps = recipe.steps?.length > 0;

  // Find all places this recipe is assigned (any day, any meal slot)
  const assignedSlots = [];
  DAYS.forEach(day => {
    MEAL_SLOTS.forEach(slotKey => {
      if (week[day]?.[slotKey]?.recipeId === recipe.id) {
        assignedSlots.push({ day, mealSlot: slotKey });
      }
    });
  });

  const mealSlotLabel = MEAL_TYPES.find(m => m.id === mealSlot);

  return (
    <div className="mp-sheet" onClick={onClose}>
      <div className="mp-sheet-content" onClick={e => e.stopPropagation()}>
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
            <h3 className="mp-aisle-label">Add to week</h3>
            <div className="mp-tiny" style={{marginBottom:8}}>Pick the meal slot, then tap days.</div>
            <div className="mp-tag-row" style={{marginBottom:14}}>
              {MEAL_TYPES.map(mt => (
                <button key={mt.id}
                  className={`mp-tag mp-tag-btn ${mealSlot === mt.id ? 'mp-tag-on' : ''}`}
                  onClick={() => setMealSlot(mt.id)}>
                  {mt.emoji} {mt.label}
                </button>
              ))}
            </div>
            <div className="mp-day-chips">
              {DAYS.map(day => {
                const slot = week[day]?.[mealSlot];
                const mine = slot?.recipeId === recipe.id;
                const otherTaken = slot && !mine;
                return (
                  <button key={day} className={`mp-day-chip ${mine ? 'mp-day-chip-on' : ''} ${otherTaken ? 'mp-day-chip-busy' : ''}`}
                    onClick={() => {
                      if (mine) { onUnassignDay(day, mealSlot); }
                      else if (otherTaken) {
                        if (window.confirm(`${DAY_LONG[day]} ${mealSlotLabel.label.toLowerCase()} already has a meal. Replace it?`)) onAssignDay(day, mealSlot, servings);
                      }
                      else { onAssignDay(day, mealSlot, servings); }
                    }}>
                    {DAY_SHORT[day]}
                  </button>
                );
              })}
            </div>
            <div className="mp-day-shortcuts">
              <button className="mp-day-shortcut-btn" onClick={() => {
                ['monday','tuesday','wednesday','thursday','friday'].forEach(d => {
                  if (!week[d]?.[mealSlot] || week[d][mealSlot].recipeId !== recipe.id) onAssignDay(d, mealSlot, servings);
                });
              }}>+ weekdays</button>
              <button className="mp-day-shortcut-btn" onClick={() => {
                ['saturday','sunday'].forEach(d => {
                  if (!week[d]?.[mealSlot] || week[d][mealSlot].recipeId !== recipe.id) onAssignDay(d, mealSlot, servings);
                });
              }}>+ weekend</button>
              <button className="mp-day-shortcut-btn" onClick={() => {
                DAYS.forEach(d => {
                  if (!week[d]?.[mealSlot] || week[d][mealSlot].recipeId !== recipe.id) onAssignDay(d, mealSlot, servings);
                });
              }}>+ all 7</button>
              <button className="mp-day-shortcut-btn mp-day-shortcut-clear" onClick={() => {
                DAYS.forEach(d => {
                  if (week[d]?.[mealSlot]?.recipeId === recipe.id) onUnassignDay(d, mealSlot);
                });
              }}>clear</button>
            </div>
            {assignedSlots.length > 0 && (
              <div className="mp-tiny" style={{marginTop:8}}>
                on {assignedSlots.map(a => `${DAY_SHORT[a.day]} ${MEAL_TYPES.find(m => m.id === a.mealSlot).label.toLowerCase()}`).join(', ')}
              </div>
            )}
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

          <section className="mp-sheet-section">
            <div className="mp-pantry-section-head">
              <h3 className="mp-aisle-label">Nutrition <span style={{fontWeight:400, fontSize:11, color:'var(--ink-3)'}}>per serving</span></h3>
              {!recipe.nutrition && !nutritionLoading && (
                <button className="mp-ai-btn" onClick={fetchNutrition}>
                  <Activity size={11} /> estimate
                </button>
              )}
              {recipe.nutrition && !nutritionLoading && (
                <button className="mp-link" onClick={fetchNutrition}>refresh</button>
              )}
            </div>
            {nutritionLoading ? (
              <div className="mp-nutrition-loading">
                <RefreshCw size={14} className="mp-sync-spin" /> Estimating nutrition…
              </div>
            ) : recipe.nutrition ? (
              <>
                <div className="mp-nutrition-grid">
                  <div className="mp-nutrition-stat">
                    <div className="mp-nutrition-value">{recipe.nutrition.calories}</div>
                    <div className="mp-nutrition-label">kcal</div>
                  </div>
                  <div className="mp-nutrition-stat">
                    <div className="mp-nutrition-value">{recipe.nutrition.protein}g</div>
                    <div className="mp-nutrition-label">protein</div>
                  </div>
                  <div className="mp-nutrition-stat">
                    <div className="mp-nutrition-value">{recipe.nutrition.carbs}g</div>
                    <div className="mp-nutrition-label">carbs</div>
                  </div>
                  <div className="mp-nutrition-stat">
                    <div className="mp-nutrition-value">{recipe.nutrition.fat}g</div>
                    <div className="mp-nutrition-label">fat</div>
                  </div>
                </div>
                {recipe.nutrition.fibre !== undefined && (
                  <div className="mp-tiny" style={{marginTop:8, textAlign:'center'}}>{recipe.nutrition.fibre}g fibre · AI-estimated, not exact</div>
                )}
              </>
            ) : nutritionError ? (
              <div className="mp-tiny" style={{color:'#B91C1C'}}>{nutritionError}</div>
            ) : (
              <p style={{fontSize:13, color:'var(--ink-3)', fontStyle:'italic', margin:'4px 0 0'}}>
                Tap "estimate" — Claude will guess the macros from the ingredients.
              </p>
            )}
          </section>

          {recipe.cookLog?.length > 0 && (
            <section className="mp-sheet-section">
              <h3 className="mp-aisle-label">Cook history</h3>
              <div className="mp-cook-log">
                {recipe.cookLog.slice(0, 5).map((entry, i) => (
                  <div key={i} className="mp-log-entry">
                    <div className="mp-log-header">
                      <div className="mp-log-stars">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} size={13} fill={n <= entry.rating ? 'currentColor' : 'none'}
                            style={{color: n <= entry.rating ? 'var(--accent)' : 'var(--line)'}} />
                        ))}
                      </div>
                      <div className="mp-log-date">
                        {new Date(entry.date).toLocaleDateString('en-GB', {day:'numeric', month:'short', year:'numeric'})}
                      </div>
                    </div>
                    {entry.note && <div className="mp-log-note">{entry.note}</div>}
                  </div>
                ))}
              </div>
            </section>
          )}

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

function CookModeView({ recipe, onClose, onLogCook }) {
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [activeIng, setActiveIng] = useState(null);
  const [timer, setTimer] = useState(null);
  const [showLog, setShowLog] = useState(false);
  const [logRating, setLogRating] = useState(5);
  const [logNote, setLogNote] = useState('');
  const [subResult, setSubResult] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const steps = recipe.steps || [];

  const fetchSubstitute = async (ingredient) => {
    setSubLoading(true);
    setSubResult(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 250,
          system: 'You suggest cooking substitutions. Be concise — 1 short sentence with the best substitute, then ½ sentence on flavour/texture difference if relevant. No headers, no lists.',
          messages: [{
            role: 'user',
            content: `In the recipe "${recipe.name}", what's the best substitute for ${ingredient.name}? Consider the cooking context.`
          }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
      setSubResult({ ingredient: ingredient.name, text });
    } catch (e) {
      setSubResult({ ingredient: ingredient.name, text: `Couldn't fetch: ${e.message}` });
    } finally {
      setSubLoading(false);
    }
  };

  // Keep screen awake
  useEffect(() => {
    let lock = null;
    navigator.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    return () => { lock?.release(); };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!timer?.running) return;
    const interval = setInterval(() => {
      setTimer(t => {
        if (!t?.running) return t;
        if (t.remaining <= 1) {
          if (navigator.vibrate) navigator.vibrate([300, 100, 300]);
          return { ...t, remaining: 0, running: false, done: true };
        }
        return { ...t, remaining: t.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timer?.running]);

  const currentTimers = steps[step] ? findTimers(steps[step]) : [];
  const currentParts = steps[step] ? parseStepIngredients(steps[step], recipe.ingredients) : [];

  const handleDone = () => setShowLog(true);

  const handleSaveLog = () => {
    onLogCook({ date: new Date().toISOString(), rating: logRating, note: logNote.trim() });
    onClose();
  };

  function formatSecs(s) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  // Log sheet overlay
  if (showLog) {
    return (
      <div className="mp-cookmode">
        <div className="mp-cookmode-log-sheet">
          <div className="mp-cookmode-log-emoji">🍽️</div>
          <h2 className="mp-display" style={{color:'white', fontSize:28, marginBottom:6}}>How did it go?</h2>
          <div className="mp-cookmode-stars">
            {[1,2,3,4,5].map(n => (
              <button key={n} className="mp-cookmode-star-btn" onClick={() => setLogRating(n)}>
                <Star size={32} fill={n <= logRating ? 'currentColor' : 'none'} style={{color: n <= logRating ? '#F59E0B' : 'rgba(255,255,255,0.3)'}} />
              </button>
            ))}
          </div>
          <textarea
            className="mp-cookmode-log-note"
            placeholder="Any notes for next time? (optional)"
            value={logNote}
            onChange={e => setLogNote(e.target.value)}
            rows={3}
          />
          <button className="mp-cookmode-nav-btn mp-cookmode-nav-done" style={{width:'100%', margin:'8px 0 0'}} onClick={handleSaveLog}>
            <Check size={18} /> Save & finish
          </button>
          <button className="mp-cookmode-skip-btn" onClick={onClose}>Skip</button>
        </div>
      </div>
    );
  }

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

      {steps.length > 0 && (
        <div className="mp-cookmode-bar">
          <div className="mp-cookmode-bar-fill" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      )}

      <div className="mp-cookmode-body" onClick={() => setActiveIng(null)}>
        {steps.length === 0 ? (
          <div className="mp-cookmode-empty">
            <UtensilsCrossed size={48} style={{opacity:0.3, marginBottom:16}} />
            <div style={{fontSize:22, fontWeight:500, marginBottom:8}}>No steps yet</div>
            <p style={{color:'rgba(255,255,255,0.6)', fontSize:15, lineHeight:1.6}}>Add cooking steps to this recipe in the editor.</p>
          </div>
        ) : (
          <>
            <div className="mp-cookmode-step-num">Step {step + 1}</div>
            {/* Inline ingredient taps */}
            <div className="mp-cookmode-step-text">
              {currentParts.map((part, i) =>
                part.ing ? (
                  <button
                    key={i}
                    className={`mp-ing-tap ${activeIng === i ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); setActiveIng(activeIng === i ? null : i); }}
                  >
                    {part.text}
                    {activeIng === i && (
                      <span className="mp-ing-popup mp-ing-popup-rich" onClick={(e) => e.stopPropagation()}>
                        <span className="mp-ing-popup-qty">{formatAmount(part.ing.amount, part.ing.unit)}</span>
                        <button
                          className="mp-ing-popup-sub"
                          onClick={(e) => { e.stopPropagation(); fetchSubstitute(part.ing); setActiveIng(null); }}
                        >
                          <Sparkles size={10} /> no this?
                        </button>
                      </span>
                    )}
                  </button>
                ) : (
                  <span key={i}>{part.text}</span>
                )
              )}
            </div>

            {/* AI substitution result */}
            {(subLoading || subResult) && (
              <div className="mp-cookmode-sub-result">
                {subLoading ? (
                  <div style={{display:'flex', alignItems:'center', gap:8}}>
                    <RefreshCw size={14} className="mp-sync-spin" /> finding a substitute…
                  </div>
                ) : (
                  <>
                    <div style={{fontSize:11, color:'#F59E0B', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4, fontWeight:600}}>
                      substitute for {subResult.ingredient}
                    </div>
                    <div>{subResult.text}</div>
                    <button
                      style={{background:'transparent', border:'none', color:'rgba(255,255,255,0.5)', fontSize:11, marginTop:6, cursor:'pointer', padding:0, fontFamily:'inherit'}}
                      onClick={() => setSubResult(null)}
                    >dismiss</button>
                  </>
                )}
              </div>
            )}

            {/* Auto-detected timers */}
            {currentTimers.length > 0 && (
              <div className="mp-cookmode-timers">
                {currentTimers.map((t, i) => (
                  <button
                    key={i}
                    className="mp-cookmode-timer-btn"
                    onClick={() => setTimer({ label: t.label, total: t.seconds, remaining: t.seconds, running: true, done: false })}
                  >
                    <Timer size={14} /> {t.label}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Active timer display */}
      {timer && (
        <div className={`mp-cookmode-timer-display ${timer.done ? 'done' : ''}`}>
          <div className="mp-cookmode-timer-label">{timer.label}</div>
          <div className="mp-cookmode-timer-time">{formatSecs(timer.remaining)}</div>
          <div style={{display:'flex', gap:8}}>
            <button className="mp-cookmode-timer-ctrl" onClick={() => setTimer(t => ({ ...t, running: !t.running }))}>
              {timer.running ? '⏸' : '▶'}
            </button>
            <button className="mp-cookmode-timer-ctrl" onClick={() => setTimer(null)}>✕</button>
          </div>
        </div>
      )}

      {/* Ingredient drawer */}
      <div className={`mp-cookmode-ingredients ${showIngredients ? 'open' : ''}`}>
        <button className="mp-cookmode-ing-toggle" onClick={() => setShowIngredients(s => !s)}>
          <ClipboardList size={16} />
          {showIngredients ? 'Hide ingredients' : 'All ingredients'}
          <ChevronRight size={14} style={{ transform: showIngredients ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', marginLeft: 'auto' }} />
        </button>
        {showIngredients && (
          <ul className="mp-cookmode-ing-list">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}><span style={{color:'rgba(255,255,255,0.45)', minWidth:80, display:'inline-block'}}>{formatAmount(ing.amount, ing.unit)}</span>{ing.name}</li>
            ))}
          </ul>
        )}
      </div>

      {steps.length > 0 && (
        <div className="mp-cookmode-nav">
          <button className={`mp-cookmode-nav-btn ${step === 0 ? 'disabled' : ''}`} onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>
            <ChevronLeft size={22} /> Prev
          </button>
          {step < steps.length - 1 ? (
            <button className="mp-cookmode-nav-btn mp-cookmode-nav-next" onClick={() => { setStep(s => s + 1); setActiveIng(null); }}>
              Next <ChevronRight size={22} />
            </button>
          ) : (
            <button className="mp-cookmode-nav-btn mp-cookmode-nav-done" onClick={handleDone}>
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
function SettingsSheet({ defaultServings, onSetServings, onClose, diagnostics, householdId, hasSupabase, onTestWrite, onHardResync, onForceSync }) {
  const [servings, setServings] = useState(defaultServings);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const formatTime = (d) => {
    if (!d) return '—';
    const seconds = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <div className="mp-sheet mp-sheet-bottom" onClick={onClose}>
      <div className="mp-sheet-content mp-sheet-content-bottom" onClick={e => e.stopPropagation()}>
        <header className="mp-sheet-header">
          <h3 className="mp-display mp-filter-title">Settings</h3>
          <button className="mp-back" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="mp-sheet-body">
          <section className="mp-sheet-section">
            <label className="mp-label">Default servings (your household size)</label>
            <p style={{fontSize:12, color:'var(--ink-2)', margin:'4px 0 12px', lineHeight:1.5}}>
              When you assign a recipe to a day, it'll default to this many servings.
            </p>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <button className="mp-btn mp-btn-ghost" style={{width:44, padding:8, flex:0}} onClick={() => setServings(s => Math.max(1, s - 1))}>−</button>
              <input className="mp-input" type="number" min="1" max="20" value={servings}
                onChange={e => setServings(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                style={{textAlign:'center', flex:1, fontFamily:'Fraunces, serif', fontSize:24, fontWeight:500}} />
              <button className="mp-btn mp-btn-ghost" style={{width:44, padding:8, flex:0}} onClick={() => setServings(s => Math.min(20, s + 1))}>+</button>
            </div>
            <div style={{display:'flex', gap:8, marginTop:14}}>
              <button className="mp-btn mp-btn-ghost" onClick={onClose}>Cancel</button>
              <button className="mp-btn mp-btn-primary" onClick={() => { onSetServings(servings); onClose(); }}>Save</button>
            </div>
          </section>

          <section className="mp-sheet-section">
            <div className="mp-pantry-section-head">
              <h3 className="mp-aisle-label">Sync diagnostics</h3>
              <button className="mp-link" onClick={() => setShowDiagnostics(s => !s)}>
                {showDiagnostics ? 'hide' : 'show details'}
              </button>
            </div>

            <div className="mp-diag-list">
              <div className="mp-diag-row">
                <span>Supabase configured</span>
                <span className={hasSupabase ? 'mp-diag-ok' : 'mp-diag-bad'}>
                  {hasSupabase ? '✓ yes' : '✗ NO — env vars missing'}
                </span>
              </div>
              <div className="mp-diag-row">
                <span>Household ID</span>
                <span className="mp-diag-mono">{householdId}</span>
              </div>
              <div className="mp-diag-row">
                <span>Realtime</span>
                <span className={diagnostics.realtimeStatus === 'subscribed' ? 'mp-diag-ok' : 'mp-diag-warn'}>
                  {diagnostics.realtimeStatus}
                </span>
              </div>
              <div className="mp-diag-row">
                <span>Last save</span>
                <span>{formatTime(diagnostics.lastSaveOk)}</span>
              </div>
              <div className="mp-diag-row">
                <span>Last load</span>
                <span>{formatTime(diagnostics.lastLoadOk)}</span>
              </div>
              {showDiagnostics && (
                <>
                  <div className="mp-diag-row">
                    <span>Saves performed</span>
                    <span>{diagnostics.saveCount}</span>
                  </div>
                  <div className="mp-diag-row">
                    <span>Realtime msgs received</span>
                    <span>{diagnostics.incomingCount}</span>
                  </div>
                  <div className="mp-diag-row">
                    <span>Polls performed</span>
                    <span>{diagnostics.pollCount}</span>
                  </div>
                  {diagnostics.lastSaveError && (
                    <div className="mp-diag-error">
                      <strong>Last save error:</strong><br />{diagnostics.lastSaveError}
                    </div>
                  )}
                  {diagnostics.lastLoadError && (
                    <div className="mp-diag-error">
                      <strong>Last load error:</strong><br />{diagnostics.lastLoadError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:8, marginTop:14}}>
              <button className="mp-btn mp-btn-ghost" onClick={onForceSync}>
                <RefreshCw size={14} /> Pull from server now
              </button>
              <button className="mp-btn mp-btn-ghost" onClick={onTestWrite}>
                <Check size={14} /> Test write (verify round-trip)
              </button>
              <button className="mp-btn mp-btn-ghost" onClick={onHardResync} style={{color: '#B91C1C'}}>
                <RotateCcw size={14} /> Hard reset: replace local with server
              </button>
            </div>
          </section>

          {!hasSupabase && (
            <section className="mp-sheet-section">
              <div className="mp-diag-error">
                <strong>Sync is OFF on this device.</strong><br />
                The Supabase environment variables haven't loaded. Things you can try:<br />
                <br />
                • Pull-to-refresh this page<br />
                • Force-quit the app and reopen<br />
                • If on PWA: uninstall and reinstall from the browser<br />
                • Check VITE_SUPABASE_URL is set in Vercel and you've redeployed
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function InventRecipeSheet({ pantry, defaultServings, onClose, onSaveRecipe }) {
  const [selectedItems, setSelectedItems] = useState(() => new Set(pantry));
  const [mealType, setMealType] = useState('any');
  const [timeLimit, setTimeLimit] = useState('any');
  const [count, setCount] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState([]);
  const [savedIds, setSavedIds] = useState(new Set());

  const toggleItem = (item) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) next.delete(item); else next.add(item);
      return next;
    });
  };

  const generate = async () => {
    if (selectedItems.size === 0) return;
    setLoading(true);
    setError('');
    setResults([]);

    const items = Array.from(selectedItems);
    const constraints = [];
    if (mealType !== 'any') constraints.push(`meal type: ${mealType}`);
    if (timeLimit !== 'any') constraints.push(`under ${timeLimit} minutes total`);

    const prompt = `You're a creative home cook. Given these ingredients I have on hand, suggest ${count} distinct recipes that primarily use them.

Available ingredients:
${items.map(i => `- ${i}`).join('\n')}

${constraints.length > 0 ? 'Constraints: ' + constraints.join(', ') + '.' : ''}

Rules:
- Each recipe must mostly use ingredients from the list above
- You can assume basic pantry staples are always available: salt, pepper, oil, water, butter
- Vary the recipes — different meal types, cuisines, or cooking methods
- Keep them realistic for a home kitchen
- Serves ${defaultServings} unless the recipe makes more sense at a different size (e.g. batch cooking)

Return ONLY a JSON array — no markdown, no backticks, no preamble:
[
  {
    "name": "string",
    "cuisine": "short descriptor like 'Italian' or 'Sheet pan'",
    "time": "e.g. '25 min' or '45 min + rest'",
    "servings": ${defaultServings},
    "mealType": "breakfast|lunch|dinner|snack",
    "tags": ["quick", "high-protein", "veggie", "high-fibre", "one-pot", etc],
    "makesLeftovers": true|false,
    "notes": "one-line tip or context",
    "ingredients": [
      {"name": "string", "amount": number, "unit": "g|kg|ml|tsp|tbsp|cup|" or empty, "aisle": "produce|meat|dairy|pantry|bakery|frozen|spices|drinks|other"}
    ],
    "steps": ["full sentence", "full sentence", ...]
  }
]`;

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          system: 'You design recipes that respect the ingredient constraints. Return ONLY valid JSON — no markdown, no commentary.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('Could not parse recipes from response');
      const recipes = JSON.parse(match[0]);
      if (!Array.isArray(recipes)) throw new Error('Response was not an array of recipes');
      setResults(recipes);
    } catch (e) {
      setError(`Couldn't generate: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (recipe, idx) => {
    onSaveRecipe(recipe);
    setSavedIds(prev => new Set([...prev, idx]));
  };

  return (
    <div className="mp-sheet mp-sheet-bottom" onClick={onClose}>
      <div className="mp-sheet-content mp-sheet-content-bottom" onClick={e => e.stopPropagation()} style={{maxHeight:'90vh'}}>
        <header className="mp-sheet-header">
          <h3 className="mp-display mp-filter-title">Invent a recipe</h3>
          <button className="mp-back" onClick={onClose}><X size={20} /></button>
        </header>
        <div className="mp-sheet-body">
          {results.length === 0 && !loading && (
            <>
              <p style={{fontSize:13, color:'var(--ink-2)', marginBottom:14}}>
                Claude will suggest {count} recipes using ingredients from your pantry. Untick anything you don't want to use.
              </p>

              <section className="mp-sheet-section">
                <h3 className="mp-aisle-label">Using these ({selectedItems.size} of {pantry.length})</h3>
                <div className="mp-tag-row" style={{maxHeight:200, overflowY:'auto'}}>
                  {pantry.map(item => {
                    const on = selectedItems.has(item);
                    return (
                      <button key={item} className={`mp-pantry-pill ${on ? 'mp-pantry-pill-on' : ''}`} onClick={() => toggleItem(item)}>
                        {item}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="mp-sheet-section">
                <h3 className="mp-aisle-label">Meal type</h3>
                <div className="mp-tag-row">
                  {['any', 'breakfast', 'lunch', 'dinner', 'snack'].map(mt => (
                    <button key={mt} className={`mp-tag mp-tag-btn ${mealType === mt ? 'mp-tag-on' : ''}`} onClick={() => setMealType(mt)}>
                      {mt}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mp-sheet-section">
                <h3 className="mp-aisle-label">Time limit</h3>
                <div className="mp-tag-row">
                  {[['any', 'any'], ['15', 'under 15 min'], ['30', 'under 30 min'], ['60', 'under 1 hr']].map(([val, label]) => (
                    <button key={val} className={`mp-tag mp-tag-btn ${timeLimit === val ? 'mp-tag-on' : ''}`} onClick={() => setTimeLimit(val)}>
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="mp-sheet-section">
                <h3 className="mp-aisle-label">How many ideas?</h3>
                <div className="mp-tag-row">
                  {[2, 3, 4, 5].map(n => (
                    <button key={n} className={`mp-tag mp-tag-btn ${count === n ? 'mp-tag-on' : ''}`} onClick={() => setCount(n)}>
                      {n}
                    </button>
                  ))}
                </div>
              </section>

              {error && <div className="mp-diag-error" style={{marginTop:14}}>{error}</div>}

              <div style={{display:'flex', gap:8, marginTop:14}}>
                <button className="mp-btn mp-btn-ghost" onClick={onClose}>Cancel</button>
                <button className={`mp-btn mp-btn-primary ${selectedItems.size === 0 ? 'mp-btn-disabled' : ''}`}
                        disabled={selectedItems.size === 0}
                        onClick={generate}>
                  <Sparkles size={14} /> Generate
                </button>
              </div>
            </>
          )}

          {loading && (
            <div style={{padding:'3rem 1rem', textAlign:'center'}}>
              <RefreshCw size={28} className="mp-sync-spin" style={{color: 'var(--accent)', marginBottom: 12}} />
              <div style={{fontSize:14, color:'var(--ink-2)'}}>Claude is cooking…</div>
              <div style={{fontSize:11, color:'var(--ink-3)', marginTop:6}}>This takes ~15-30 seconds</div>
            </div>
          )}

          {results.length > 0 && (
            <>
              <p style={{fontSize:13, color:'var(--ink-2)', marginBottom:14}}>
                {results.length} ideas — tap "Save" on any you like to add to your recipes.
              </p>
              {results.map((r, idx) => (
                <div key={idx} className="mp-invent-result">
                  <div className="mp-invent-result-head">
                    <div>
                      <div className="mp-invent-result-name">{r.name}</div>
                      <div className="mp-invent-result-meta">{r.cuisine || 'Recipe'} · {r.time || ''} · serves {r.servings || defaultServings}</div>
                    </div>
                    <button
                      className={`mp-btn ${savedIds.has(idx) ? 'mp-btn-ghost' : 'mp-btn-primary'}`}
                      style={{flex:0, padding:'8px 14px', fontSize:13}}
                      disabled={savedIds.has(idx)}
                      onClick={() => handleSave(r, idx)}
                    >
                      {savedIds.has(idx) ? <><Check size={14} /> Saved</> : 'Save'}
                    </button>
                  </div>
                  {r.tags?.length > 0 && (
                    <div className="mp-tag-row" style={{margin:'8px 0'}}>
                      {r.tags.map(t => <span key={t} className="mp-tag">{t}</span>)}
                    </div>
                  )}
                  {r.notes && <p style={{fontSize:12, color:'var(--ink-2)', fontStyle:'italic', margin:'4px 0 8px'}}>{r.notes}</p>}
                  <details>
                    <summary style={{fontSize:12, color:'var(--ink-3)', cursor:'pointer', padding:'4px 0'}}>
                      {r.ingredients?.length || 0} ingredients · {r.steps?.length || 0} steps
                    </summary>
                    <div style={{padding:'8px 0', fontSize:13}}>
                      <strong style={{fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-3)'}}>Ingredients</strong>
                      <ul style={{margin:'4px 0 10px', paddingLeft:18, color:'var(--ink-2)'}}>
                        {r.ingredients?.map((ing, i) => (
                          <li key={i}>{ing.amount}{ing.unit ? ' ' + ing.unit : ''} {ing.name}</li>
                        ))}
                      </ul>
                      <strong style={{fontSize:11, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ink-3)'}}>Steps</strong>
                      <ol style={{margin:'4px 0 0', paddingLeft:18, color:'var(--ink-2)', lineHeight:1.5}}>
                        {r.steps?.map((step, i) => <li key={i} style={{marginBottom:4}}>{step}</li>)}
                      </ol>
                    </div>
                  </details>
                </div>
              ))}
              <div style={{display:'flex', gap:8, marginTop:14}}>
                <button className="mp-btn mp-btn-ghost" onClick={() => { setResults([]); setSavedIds(new Set()); }}>← Try again</button>
                <button className="mp-btn mp-btn-primary" onClick={onClose}>Done</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ImportSheet({ onClose, onSave }) {
  const [mode, setMode] = useState('url');
  const [url, setUrl] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState('');
  const photoInputRef = useRef(null);

  const EXTRACTION_PROMPT = `Return ONLY this JSON — no markdown, no explanation:
{"name":"","cuisine":"","time":"","servings":2,"mealType":"dinner","makesLeftovers":false,"photo":null,"tags":[],"notes":"","steps":[],"ingredients":[{"name":"","amount":1,"unit":"","aisle":"pantry"}]}
For aisle: produce|meat|fish|dairy|pantry|spices|bakery|frozen|other
For tags: quick|veggie|high-iron|high-protein|comfort|freezer-friendly|one-tray|weeknight|weekend|meal-prep`;

  const extract = async (content, isImage = false) => {
    setLoading(true);
    setError('');
    try {
      const userContent = isImage
        ? [content, { type: 'text', text: `Extract the recipe from this image.\n\n${EXTRACTION_PROMPT}` }]
        : (mode === 'url'
            ? `Fetch and extract the recipe from this URL: ${url}\n\n${EXTRACTION_PROMPT}`
            : `Extract and structure this recipe:\n\n${pasteText}\n\n${EXTRACTION_PROMPT}`);

      // Call our Vercel serverless function (which proxies to Anthropic with the API key)
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2000,
          ...(!isImage && mode === 'url' ? { tools: [{ type: 'web_search_20260209', name: 'web_search' }] } : {}),
          system: 'You extract recipes and return ONLY a valid JSON object — no markdown, no backticks.',
          messages: [{ role: 'user', content: userContent }],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error.message || 'API error');
      const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No recipe data found in response');
      setExtracted(JSON.parse(match[0]));
    } catch (e) {
      setError(`Could not extract: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Resize + re-encode any image as JPEG (handles HEIC where browser supports it, drops large file sizes)
  const processImageFile = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1568;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const r = Math.min(maxDim / width, maxDim / height);
            width = Math.round(width * r);
            height = Math.round(height * r);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85).split(',')[1]);
        } catch (err) { reject(err); }
      };
      img.onerror = () => reject(new Error('Could not read image (HEIC files from iPhone may need converting to JPG first — set Camera Format to "Most Compatible" in iPhone Settings, or take the photo from the in-app camera)'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const base64 = await processImageFile(file);
      await extract({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } }, true);
    } catch (err) {
      setError(err.message);
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
                  <li className="mp-ing-row" style={{color:'var(--ink-3)',fontSize:13}}>+{extracted.ingredients.length - 6} more…</li>
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
            <button className={`mp-tag mp-tag-btn ${mode==='url'?'mp-tag-on':''}`} onClick={() => setMode('url')}><Link size={12} style={{marginRight:4,verticalAlign:'-2px'}} />URL</button>
            <button className={`mp-tag mp-tag-btn ${mode==='paste'?'mp-tag-on':''}`} onClick={() => setMode('paste')}><ClipboardList size={12} style={{marginRight:4,verticalAlign:'-2px'}} />Paste</button>
            <button className={`mp-tag mp-tag-btn ${mode==='photo'?'mp-tag-on':''}`} onClick={() => setMode('photo')}><Camera size={12} style={{marginRight:4,verticalAlign:'-2px'}} />Photo</button>
          </div>

          {mode === 'url' && (
            <>
              <label className="mp-label">Recipe URL</label>
              <input className="mp-input" type="url" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} autoFocus />
              <p style={{fontSize:13,color:'var(--ink-2)',margin:'8px 0 0',lineHeight:1.6}}>Paste any recipe URL. Claude fetches and extracts everything automatically.</p>
            </>
          )}
          {mode === 'paste' && (
            <>
              <label className="mp-label">Recipe text</label>
              <textarea className="mp-input mp-textarea" rows={7} placeholder="Paste the full recipe here — title, ingredients, steps, everything…" value={pasteText} onChange={e => setPasteText(e.target.value)} autoFocus />
            </>
          )}
          {mode === 'photo' && (
            <div className="mp-photo-import">
              <div className="mp-photo-import-area" onClick={() => photoInputRef.current?.click()}>
                <Camera size={36} style={{opacity:0.35,marginBottom:12}} />
                <div style={{fontSize:15,fontWeight:500,marginBottom:6}}>Take a photo or choose from library</div>
                <div style={{fontSize:13,color:'var(--ink-3)'}}>Aim at a cookbook page, recipe card, or printed recipe</div>
              </div>
              <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handlePhoto} />
            </div>
          )}

          {error && (
            <div style={{background:'#FEE2E2',borderRadius:8,padding:'10px 12px',fontSize:13,color:'#B91C1C',marginTop:10,lineHeight:1.5}}>{error}</div>
          )}

          {mode !== 'photo' && (
            <button
              className={`mp-btn mp-btn-primary ${(!loading && (mode==='url' ? url : pasteText)) ? '' : 'mp-btn-disabled'}`}
              style={{width:'100%',marginTop:'1rem'}}
              disabled={loading || !(mode === 'url' ? url : pasteText)}
              onClick={() => extract(null, false)}
            >
              {loading ? <><RefreshCw size={16} style={{animation:'mp-spin 1s linear infinite'}} /> Extracting…</> : 'Extract Recipe'}
            </button>
          )}
          {mode === 'photo' && loading && (
            <div style={{textAlign:'center',padding:'1rem',color:'var(--ink-2)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
              <RefreshCw size={16} style={{animation:'mp-spin 1s linear infinite'}} /> Reading photo…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
