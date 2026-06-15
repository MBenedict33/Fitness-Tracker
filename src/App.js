import { useState, useEffect, useRef } from "react";

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.REACT_APP_SUPA_URL;
const SUPA_KEY = process.env.REACT_APP_SUPA_KEY;
const SB_HEADERS = {
  "Content-Type": "application/json",
  "apikey": SUPA_KEY,
  "Authorization": `Bearer ${SUPA_KEY}`,
  "Prefer": "resolution=merge-duplicates",
};

const sb = {
  async upsert(table, body) {
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: "POST", headers: SB_HEADERS, body: JSON.stringify(body),
      });
      return res.ok;
    } catch { return false; }
  },
  async getAll(table) {
    try {
      const res = await fetch(`${SUPA_URL}/rest/v1/${table}?select=*`, {
        headers: { ...SB_HEADERS, "Prefer": "" },
      });
      return res.ok ? await res.json() : [];
    } catch { return []; }
  },
};

const DB = {
  async loadCheckins() {
    const rows = await sb.getAll("ft_checkins");
    return rows.map(r => ({ date: r.date, ...r.data })).sort((a, b) => b.date.localeCompare(a.date));
  },
  async saveCheckin(entry) {
    const { date, ...rest } = entry;
    return sb.upsert("ft_checkins", { date, data: rest, updated_at: new Date().toISOString() });
  },
  async loadWorkouts() {
    const rows = await sb.getAll("ft_workouts");
    return Object.fromEntries(rows.map(r => [r.session_key, r.data]));
  },
  async saveWorkout(sessionKey, session) {
    return sb.upsert("ft_workouts", { session_key: sessionKey, data: session, updated_at: new Date().toISOString() });
  },
  async loadMeals() {
    const rows = await sb.getAll("ft_meals");
    return Object.fromEntries(rows.map(r => [r.day, r.data]));
  },
  async saveMeals(day, dayData) {
    return sb.upsert("ft_meals", { day, data: dayData, updated_at: new Date().toISOString() });
  },
  async loadHydration() {
    const rows = await sb.getAll("ft_hydration");
    return Object.fromEntries(rows.map(r => [r.date_key, r.oz]));
  },
  async saveHydration(dateKey, oz) {
    return sb.upsert("ft_hydration", { date_key: dateKey, oz, updated_at: new Date().toISOString() });
  },
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg: "#060910", card: "#0d1520", card2: "#111d2e",
  blue: "#0ea5e9", blueDim: "#0369a1",
  green: "#22c55e", amber: "#f59e0b", red: "#ef4444",
  purple: "#818cf8", pink: "#f472b6", teal: "#34d399",
  text: "#f1f5f9", muted: "#64748b", dim: "#1e293b", border: "#1e3a5f",
};
const F = { display: "'Barlow Condensed', sans-serif", body: "'Barlow', sans-serif" };

// ── Constants ─────────────────────────────────────────────────────────────────
const NUTRITION_TARGETS = { calories: 2400, protein: 230, carbs: 200, fat: 80 };
const START_WEIGHT = 267;
const GOAL_WEIGHT = 230;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MEAL_TYPES = ["breakfast", "snack", "lunch", "dinner"];
const MEAL_LABELS = { breakfast: "Breakfast", snack: "Snack", lunch: "Lunch", dinner: "Dinner" };
const HYDRATION_TARGET = 100;
const HYDRATION_INCREMENTS = [8, 12, 16, 20, 24, 32];

// ── Meal Plan ─────────────────────────────────────────────────────────────────
const MEAL_PLAN = {
  Mon: {
    breakfast: { name: "3 Scrambled Eggs + Turkey Sausage + Black Coffee", cal: 420, protein: 38, carbs: 4, fat: 22 },
    snack:     { name: "Greek Yogurt (plain, 2%) + Handful Almonds", cal: 250, protein: 20, carbs: 14, fat: 12 },
    lunch:     { name: "Ground Turkey Rice Bowl (6oz turkey, 3/4c rice, salsa)", cal: 520, protein: 52, carbs: 48, fat: 10 },
    dinner:    { name: "Grilled Salmon + Roasted Broccoli + Sweet Potato", cal: 620, protein: 52, carbs: 42, fat: 18 },
  },
  Tue: {
    breakfast: { name: "Protein Shake (2 scoops) + Banana + PB (1 tbsp)", cal: 440, protein: 50, carbs: 38, fat: 10 },
    snack:     { name: "Cottage Cheese (1c) + Apple", cal: 230, protein: 25, carbs: 22, fat: 5 },
    lunch:     { name: "Tuna Wrap (2 cans tuna, whole wheat tortilla, avocado)", cal: 510, protein: 55, carbs: 32, fat: 14 },
    dinner:    { name: "Chicken Thighs (8oz) + Quinoa + Sautéed Spinach", cal: 600, protein: 55, carbs: 40, fat: 16 },
  },
  Wed: {
    breakfast: { name: "4-Egg Omelette + Diced Peppers + Feta + Coffee", cal: 430, protein: 36, carbs: 8, fat: 24 },
    snack:     { name: "String Cheese x2 + Beef Jerky (1oz)", cal: 240, protein: 26, carbs: 4, fat: 12 },
    lunch:     { name: "Turkey + Avocado Sandwich (whole wheat, mustard)", cal: 490, protein: 42, carbs: 36, fat: 14 },
    dinner:    { name: "Lean Ground Beef Stir-Fry + Brown Rice + Broccoli", cal: 610, protein: 54, carbs: 46, fat: 14 },
  },
  Thu: {
    breakfast: { name: "Greek Yogurt Parfait (plain, granola 1/4c, blueberries)", cal: 380, protein: 28, carbs: 42, fat: 8 },
    snack:     { name: "Protein Bar (Quest or RX Bar)", cal: 210, protein: 20, carbs: 24, fat: 8 },
    lunch:     { name: "Shrimp + Veggie Bowl (8oz shrimp, rice, peppers, olive oil)", cal: 520, protein: 48, carbs: 44, fat: 10 },
    dinner:    { name: "NY Strip Steak (6oz) + Baked Potato + Asparagus", cal: 650, protein: 56, carbs: 44, fat: 18 },
  },
  Fri: {
    breakfast: { name: "Protein Shake + Oatmeal (1/2c) + Berries", cal: 450, protein: 46, carbs: 48, fat: 8 },
    snack:     { name: "Hard Boiled Eggs x2 + Celery + Peanut Butter (1 tbsp)", cal: 240, protein: 18, carbs: 8, fat: 14 },
    lunch:     { name: "Grilled Chicken Salad (6oz chicken, mixed greens, olive oil)", cal: 480, protein: 50, carbs: 12, fat: 18 },
    dinner:    { name: "Pork Tenderloin (8oz) + Roasted Veggies + Wild Rice", cal: 590, protein: 54, carbs: 42, fat: 12 },
  },
  Sat: {
    breakfast: { name: "Breakfast Burrito (3 eggs, black beans, salsa, tortilla)", cal: 500, protein: 32, carbs: 52, fat: 16 },
    snack:     { name: "Cottage Cheese (1c) + Pineapple (1/2c)", cal: 220, protein: 24, carbs: 18, fat: 4 },
    lunch:     { name: "Rotisserie Chicken (8oz) + Side Salad + Whole Grain Roll", cal: 520, protein: 52, carbs: 30, fat: 14 },
    dinner:    { name: "Salmon Tacos x3 (corn tortillas, slaw, avocado, lime)", cal: 610, protein: 46, carbs: 48, fat: 18 },
  },
  Sun: {
    breakfast: { name: "French Toast x2 (whole wheat) + Turkey Bacon x3 + Eggs x2", cal: 520, protein: 40, carbs: 44, fat: 16 },
    snack:     { name: "Apple + Almond Butter (2 tbsp) + Protein Shake (1 scoop)", cal: 320, protein: 26, carbs: 32, fat: 10 },
    lunch:     { name: "Turkey Meatballs + Zucchini Noodles + Marinara", cal: 480, protein: 48, carbs: 22, fat: 14 },
    dinner:    { name: "Grilled Chicken Breast (8oz) + Brown Rice + Green Beans", cal: 560, protein: 60, carbs: 42, fat: 8 },
  },
};

// ── Workout Plans ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: "upper-a", label: "Upper — Strength A", tag: "UPPER", day: "Day 1",
    warmup: ["5 min Peloton Zone 2", "Arm circles x20", "Band pull-aparts x15", "Shoulder rolls x10"],
    cooldown: ["Doorway chest stretch 30s each", "Child's pose 45s", "Lat hang 30s", "Triceps overhead stretch 30s each"],
    exercises: [
      { id: "bench",    name: "Bench Press",              muscle: "Chest",     sets: 5, reps: 5,  targetWeight: 155, note: "Build to working weight. Leave 1–2 reps in tank." },
      { id: "pullup",   name: "Pull-Up (Band Assisted)",  muscle: "Back",      sets: 5, reps: 4,  targetWeight: 0,   note: "Full hang → chest to bar intent. #1 priority." },
      { id: "lm-press", name: "Landmine Press",           muscle: "Shoulders", sets: 4, reps: 8,  targetWeight: 135, note: "Per arm. Explosive but controlled." },
      { id: "lm-row",   name: "Landmine Row",             muscle: "Back",      sets: 4, reps: 8,  targetWeight: 115, note: "Slight torso angle, no jerking." },
      { id: "inc-push", name: "Floor Press",              muscle: "Chest",     sets: 3, reps: 12, targetWeight: 45,  note: "Controlled. No failure." },
      { id: "farmer",   name: "Farmer Carry",             muscle: "Core",      sets: 4, reps: 1,  targetWeight: 45,  note: "45–60 sec per round. Breathe through nose." },
    ],
  },
  {
    id: "lower-a", label: "Lower — Strength A", tag: "LOWER", day: "Day 2",
    warmup: ["5 min Peloton Zone 2", "Leg swings x15 each", "Hip circles x10 each", "Bodyweight squat x10", "Glute bridges x15"],
    cooldown: ["Pigeon pose 45s each", "Hamstring stretch 45s each", "Hip flexor stretch 45s each", "Calf stretch 30s each"],
    exercises: [
      { id: "rdl",        name: "Barbell RDL",              muscle: "Hamstrings", sets: 4, reps: 6,  targetWeight: 205, note: "Smooth eccentric. Straps OK. No hitching." },
      { id: "lm-squat",   name: "Landmine Goblet Squat",    muscle: "Quads",      sets: 4, reps: 8,  targetWeight: 115, note: "Upright torso. Controlled depth." },
      { id: "lm-lunge",   name: "Landmine Reverse Lunge",   muscle: "Glutes",     sets: 3, reps: 8,  targetWeight: 90,  note: "Per leg. Slow lowering." },
      { id: "hip-thrust", name: "Hip Thrust",               muscle: "Glutes",     sets: 4, reps: 10, targetWeight: 135, note: "Pause at top. Challenge glutes." },
      { id: "kb-swing",   name: "KB Swing Finisher",        muscle: "Posterior",  sets: 3, reps: 15, targetWeight: 35,  note: "Athletic, not cardio. 10–12 min max." },
    ],
  },
  {
    id: "upper-b", label: "Upper — Hypertrophy B", tag: "UPPER", day: "Day 3",
    warmup: ["5 min Peloton Zone 2", "Arm circles x20", "Band pull-aparts x15", "Push-up x10 light"],
    cooldown: ["Doorway chest stretch 30s each", "Lat stretch 30s each", "Biceps wall stretch 30s each"],
    exercises: [
      { id: "db-bench",    name: "DB Bench Press",           muscle: "Chest",     sets: 4, reps: 8,  targetWeight: 70,  note: "Controlled lowering. Per DB." },
      { id: "lat-pd",      name: "Lat Pulldown",             muscle: "Back",      sets: 4, reps: 12, targetWeight: 115, note: "Full stretch. Clean reps." },
      { id: "cable-row",   name: "Cable Row",                muscle: "Back",      sets: 4, reps: 10, targetWeight: 70,  note: "Heavy enough to challenge upper back." },
      { id: "db-shoulder", name: "DB Shoulder Press",        muscle: "Shoulders", sets: 3, reps: 8,  targetWeight: 40,  note: "Controlled. No arch." },
      { id: "pullup-b",    name: "Pull-Up (Band Assisted)",  muscle: "Back",      sets: 4, reps: 4,  targetWeight: 0,   note: "Full range every rep." },
      { id: "arms",        name: "Curls + Triceps Superset", muscle: "Arms",      sets: 3, reps: 12, targetWeight: 25,  note: "Quick finisher. No rest between." },
    ],
  },
  {
    id: "lower-b", label: "Lower — Hypertrophy B", tag: "LOWER", day: "Day 4",
    warmup: ["5 min Peloton Zone 2", "Leg swings x15 each", "Bodyweight squat x10", "Glute bridges x15"],
    cooldown: ["Pigeon pose 45s each", "Hamstring stretch 45s each", "Hip flexor lunge 45s each"],
    exercises: [
      { id: "trap-dl",   name: "Trap Bar Deadlift",       muscle: "Full Body", sets: 4, reps: 5,  targetWeight: 275, note: "Build to moderate-heavy top set. RPE 7–8." },
      { id: "front-sq",  name: "Landmine Goblet Squat",   muscle: "Quads",     sets: 4, reps: 8,  targetWeight: 115, note: "Stay controlled. No grind reps." },
      { id: "rev-lunge", name: "Landmine Reverse Lunge",  muscle: "Glutes",    sets: 3, reps: 10, targetWeight: 90,  note: "Per leg." },
      { id: "hip-b",     name: "Hip Thrust",              muscle: "Glutes",    sets: 3, reps: 10, targetWeight: 135, note: "Pause at top." },
      { id: "calves",    name: "Calf Raises",             muscle: "Calves",    sets: 4, reps: 15, targetWeight: 45,  note: "Full stretch + pause at top." },
    ],
  },
  {
    id: "full-body", label: "Full Body — Travel", tag: "FULL", day: "Travel",
    warmup: ["5 min treadmill walk", "Arm circles x20", "Bodyweight squat x10", "Hip circles x10"],
    cooldown: ["Full body stretch 10 min", "Focus: hips, hamstrings, chest"],
    exercises: [
      { id: "dl-travel",  name: "Deadlift / Trap Bar DL", muscle: "Full Body", sets: 4, reps: 5,  targetWeight: 225, note: "Build to moderate-heavy. RPE 7–8." },
      { id: "db-bench-t", name: "DB Bench Press",         muscle: "Chest",     sets: 4, reps: 8,  targetWeight: 70,  note: "Best DBs available." },
      { id: "cable-row-t",name: "Cable Row",              muscle: "Back",      sets: 4, reps: 10, targetWeight: 70,  note: "Heavy enough to challenge upper back." },
      { id: "lm-lunge-t", name: "DB Reverse Lunge",       muscle: "Glutes",    sets: 3, reps: 10, targetWeight: 90,  note: "Moderate load." },
      { id: "lat-pd-t",   name: "Lat Pulldown",           muscle: "Back",      sets: 3, reps: 12, targetWeight: 115, note: "Full stretch." },
      { id: "cond",       name: "Conditioning Finisher",  muscle: "Cardio",    sets: 1, reps: 1,  targetWeight: 0,   note: "10–15 min. Assault bike, incline walk, or row." },
    ],
  },
];

const TAG_COLOR = { UPPER: C.blue, LOWER: C.amber, FULL: C.green, COND: C.red };
const MUSCLE_GROUPS = ["Chest","Back","Shoulders","Arms","Quads","Hamstrings","Glutes","Calves","Core","Full Body","Posterior","Cardio"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const fmtDate  = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtTime  = (s) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
const getCurrentDay = () => DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

function recoveryColor(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return { bg: C.dim, text: C.muted, label: "—" };
  if (n >= 67)  return { bg: "#052e16", text: C.green,  label: "Green"  };
  if (n >= 34)  return { bg: "#422006", text: C.amber,  label: "Yellow" };
  return              { bg: "#450a0a", text: C.red,    label: "Red"    };
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function Tag({ label, color }) {
  return (
    <span style={{ background:color+"22", color, border:`1px solid ${color}44`, borderRadius:4, padding:"2px 8px", fontSize:10, fontWeight:700, letterSpacing:"0.12em", fontFamily:F.display }}>
      {label}
    </span>
  );
}

function StatBox({ label, value, sub, accent }) {
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", flex:1, minWidth:0 }}>
      <div style={{ fontSize:11, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:36, fontWeight:900, color:accent||C.blue, fontFamily:F.display, lineHeight:1, letterSpacing:"-0.02em" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:C.muted, fontFamily:F.body, marginTop:4 }}>{sub}</div>}
    </div>
  );
}

function FormField({ label, hint, value, onChange, type="number", placeholder, min, max, step }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
      <label style={{ fontSize:10, color:C.muted, fontFamily:F.display, letterSpacing:"0.08em", textTransform:"uppercase" }}>
        {label}{hint && <span style={{ color:C.muted, marginLeft:5, fontStyle:"italic", textTransform:"none", fontFamily:F.body, fontSize:10 }}>{hint}</span>}
      </label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder||""} min={min} max={max} step={step}
        style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"9px 12px", fontSize:14, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:F.body }} />
    </div>
  );
}

function CoachInsight({ entry }) {
  const rec  = parseFloat(entry.recovery);
  const hrv  = parseFloat(entry.hrv);
  const debt = parseFloat(entry.sleepDebt);
  const wt   = parseFloat(entry.weight);
  const bp   = parseFloat(entry.bpSys);
  const insights = [];
  if (!isNaN(rec)) {
    if (rec >= 67) insights.push({ icon:"💚", text:"Recovery is green — good day to push intensity or hit a priority lift." });
    else if (rec >= 34) insights.push({ icon:"🟡", text:"Yellow recovery. Aim for moderate effort. Skip max intensity work today." });
    else insights.push({ icon:"🔴", text:"Red recovery. Prioritize movement over performance — walk, stretch, or light Peloton only." });
  }
  if (!isNaN(hrv) && hrv < 40) insights.push({ icon:"📉", text:`HRV at ${hrv}ms is low. System under stress — watch for fatigue accumulating.` });
  if (!isNaN(hrv) && hrv >= 70) insights.push({ icon:"📈", text:`HRV at ${hrv}ms is strong. Good window for high-effort training.` });
  if (!isNaN(debt) && debt > 60) insights.push({ icon:"😴", text:`Sleep debt is ${debt} min. Prioritize 7–8 hours tonight.` });
  if (!isNaN(wt)) {
    if (wt > 257) insights.push({ icon:"⚖️", text:`Weight at ${wt} lbs — above target zone. Tighten nutrition today.` });
    else if (wt < 248) insights.push({ icon:"⚖️", text:`Weight at ${wt} lbs — good downward progress. Keep protein intake high.` });
    else insights.push({ icon:"⚖️", text:`Weight at ${wt} lbs. Steady in working zone — keep the process consistent.` });
  }
  if (!isNaN(bp) && bp > 135) insights.push({ icon:"❤️", text:`BP is elevated. Reduce sodium today and monitor across the week.` });
  if (insights.length === 0) return null;
  return (
    <div style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
      <div style={{ fontSize:10, color:C.muted, fontFamily:F.display, letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Coach Insight</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {insights.map((ins,i) => (
          <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
            <span style={{ fontSize:15, lineHeight:1.4 }}>{ins.icon}</span>
            <span style={{ color:C.text, fontSize:13, fontFamily:F.body, lineHeight:1.5 }}>{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendSparkline({ label, unit, color, data, target, targetLabel }) {
  if (!data || data.length < 2) return null;
  const vals = data.map(d => d.val);
  const minV = Math.min(...vals), maxV = Math.max(...vals), range = maxV - minV || 1;
  const w = 320, h = 56, pad = 8;
  const pts = data.map((d,i) => [
    pad + (i / Math.max(data.length-1,1)) * (w-pad*2),
    h - pad - ((d.val-minV)/range) * (h-pad*2)
  ]);
  const path = pts.map((p,i) => `${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ");
  const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
  const trend = vals[vals.length-1] - vals[0];
  const trendColor = trend > 0 ? (label==="Weight" ? C.red : C.green) : (label==="Weight" ? C.green : C.red);
  return (
    <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
        <div>
          <div style={{ fontSize:11, color:C.muted, fontFamily:F.display, letterSpacing:"0.08em", textTransform:"uppercase" }}>{label}</div>
          <div style={{ fontSize:26, fontWeight:900, color, fontFamily:F.display, lineHeight:1, marginTop:2 }}>
            {avg.toFixed(1)}<span style={{ fontSize:12, color:C.muted, marginLeft:3 }}>{unit} avg</span>
          </div>
        </div>
        <div style={{ fontSize:12, fontWeight:700, color:trendColor, background:C.bg, borderRadius:6, padding:"4px 10px", fontFamily:F.display }}>
          {trend > 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}{unit}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width:"100%", height:44 }}>
        {target !== undefined && (() => { const ty=h-pad-((target-minV)/range)*(h-pad*2); return <line x1={pad} y1={ty} x2={w-pad} y2={ty} stroke={color} strokeWidth={1} strokeDasharray="4,4" opacity={0.3} />; })()}
        <path d={path} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r={3} fill={color} />)}
      </svg>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:4 }}>
        {data.map(d => <span key={d.date} style={{ fontSize:9, color:C.muted, fontFamily:F.body }}>{new Date(d.date+"T12:00:00").toLocaleDateString("en-US",{month:"numeric",day:"numeric"})}</span>)}
      </div>
      {targetLabel && <div style={{ fontSize:10, color:C.muted, fontFamily:F.body, marginTop:5 }}>– – {targetLabel}</div>}
    </div>
  );
}

// ── SCREEN: DASHBOARD ─────────────────────────────────────────────────────────
function Dashboard({ workouts, checkins, onStartWorkout }) {
  const today = checkins.find(c => c.date === todayStr());
  const rc = recoveryColor(today?.recovery);
  const currentWeight = today?.weight ? parseFloat(today.weight) : (checkins.length > 0 ? parseFloat(checkins[0].weight) : START_WEIGHT);
  const progress = Math.min(100, Math.max(0, ((START_WEIGHT-currentWeight)/(START_WEIGHT-GOAL_WEIGHT))*100));
  const currentDay = getCurrentDay();
  const sessions = Object.values(workouts).sort((a,b) => b.date?.localeCompare(a.date));
  let streak = 0;
  const dateSet = new Set(sessions.map(s=>s.date));
  let d = new Date();
  while (true) { const ds=d.toISOString().split("T")[0]; if(dateSet.has(ds)){streak++;d.setDate(d.getDate()-1);}else break; }
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate()-weekStart.getDay());
  const thisWeek = sessions.filter(s => new Date(s.date+"T12:00:00")>=weekStart).length;
  const prs = {};
  sessions.forEach(s => { Object.entries(s.sets||{}).forEach(([exId,sets])=>{ const done=Object.values(sets).filter(x=>x.done&&parseFloat(x.weight)>0); const maxW=Math.max(...done.map(x=>parseFloat(x.weight)||0)); const maxR=Math.max(...done.map(x=>parseInt(x.reps)||0)); if(maxW>0&&(!prs[exId]||maxW>prs[exId].weight)){const ex=PLANS.flatMap(p=>p.exercises).find(e=>e.id===exId);prs[exId]={name:ex?.name||exId,weight:maxW,reps:maxR,date:s.date};} }); });
  const topPRs = Object.values(prs).sort((a,b)=>b.weight-a.weight).slice(0,3);

  return (
    <div style={{ padding:"16px", paddingBottom:80 }}>
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:32, fontWeight:900, color:C.text, fontFamily:F.display, letterSpacing:"-0.02em", lineHeight:1.1 }}>{new Date().toLocaleDateString("en-US",{weekday:"long"}).toUpperCase()}</div>
        <div style={{ fontSize:13, color:C.muted, fontFamily:F.body }}>{new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}</div>
      </div>

      {today ? (
        <div style={{ background:rc.bg, border:`1px solid ${rc.text}33`, borderRadius:14, padding:"14px 16px", marginBottom:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
            <div style={{ fontSize:44, fontWeight:900, color:rc.text, fontFamily:F.display, lineHeight:1 }}>{today.recovery}%</div>
            <div>
              <div style={{ fontSize:11, color:rc.text, fontFamily:F.display, letterSpacing:"0.12em", textTransform:"uppercase" }}>Recovery · {rc.label}</div>
              <div style={{ fontSize:12, color:C.muted, fontFamily:F.body }}>Logged today</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            {[{label:"HRV",value:today.hrv,unit:"ms",color:C.purple},{label:"RHR",value:today.rhr,unit:"bpm",color:C.pink},{label:"Sleep",value:today.sleepPerf,unit:"%",color:C.teal},{label:"BP",value:today.bpSys&&today.bpDia?`${today.bpSys}/${today.bpDia}`:"",unit:"",color:C.amber}].map(p=>p.value?(
              <div key={p.label} style={{ background:C.card, borderRadius:10, padding:"8px 12px", border:`1px solid ${C.border}`, textAlign:"center", minWidth:60 }}>
                <div style={{ fontSize:10, color:C.muted, fontFamily:F.display, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:2 }}>{p.label}</div>
                <div style={{ fontSize:18, fontWeight:800, color:p.color, fontFamily:F.display, lineHeight:1 }}>{p.value}<span style={{ fontSize:10, color:C.muted, marginLeft:1 }}>{p.unit}</span></div>
              </div>
            ):null)}
          </div>
          <CoachInsight entry={today} />
        </div>
      ) : (
        <div style={{ background:C.card, border:`2px dashed ${C.border}`, borderRadius:14, padding:"16px", marginBottom:16, textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, color:C.blue, fontFamily:F.display, letterSpacing:"0.08em" }}>+ LOG MORNING CHECK-IN</div>
          <div style={{ fontSize:11, color:C.muted, fontFamily:F.body, marginTop:4 }}>Recovery · Sleep · Weight · BP</div>
        </div>
      )}

      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
          <div><div style={{ fontSize:10, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase" }}>Current Weight</div><div style={{ fontSize:40, fontWeight:900, color:C.text, fontFamily:F.display, lineHeight:1 }}>{currentWeight} <span style={{ fontSize:14, color:C.muted }}>lbs</span></div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:10, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase" }}>Goal · 3 mo</div><div style={{ fontSize:28, fontWeight:900, color:C.green, fontFamily:F.display, lineHeight:1 }}>{GOAL_WEIGHT} lbs</div></div>
        </div>
        <div style={{ background:C.dim, borderRadius:4, height:6, overflow:"hidden" }}>
          <div style={{ background:`linear-gradient(90deg,${C.blue},${C.green})`, width:`${progress}%`, height:"100%", borderRadius:4, transition:"width 0.6s" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6 }}>
          <span style={{ fontSize:10, color:C.muted, fontFamily:F.body }}>{START_WEIGHT} lbs start</span>
          <span style={{ fontSize:10, color:C.green, fontFamily:F.body }}>{Math.max(0,START_WEIGHT-currentWeight).toFixed(1)} lbs lost</span>
          <span style={{ fontSize:10, color:C.muted, fontFamily:F.body }}>{GOAL_WEIGHT} lbs goal</span>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:16 }}>
        <StatBox label="Streak" value={streak} sub="days" accent={C.amber} />
        <StatBox label="This Week" value={thisWeek} sub="sessions" accent={C.blue} />
        <StatBox label="Total" value={sessions.length} sub="workouts" accent={C.green} />
      </div>

      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>Quick Launch</div>
        {PLANS.map(p => { const color=TAG_COLOR[p.tag]||C.blue; const isToday=p.day===currentDay; return (
          <button key={p.id} onClick={()=>onStartWorkout(p.id)} style={{ width:"100%", background:isToday?color+"18":C.card, border:`1px solid ${isToday?color:C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:8, cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:10, color, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:2 }}>{p.day}</div>
              <div style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:F.display }}>{p.label}</div>
              <div style={{ fontSize:12, color:C.muted, fontFamily:F.body, marginTop:2 }}>{p.exercises.length} exercises</div>
            </div>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
              <Tag label={p.tag} color={color} />
              {isToday && <span style={{ fontSize:10, color, fontFamily:F.display, letterSpacing:"0.08em" }}>TODAY</span>}
            </div>
          </button>
        );})}
      </div>

      {topPRs.length > 0 && (
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px" }}>
          <div style={{ fontSize:12, fontWeight:700, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>🏆 Top Personal Records</div>
          {topPRs.map((pr,i) => (
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:i<topPRs.length-1?`1px solid ${C.dim}`:"none" }}>
              <div><div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:F.display }}>{pr.name}</div><div style={{ fontSize:11, color:C.muted, fontFamily:F.body }}>{fmtDate(pr.date)}</div></div>
              <div style={{ textAlign:"right" }}><div style={{ fontSize:24, fontWeight:900, color:C.amber, fontFamily:F.display, lineHeight:1 }}>{pr.weight} <span style={{ fontSize:12 }}>lbs</span></div>{pr.reps>0&&<div style={{ fontSize:11, color:C.muted, fontFamily:F.body }}>{pr.reps} reps</div>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SCREEN: CHECK-IN ──────────────────────────────────────────────────────────
const DEFAULT_CHECKIN = { date:todayStr(), recovery:"", hrv:"", rhr:"", skinTemp:"", sleepPerf:"", timeAsleep:"", sleepDebt:"", remMin:"", deepMin:"", weight:"", bpSys:"", bpDia:"", notes:"" };

function CheckInScreen({ checkins, onSave }) {
  const existing = checkins.find(c=>c.date===todayStr());
  const [form, setForm] = useState(existing || DEFAULT_CHECKIN);
  const [histTab, setHistTab] = useState("log");
  const [saved, setSaved] = useState(false);
  const sf = (k) => (v) => setForm(f=>({...f,[k]:v}));

  const handleSave = async () => {
    await onSave(form);
    setSaved(true);
    setTimeout(()=>setSaved(false), 2200);
  };

  const rc = recoveryColor(form.recovery);
  const last7 = checkins.slice(0,7).reverse();

  const sectionHead = (label, color) => (
    <div style={{ fontSize:10, color, fontFamily:F.display, letterSpacing:"0.14em", textTransform:"uppercase", paddingBottom:8, borderBottom:`1px solid ${C.border}`, marginBottom:12 }}>{label}</div>
  );

  return (
    <div style={{ padding:"16px", paddingBottom:80 }}>
      <div style={{ fontSize:11, color:C.blue, fontFamily:F.display, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:2 }}>Morning</div>
      <div style={{ fontSize:28, fontWeight:900, color:C.text, fontFamily:F.display, marginBottom:4 }}>CHECK-IN</div>
      <div style={{ fontSize:13, color:C.muted, fontFamily:F.body, marginBottom:16 }}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>

      <div style={{ display:"flex", gap:4, marginBottom:20, background:C.card, borderRadius:10, padding:4, width:"fit-content" }}>
        {[["log","Log Today"],["history","History"],["trends","Trends"]].map(([t,l]) => (
          <button key={t} onClick={()=>setHistTab(t)} style={{ padding:"7px 16px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:F.display, letterSpacing:"0.06em", background:histTab===t?C.blue:"transparent", color:histTab===t?"#fff":C.muted, border:"none" }}>{l}</button>
        ))}
      </div>

      {histTab==="log" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <FormField label="Date" value={form.date} onChange={sf("date")} type="date" />
          {form.recovery && (
            <div style={{ background:rc.bg, border:`1px solid ${rc.text}33`, borderRadius:10, padding:"12px 14px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ fontSize:36, fontWeight:900, color:rc.text, fontFamily:F.display, lineHeight:1 }}>{form.recovery}%</div>
              <div style={{ fontSize:13, color:rc.text, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase" }}>Recovery · {rc.label}</div>
            </div>
          )}
          <div>{sectionHead("WHOOP · Recovery", C.blue)}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <FormField label="Recovery Score" hint="%" value={form.recovery} onChange={sf("recovery")} min={0} max={100} />
              <FormField label="HRV" hint="ms" value={form.hrv} onChange={sf("hrv")} min={0} max={200} />
              <FormField label="Resting HR" hint="bpm" value={form.rhr} onChange={sf("rhr")} min={30} max={100} />
              <FormField label="Skin Temp" hint="°F Δ" value={form.skinTemp} onChange={sf("skinTemp")} step={0.1} />
            </div>
          </div>
          <div>{sectionHead("WHOOP · Sleep", C.purple)}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <FormField label="Sleep Performance" hint="%" value={form.sleepPerf} onChange={sf("sleepPerf")} min={0} max={100} />
              <FormField label="Time Asleep" hint="hrs" value={form.timeAsleep} onChange={sf("timeAsleep")} step={0.1} min={0} max={14} />
              <FormField label="Sleep Debt" hint="min" value={form.sleepDebt} onChange={sf("sleepDebt")} min={0} />
              <FormField label="REM" hint="min" value={form.remMin} onChange={sf("remMin")} min={0} />
              <FormField label="Deep Sleep" hint="min" value={form.deepMin} onChange={sf("deepMin")} min={0} />
            </div>
          </div>
          <div>{sectionHead("Body Metrics", C.amber)}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
              <FormField label="Weight" hint="lbs" value={form.weight} onChange={sf("weight")} step={0.1} min={200} max={350} />
              <FormField label="BP Systolic" hint="mmHg" value={form.bpSys} onChange={sf("bpSys")} min={80} max={200} />
              <FormField label="BP Diastolic" hint="mmHg" value={form.bpDia} onChange={sf("bpDia")} min={40} max={130} />
            </div>
          </div>
          <div>
            <div style={{ fontSize:10, color:C.muted, fontFamily:F.display, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Notes</div>
            <textarea value={form.notes} onChange={e=>sf("notes")(e.target.value)} placeholder="Soreness, stress, travel, alcohol, anything notable..." rows={3}
              style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"9px 12px", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box", resize:"none", fontFamily:F.body }} />
          </div>
          {(form.recovery||form.hrv||form.weight) && <CoachInsight entry={form} />}
          <button onClick={handleSave} style={{ background:saved?C.green:C.blue, border:"none", borderRadius:10, color:"#fff", padding:"13px 0", fontSize:14, fontWeight:800, fontFamily:F.display, letterSpacing:"0.08em", cursor:"pointer", transition:"background 0.3s" }}>
            {saved ? "✓ SAVED" : "SAVE CHECK-IN"}
          </button>
        </div>
      )}

      {histTab==="history" && (
        <div>
          {checkins.length===0 ? <div style={{ color:C.muted, textAlign:"center", padding:"40px 0", fontSize:14, fontFamily:F.body }}>No check-ins yet.</div>
          : checkins.map((e,i) => { const r=recoveryColor(e.recovery); return (
            <div key={i} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div><div style={{ fontSize:12, color:C.muted, fontFamily:F.body }}>{fmtDate(e.date)}</div>{e.notes&&<div style={{ fontSize:12, color:C.muted, fontFamily:F.body, fontStyle:"italic", marginTop:4, maxWidth:220 }}>{e.notes}</div>}</div>
                {e.recovery&&<div style={{ fontSize:28, fontWeight:900, color:r.text, fontFamily:F.display, lineHeight:1 }}>{e.recovery}%</div>}
              </div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {[e.hrv&&{l:"HRV",v:`${e.hrv}ms`,c:C.purple},e.rhr&&{l:"RHR",v:`${e.rhr}bpm`,c:C.pink},e.sleepPerf&&{l:"Sleep",v:`${e.sleepPerf}%`,c:C.teal},e.timeAsleep&&{l:"Hrs",v:`${e.timeAsleep}h`,c:C.teal},e.weight&&{l:"Wt",v:`${e.weight}lbs`,c:C.amber},(e.bpSys&&e.bpDia)&&{l:"BP",v:`${e.bpSys}/${e.bpDia}`,c:C.blue}].filter(Boolean).map((p,j)=>(
                  <div key={j} style={{ background:C.card2, borderRadius:6, padding:"4px 8px", border:`1px solid ${C.border}` }}>
                    <span style={{ fontSize:9, color:C.muted, fontFamily:F.display, letterSpacing:"0.06em", textTransform:"uppercase" }}>{p.l} </span>
                    <span style={{ fontSize:12, fontWeight:700, color:p.c, fontFamily:F.display }}>{p.v}</span>
                  </div>
                ))}
              </div>
            </div>
          );})}
        </div>
      )}

      {histTab==="trends" && (
        <div>
          {checkins.length<2 ? <div style={{ color:C.muted, textAlign:"center", padding:"40px 0", fontSize:14, fontFamily:F.body }}>Log at least 2 days to see trends.</div> : (
            <>
              <TrendSparkline label="Weight" unit="lbs" color={C.amber} data={last7.map(e=>({date:e.date,val:parseFloat(e.weight)})).filter(d=>!isNaN(d.val))} target={GOAL_WEIGHT} targetLabel="Goal: 230 lbs" />
              <TrendSparkline label="Recovery Score" unit="%" color={C.green} data={last7.map(e=>({date:e.date,val:parseFloat(e.recovery)})).filter(d=>!isNaN(d.val))} />
              <TrendSparkline label="HRV" unit="ms" color={C.purple} data={last7.map(e=>({date:e.date,val:parseFloat(e.hrv)})).filter(d=>!isNaN(d.val))} />
              <TrendSparkline label="Sleep Performance" unit="%" color={C.teal} data={last7.map(e=>({date:e.date,val:parseFloat(e.sleepPerf)})).filter(d=>!isNaN(d.val))} />
              <TrendSparkline label="Resting HR" unit="bpm" color={C.pink} data={last7.map(e=>({date:e.date,val:parseFloat(e.rhr)})).filter(d=>!isNaN(d.val))} />
              <TrendSparkline label="Sleep Debt" unit="min" color={C.blue} data={last7.map(e=>({date:e.date,val:parseFloat(e.sleepDebt)})).filter(d=>!isNaN(d.val))} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── SCREEN: WORKOUT ───────────────────────────────────────────────────────────
function WorkoutScreen({ workouts, onSave, initPlanId }) {
  const [planId, setPlanId] = useState(initPlanId||null);
  const [sets, setSets] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("");
  const timerRef = useRef(null);
  const date = todayStr();
  const plan = PLANS.find(p=>p.id===planId);

  useEffect(()=>{ if(running){timerRef.current=setInterval(()=>setElapsed(e=>e+1),1000);}else clearInterval(timerRef.current); return()=>clearInterval(timerRef.current); },[running]);
  useEffect(()=>{ if(initPlanId&&!planId){setPlanId(initPlanId);setRunning(true);} },[initPlanId]);

  const startWorkout=(pid)=>{setPlanId(pid);setRunning(true);setElapsed(0);setSets({});};
  const logSet=(exId,idx,field,val)=>setSets(prev=>({...prev,[exId]:{...prev[exId],[idx]:{...prev[exId]?.[idx],[field]:val}}}));
  const markDone=(exId,idx)=>setSets(prev=>({...prev,[exId]:{...prev[exId],[idx]:{...prev[exId]?.[idx],done:!prev[exId]?.[idx]?.done}}}));
  const addSet=(exId)=>{ const ex=plan?.exercises.find(e=>e.id===exId); if(!ex)return; const n=Object.keys(sets[exId]||{}).length||ex.sets; setSets(prev=>({...prev,[exId]:{...prev[exId],[n]:{weight:ex.targetWeight,reps:ex.reps,done:false}}})); };
  const getPrev=(exId)=>{ const prev=Object.values(workouts).filter(s=>s.planId===planId&&s.sets?.[exId]).sort((a,b)=>b.date?.localeCompare(a.date))[0]; if(!prev)return null; const done=Object.values(prev.sets[exId]||{}).filter(x=>x.done); const maxW=Math.max(...done.map(x=>parseFloat(x.weight)||0)); return maxW>0?`${maxW} lbs`:null; };
  const handleFinish=async()=>{ const key=`${date}__${planId}`; await onSave(key,{planId,date,duration:elapsed,sets,note}); setRunning(false);setPlanId(null);setSets({});setNote(""); };
  const handleDiscard=()=>{setRunning(false);setPlanId(null);setSets({});setNote("");};

  if(!planId) return (
    <div style={{ padding:"16px", paddingBottom:80 }}>
      <div style={{ fontSize:11, color:C.blue, fontFamily:F.display, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:4 }}>Start Session</div>
      <div style={{ fontSize:28, fontWeight:900, color:C.text, fontFamily:F.display, marginBottom:20 }}>SELECT WORKOUT</div>
      {PLANS.map(p=>{ const color=TAG_COLOR[p.tag]||C.blue; return(
        <button key={p.id} onClick={()=>startWorkout(p.id)} style={{ width:"100%", background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px", marginBottom:8, cursor:"pointer", textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><div style={{ fontSize:18, fontWeight:800, color:C.text, fontFamily:F.display }}>{p.label}</div><div style={{ fontSize:12, color:C.muted, fontFamily:F.body, marginTop:3 }}>{p.exercises.length} exercises · {p.day}</div></div>
          <Tag label={p.tag} color={color} />
        </button>
      );})}
    </div>
  );

  const allExercises = plan?.exercises||[];
  const totalSets = allExercises.reduce((a,e)=>a+(Object.keys(sets[e.id]||{}).length||e.sets),0);
  const doneSets = allExercises.reduce((a,e)=>a+Object.values(sets[e.id]||{}).filter(s=>s.done).length,0);
  const pct = totalSets>0?Math.round((doneSets/totalSets)*100):0;

  return (
    <div style={{ paddingBottom:100 }}>
      <div style={{ position:"sticky", top:0, zIndex:20, background:C.bg, borderBottom:`1px solid ${C.border}`, padding:"12px 16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
          <div><div style={{ fontSize:10, color:C.blue, fontFamily:F.display, letterSpacing:"0.12em", textTransform:"uppercase" }}>{fmtDate(date)}</div><div style={{ fontSize:18, fontWeight:900, color:C.text, fontFamily:F.display, lineHeight:1.1 }}>{plan.label}</div></div>
          <div style={{ fontSize:32, fontWeight:900, color:C.blue, fontFamily:F.display }}>{fmtTime(elapsed)}</div>
        </div>
        <div style={{ background:C.dim, borderRadius:3, height:4 }}><div style={{ background:pct===100?C.green:C.blue, width:`${pct}%`, height:"100%", borderRadius:3, transition:"width 0.3s" }}/></div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:3 }}><span style={{ fontSize:10, color:C.muted, fontFamily:F.body }}>{doneSets}/{totalSets} sets</span><span style={{ fontSize:10, color:pct===100?C.green:C.muted, fontFamily:F.body }}>{pct}%</span></div>
      </div>
      <div style={{ padding:"14px 16px" }}>
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.blue, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>⚡ WARMUP</div>
          {plan.warmup.map((w,i)=><div key={i} style={{ fontSize:12, color:C.muted, fontFamily:F.body, padding:"2px 0" }}>· {w}</div>)}
        </div>

        {allExercises.map(ex => {
          const prevStr=getPrev(ex.id);
          const setCount=Math.max(Object.keys(sets[ex.id]||{}).length,ex.sets);
          const color=TAG_COLOR[plan.tag]||C.blue;
          return (
            <div key={ex.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, marginBottom:10, overflow:"hidden" }}>
              <div style={{ padding:"12px 14px 8px", borderBottom:`1px solid ${C.dim}` }}>
                <div style={{ fontSize:17, fontWeight:800, color:C.text, fontFamily:F.display }}>{ex.name}</div>
                <div style={{ display:"flex", gap:8, marginTop:4, alignItems:"center", flexWrap:"wrap" }}>
                  <Tag label={ex.muscle} color={color} />
                  <span style={{ fontSize:11, color:C.muted, fontFamily:F.body }}>{ex.sets}×{ex.reps}{ex.targetWeight>0?` · target ${ex.targetWeight} lbs`:" · BW"}</span>
                </div>
                {ex.note&&<div style={{ fontSize:11, color:C.muted, fontFamily:F.body, fontStyle:"italic", marginTop:5, lineHeight:1.4 }}>{ex.note}</div>}
                {prevStr&&<div style={{ fontSize:11, color:C.amber, fontFamily:F.body, marginTop:4 }}>Last: {prevStr}</div>}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"28px 1fr 76px 56px 40px", gap:4, padding:"6px 12px 4px", borderBottom:`1px solid ${C.dim}` }}>
                {["#","PREV","WEIGHT","REPS",""].map((h,i)=><span key={i} style={{ fontSize:9, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase" }}>{h}</span>)}
              </div>
              {Array.from({length:setCount},(_,i)=>{ const s=sets[ex.id]?.[i]||{}; const done=s.done; return(
                <div key={i} style={{ display:"grid", gridTemplateColumns:"28px 1fr 76px 56px 40px", gap:4, padding:"5px 12px", alignItems:"center", background:done?C.green+"0a":"transparent", borderBottom:`1px solid ${C.dim}` }}>
                  <span style={{ fontSize:13, fontWeight:700, color:done?C.green:C.muted, fontFamily:F.display, textAlign:"center" }}>{i+1}</span>
                  <span style={{ fontSize:11, color:C.muted, fontFamily:F.body }}>{prevStr||"—"}</span>
                  <input type="number" placeholder={String(ex.targetWeight||0)} value={s.weight??""} onChange={e=>logSet(ex.id,i,"weight",e.target.value)}
                    style={{ background:C.bg, border:`1px solid ${done?C.green+"44":C.border}`, borderRadius:6, color:C.text, padding:"6px 7px", fontSize:13, fontWeight:700, fontFamily:F.display, width:"100%", boxSizing:"border-box", outline:"none" }} />
                  <input type="number" placeholder={String(ex.reps)} value={s.reps??""} onChange={e=>logSet(ex.id,i,"reps",e.target.value)}
                    style={{ background:C.bg, border:`1px solid ${done?C.green+"44":C.border}`, borderRadius:6, color:C.text, padding:"6px 7px", fontSize:13, fontWeight:700, fontFamily:F.display, width:"100%", boxSizing:"border-box", outline:"none" }} />
                  <button onClick={()=>markDone(ex.id,i)} style={{ background:done?C.green+"22":C.dim, border:`1px solid ${done?C.green:C.border}`, borderRadius:7, color:done?C.green:C.muted, padding:"6px 0", fontSize:13, cursor:"pointer", width:"100%", fontFamily:F.display }}>{done?"✓":"○"}</button>
                </div>
              );})}
              <button onClick={()=>addSet(ex.id)} style={{ width:"100%", background:"none", border:"none", borderTop:`1px solid ${C.dim}`, color:C.blue, padding:"9px", fontSize:11, fontFamily:F.display, letterSpacing:"0.08em", cursor:"pointer" }}>+ ADD SET</button>
            </div>
          );
        })}

        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.green, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>🧘 COOLDOWN</div>
          {plan.cooldown.map((c,i)=><div key={i} style={{ fontSize:12, color:C.muted, fontFamily:F.body, padding:"2px 0" }}>· {c}</div>)}
        </div>
        <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Session notes..." rows={3}
          style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, padding:"10px 12px", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box", resize:"none", fontFamily:F.body, marginBottom:10 }} />
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={handleDiscard} style={{ flex:1, background:C.card, border:`1px solid ${C.border}`, borderRadius:10, color:C.muted, padding:"13px 0", fontSize:14, fontWeight:700, fontFamily:F.display, letterSpacing:"0.06em", cursor:"pointer" }}>DISCARD</button>
          <button onClick={handleFinish} style={{ flex:2, background:C.blue, border:"none", borderRadius:10, color:"#fff", padding:"13px 0", fontSize:14, fontWeight:800, fontFamily:F.display, letterSpacing:"0.08em", cursor:"pointer" }}>FINISH WORKOUT</button>
        </div>
      </div>
    </div>
  );
}

// ── HYDRATION ─────────────────────────────────────────────────────────────────
function HydrationTracker({ hydrationLog, onLog }) {
  const todayKey = todayStr();
  const todayOz = hydrationLog[todayKey] || 0;
  const pct = Math.min(100,(todayOz/HYDRATION_TARGET)*100);
  const remaining = Math.max(0,HYDRATION_TARGET-todayOz);
  const fillColor = pct>=100?C.green:pct>=60?C.blue:pct>=30?C.blueDim:C.muted;
  const last7 = Array.from({length:7},(_,i)=>{ const d=new Date();d.setDate(d.getDate()-(6-i)); const key=d.toISOString().split("T")[0]; return{key,oz:hydrationLog[key]||0,label:d.toLocaleDateString("en-US",{weekday:"short"}).slice(0,1)}; });
  const addOz=(oz)=>onLog(todayKey,Math.max(0,todayOz+oz));

  return (
    <div style={{ background:C.card, border:`1px solid ${pct>=100?C.green+"66":C.border}`, borderRadius:12, padding:"16px", marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
        <div>
          <div style={{ fontSize:10, color:C.blue, fontFamily:F.display, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:2 }}>💧 Hydration</div>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}><span style={{ fontSize:40, fontWeight:900, color:fillColor, fontFamily:F.display, lineHeight:1 }}>{todayOz}</span><span style={{ fontSize:14, color:C.muted, fontFamily:F.body }}>/ {HYDRATION_TARGET} oz</span></div>
          <div style={{ fontSize:12, color:C.muted, fontFamily:F.body, marginTop:2 }}>{pct>=100?"🎉 Goal reached!":`${remaining} oz to go`}</div>
        </div>
        <div style={{ position:"relative", width:64, height:64 }}>
          <svg viewBox="0 0 64 64" style={{ width:64, height:64, transform:"rotate(-90deg)" }}>
            <circle cx="32" cy="32" r="26" fill="none" stroke={C.dim} strokeWidth="6" />
            <circle cx="32" cy="32" r="26" fill="none" stroke={fillColor} strokeWidth="6" strokeDasharray={`${2*Math.PI*26}`} strokeDashoffset={`${2*Math.PI*26*(1-pct/100)}`} strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.5s" }} />
          </svg>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontSize:13, fontWeight:900, color:fillColor, fontFamily:F.display }}>{Math.round(pct)}%</span></div>
        </div>
      </div>
      <div style={{ background:C.dim, borderRadius:4, height:8, marginBottom:14, overflow:"hidden" }}>
        <div style={{ background:`linear-gradient(90deg,${C.blueDim},${fillColor})`, width:`${pct}%`, height:"100%", borderRadius:4, transition:"width 0.4s" }} />
      </div>
      <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
        {HYDRATION_INCREMENTS.map(oz=><button key={oz} onClick={()=>addOz(oz)} style={{ background:C.card2, border:`1px solid ${C.border}`, borderRadius:8, color:C.blue, padding:"7px 10px", fontSize:12, fontWeight:700, fontFamily:F.display, cursor:"pointer", flex:"1 1 auto", minWidth:44 }}>+{oz}oz</button>)}
      </div>
      <div style={{ display:"flex", gap:6 }}>
        <button onClick={()=>addOz(-8)} style={{ flex:1, background:C.dim, border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, padding:"7px 0", fontSize:11, fontFamily:F.display, letterSpacing:"0.06em", cursor:"pointer" }}>− 8 oz</button>
        <button onClick={()=>onLog(todayKey,0)} style={{ flex:1, background:C.dim, border:`1px solid ${C.border}`, borderRadius:8, color:C.muted, padding:"7px 0", fontSize:11, fontFamily:F.display, letterSpacing:"0.06em", cursor:"pointer" }}>RESET</button>
      </div>
      <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${C.dim}` }}>
        <div style={{ fontSize:10, color:C.muted, fontFamily:F.display, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>Last 7 Days</div>
        <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:36 }}>
          {last7.map((d,i)=>{ const bp=Math.min(100,(d.oz/HYDRATION_TARGET)*100); const isToday=d.key===todayKey; const barColor=bp>=100?C.green:isToday?C.blue:C.blueDim; return(
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <div style={{ width:"100%", background:C.dim, borderRadius:3, height:28, display:"flex", alignItems:"flex-end", overflow:"hidden" }}>
                <div style={{ width:"100%", background:barColor, height:`${Math.max(bp,3)}%`, borderRadius:3, transition:"height 0.3s", opacity:isToday?1:0.6 }} />
              </div>
              <span style={{ fontSize:9, color:isToday?C.blue:C.muted, fontFamily:F.display, fontWeight:isToday?700:400 }}>{d.label}</span>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

// ── SCREEN: MEAL PLAN ─────────────────────────────────────────────────────────
function MealPlanScreen({ mealLog, onLogMeal, hydrationLog, onLogHydration }) {
  const [selectedDay, setSelectedDay] = useState(getCurrentDay());
  const [logMode, setLogMode] = useState(null);
  const [inputMode, setInputMode] = useState("manual");
  const [manualEntry, setManualEntry] = useState({name:"",cal:"",protein:"",carbs:"",fat:""});
  const [photoState, setPhotoState] = useState({});
  const fileInputRef = useRef(null);
  const [pendingPhotoMeal, setPendingPhotoMeal] = useState(null);

  const dayPlan = MEAL_PLAN[selectedDay]||{};
  const todayLog = mealLog[selectedDay]||{};
  const loggedTotals = Object.values(todayLog).reduce((acc,m)=>{ if(m?.logged){acc.cal+=parseFloat(m.cal)||0;acc.protein+=parseFloat(m.protein)||0;acc.carbs+=parseFloat(m.carbs)||0;acc.fat+=parseFloat(m.fat)||0;} return acc; },{cal:0,protein:0,carbs:0,fat:0});

  const handleUseRecommended=(meal)=>{ onLogMeal(selectedDay,meal,{...dayPlan[meal],logged:true,logType:"recommended"}); setLogMode(null); };
  const handleManualLog=(meal)=>{ if(!manualEntry.cal&&!manualEntry.protein)return; const rec=dayPlan[meal]; onLogMeal(selectedDay,meal,{name:manualEntry.name||rec?.name,cal:manualEntry.cal||rec?.cal,protein:manualEntry.protein||rec?.protein,carbs:manualEntry.carbs||rec?.carbs,fat:manualEntry.fat||rec?.fat,logged:true,logType:"manual"}); setManualEntry({name:"",cal:"",protein:"",carbs:"",fat:""}); setLogMode(null); };
  const handleUnlog=(meal)=>onLogMeal(selectedDay,meal,null);

  const handlePhotoUpload=async(meal,file)=>{
    setPendingPhotoMeal(meal); setPhotoState(prev=>({...prev,[meal]:{loading:true,result:null,error:null}}));
    try {
      const base64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(file);});
      const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type||"image/jpeg",data:base64}},{type:"text",text:`Analyze this food photo. Respond ONLY with JSON, no markdown:\n{"name":"description","cal":number,"protein":number,"carbs":number,"fat":number}`}]}]})});
      const data=await response.json(); const text=data.content?.find(b=>b.type==="text")?.text||""; const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      setPhotoState(prev=>({...prev,[meal]:{loading:false,result:parsed,error:null}})); setManualEntry({name:parsed.name||"",cal:String(parsed.cal||""),protein:String(parsed.protein||""),carbs:String(parsed.carbs||""),fat:String(parsed.fat||"")});setInputMode("manual");
    } catch(err){ setPhotoState(prev=>({...prev,[meal]:{loading:false,result:null,error:"Couldn't analyze photo. Enter macros manually."}})); }
  };

  const macroBar=(label,val,target,color)=>{const pct=Math.min(100,(val/target)*100); return(
    <div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:10,color:C.muted,fontFamily:F.display,letterSpacing:"0.08em",textTransform:"uppercase"}}>{label}</span><span style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{Math.round(val)}/{target}</span></div><div style={{background:C.dim,borderRadius:3,height:5}}><div style={{background:color,width:`${pct}%`,height:"100%",borderRadius:3}}/></div></div>
  );};

  return (
    <div style={{ padding:"16px", paddingBottom:80 }}>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{if(e.target.files[0]&&pendingPhotoMeal)handlePhotoUpload(pendingPhotoMeal,e.target.files[0]);e.target.value="";}} />
      <div style={{ fontSize:11, color:C.blue, fontFamily:F.display, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:2 }}>Nutrition</div>
      <div style={{ fontSize:28, fontWeight:900, color:C.text, fontFamily:F.display, marginBottom:12 }}>MEAL PLAN</div>
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:16 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div><div style={{ fontSize:10, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase" }}>Calories</div><div style={{ fontSize:30, fontWeight:900, color:C.blue, fontFamily:F.display, lineHeight:1 }}>{loggedTotals.cal.toFixed(0)} <span style={{fontSize:13,color:C.muted}}>/ {NUTRITION_TARGETS.calories}</span></div></div>
          <div style={{textAlign:"right"}}><div style={{ fontSize:10, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase" }}>Protein</div><div style={{ fontSize:30, fontWeight:900, color:C.green, fontFamily:F.display, lineHeight:1 }}>{loggedTotals.protein.toFixed(0)}g <span style={{fontSize:13,color:C.muted}}>/ {NUTRITION_TARGETS.protein}g</span></div></div>
        </div>
        <div style={{display:"flex",gap:10}}>{macroBar("Protein",loggedTotals.protein,NUTRITION_TARGETS.protein,C.green)}{macroBar("Carbs",loggedTotals.carbs,NUTRITION_TARGETS.carbs,C.blue)}{macroBar("Fat",loggedTotals.fat,NUTRITION_TARGETS.fat,C.amber)}</div>
        <div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:8}}>Target: 2,400 cal · 230g protein · 200g carbs · 80g fat</div>
      </div>

      <HydrationTracker hydrationLog={hydrationLog} onLog={onLogHydration} />

      <div style={{ display:"flex", gap:4, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
        {DAYS.map(d=>{const logged=Object.values(mealLog[d]||{}).filter(m=>m?.logged).length; const isToday=d===getCurrentDay(); return(
          <button key={d} onClick={()=>{setSelectedDay(d);setLogMode(null);}} style={{ flex:"0 0 auto", background:selectedDay===d?C.blue:C.card, border:`1px solid ${selectedDay===d?C.blue:isToday?C.blue+"44":C.border}`, borderRadius:8, padding:"6px 12px", cursor:"pointer", minWidth:44, textAlign:"center" }}>
            <div style={{fontSize:11,fontWeight:800,color:selectedDay===d?"#fff":C.text,fontFamily:F.display}}>{d}</div>
            {logged>0&&<div style={{width:4,height:4,borderRadius:"50%",background:C.green,margin:"3px auto 0"}}/>}
          </button>
        );})}
      </div>

      {MEAL_TYPES.map(meal=>{
        const rec=dayPlan[meal]; const logged=todayLog[meal]; const isLogged=logged?.logged; const isOpen=logMode?.day===selectedDay&&logMode?.meal===meal; const ps=photoState[meal]||{};
        return (
          <div key={meal} style={{ background:C.card, border:`1px solid ${isLogged?C.green+"44":C.border}`, borderRadius:12, marginBottom:10, overflow:"hidden" }}>
            <div style={{padding:"13px 14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1,marginRight:10}}>
                  <div style={{fontSize:10,color:isLogged?C.green:C.blue,fontFamily:F.display,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:2}}>{MEAL_LABELS[meal]} {isLogged&&"✓"}</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:F.display,lineHeight:1.3}}>{isLogged?(logged.name||rec?.name):rec?.name}</div>
                  <div style={{display:"flex",gap:8,marginTop:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:11,color:C.blue,fontFamily:F.body}}>{isLogged?logged.cal:rec?.cal} cal</span>
                    <span style={{fontSize:11,color:C.green,fontFamily:F.body}}>{isLogged?logged.protein:rec?.protein}g prot</span>
                    <span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>{isLogged?logged.carbs:rec?.carbs}g carbs · {isLogged?logged.fat:rec?.fat}g fat</span>
                  </div>
                </div>
                {isLogged
                  ? <button onClick={()=>handleUnlog(meal)} style={{background:C.green+"18",border:`1px solid ${C.green}`,borderRadius:8,color:C.green,padding:"6px 10px",fontSize:10,fontFamily:F.display,cursor:"pointer",whiteSpace:"nowrap"}}>LOGGED ✓</button>
                  : <button onClick={()=>{setLogMode(isOpen?null:{day:selectedDay,meal});setInputMode("manual");setManualEntry({name:"",cal:"",protein:"",carbs:"",fat:""});setPhotoState(prev=>({...prev,[meal]:{}}));}} style={{background:C.dim,border:`1px solid ${C.border}`,borderRadius:8,color:C.muted,padding:"6px 10px",fontSize:10,fontFamily:F.display,cursor:"pointer",whiteSpace:"nowrap"}}>{isOpen?"CANCEL":"LOG"}</button>
                }
              </div>
            </div>
            {isOpen&&!isLogged&&(
              <div style={{borderTop:`1px solid ${C.dim}`,padding:"12px 14px",background:C.card2}}>
                <div style={{display:"flex",gap:6,marginBottom:12}}>
                  {[["manual","ENTER MACROS"],["photo","📷 PHOTO"],["rec","USE PLAN"]].map(([mode,label])=>(
                    <button key={mode} onClick={()=>{if(mode==="rec")handleUseRecommended(meal);else setInputMode(mode);}} style={{flex:1,background:inputMode===mode&&mode!=="rec"?C.blue:C.dim,border:"none",borderRadius:6,color:inputMode===mode&&mode!=="rec"?"#fff":mode==="rec"?C.green:C.muted,padding:"8px 4px",fontSize:10,fontFamily:F.display,letterSpacing:"0.06em",cursor:"pointer"}}>{label}</button>
                  ))}
                </div>
                {inputMode==="photo"&&(
                  <div>
                    {ps.loading&&<div style={{textAlign:"center",padding:"16px 0"}}><div style={{fontSize:22,marginBottom:6}}>🔍</div><div style={{fontSize:12,color:C.muted,fontFamily:F.body}}>Analyzing your meal...</div></div>}
                    {ps.error&&<div style={{fontSize:12,color:C.red,fontFamily:F.body,marginBottom:8}}>{ps.error}</div>}
                    {ps.result&&<div style={{background:C.blue+"12",border:`1px solid ${C.blue}33`,borderRadius:8,padding:"10px 12px",marginBottom:8}}><div style={{fontSize:10,color:C.blue,fontFamily:F.display,letterSpacing:"0.08em",marginBottom:3}}>AI ESTIMATE</div><div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:F.display}}>{ps.result.name}</div><div style={{fontSize:11,color:C.muted,fontFamily:F.body,marginTop:3}}>{ps.result.cal} cal · {ps.result.protein}g protein</div></div>}
                    {!ps.loading&&<button onClick={()=>{setPendingPhotoMeal(meal);fileInputRef.current?.click();}} style={{width:"100%",background:C.dim,border:`2px dashed ${C.border}`,borderRadius:10,color:C.blue,padding:"14px",fontSize:12,fontFamily:F.display,letterSpacing:"0.08em",cursor:"pointer",marginBottom:ps.result?8:0}}>{ps.result?"📷 RETAKE":"📷 TAP TO TAKE PHOTO OR UPLOAD"}</button>}
                    {ps.result&&!ps.loading&&<button onClick={()=>setInputMode("manual")} style={{width:"100%",background:C.green,border:"none",borderRadius:8,color:"#fff",padding:"10px",fontSize:12,fontWeight:800,fontFamily:F.display,letterSpacing:"0.08em",cursor:"pointer"}}>REVIEW & SAVE →</button>}
                  </div>
                )}
                {inputMode==="manual"&&(
                  <div>
                    {ps.result&&<div style={{fontSize:11,color:C.blue,fontFamily:F.body,marginBottom:8}}>✓ Pre-filled from photo</div>}
                    <div style={{marginBottom:8}}><div style={{fontSize:10,color:C.muted,fontFamily:F.display,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>What did you eat?</div><input type="text" value={manualEntry.name} onChange={e=>setManualEntry(p=>({...p,name:e.target.value}))} placeholder={rec?.name||"Describe your meal..."} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,padding:"8px 10px",fontSize:13,fontFamily:F.body,width:"100%",boxSizing:"border-box",outline:"none"}}/></div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                      {[["cal","Calories"],["protein","Protein (g)"],["carbs","Carbs (g)"],["fat","Fat (g)"]].map(([k,l])=>(
                        <div key={k}><div style={{fontSize:10,color:C.muted,fontFamily:F.display,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:3}}>{l}</div><input type="number" value={manualEntry[k]} onChange={e=>setManualEntry(p=>({...p,[k]:e.target.value}))} placeholder="0" style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:6,color:C.text,padding:"7px 10px",fontSize:14,fontWeight:700,fontFamily:F.display,width:"100%",boxSizing:"border-box",outline:"none"}}/></div>
                      ))}
                    </div>
                    <button onClick={()=>handleManualLog(meal)} style={{width:"100%",background:C.blue,border:"none",borderRadius:8,color:"#fff",padding:"10px",fontSize:12,fontWeight:800,fontFamily:F.display,letterSpacing:"0.08em",cursor:"pointer"}}>SAVE LOG</button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SCREEN: HISTORY ───────────────────────────────────────────────────────────
function HistoryScreen({ workouts }) {
  const sessions = Object.values(workouts).sort((a,b)=>b.date?.localeCompare(a.date));
  const prMap = {};
  [...sessions].reverse().forEach(s=>{ Object.entries(s.sets||{}).forEach(([exId,sets])=>{ const done=Object.values(sets).filter(x=>x.done&&parseFloat(x.weight)>0); const maxW=Math.max(...done.map(x=>parseFloat(x.weight)||0)); if(maxW>0){if(!prMap[exId])prMap[exId]={weight:0,date:""}; if(maxW>prMap[exId].weight)prMap[exId]={weight:maxW,date:s.date};} }); });
  if(sessions.length===0) return <div style={{padding:"48px 16px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:C.muted,fontFamily:F.display}}>NO SESSIONS YET</div></div>;
  return (
    <div style={{ padding:"16px", paddingBottom:80 }}>
      <div style={{ fontSize:28, fontWeight:900, color:C.text, fontFamily:F.display, marginBottom:20 }}>HISTORY</div>
      {sessions.map((s,i)=>{ const plan=PLANS.find(p=>p.id===s.planId); const totalSets=Object.values(s.sets||{}).reduce((a,ex)=>a+Object.values(ex).filter(x=>x.done).length,0); const exEntries=Object.entries(s.sets||{}); const color=TAG_COLOR[plan?.tag]||C.blue; const hasPR=exEntries.some(([exId])=>prMap[exId]?.date===s.date); return(
        <div key={i} style={{ background:C.card, border:`1px solid ${hasPR?C.amber:C.border}`, borderRadius:12, padding:"13px 14px", marginBottom:10 }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
            <div><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:17,fontWeight:800,color:C.text,fontFamily:F.display}}>{plan?.label||"Workout"}</div>{hasPR&&<span>🏆</span>}</div><div style={{fontSize:12,color:C.muted,fontFamily:F.body,marginTop:2}}>{fmtDate(s.date)} · {totalSets} sets · {s.duration?fmtTime(s.duration):"—"}</div></div>
            <Tag label={plan?.tag||"?"} color={color} />
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {exEntries.map(([exId,sets])=>{ const ex=plan?.exercises.find(e=>e.id===exId); const done=Object.values(sets).filter(x=>x.done); const maxW=Math.max(...done.map(x=>parseFloat(x.weight)||0)); const isPR=prMap[exId]?.date===s.date&&maxW>0; if(!ex||done.length===0)return null; return(
              <div key={exId} style={{background:isPR?C.amber+"18":C.dim,border:`1px solid ${isPR?C.amber:C.border}`,borderRadius:20,padding:"3px 9px",display:"flex",alignItems:"center",gap:3}}>
                {isPR&&<span style={{fontSize:9}}>🏆</span>}
                <span style={{fontSize:10,color:isPR?C.amber:C.muted,fontFamily:F.body}}>{ex.name} · {maxW>0?`${maxW}lbs`:"BW"}</span>
              </div>
            );})}
          </div>
          {s.note&&<div style={{fontSize:11,color:C.muted,fontFamily:F.body,fontStyle:"italic",marginTop:7}}>{s.note}</div>}
        </div>
      );})}
    </div>
  );
}

// ── SCREEN: PROGRESS ──────────────────────────────────────────────────────────
function ProgressScreen({ workouts, checkins }) {
  const sessions = Object.values(workouts).sort((a,b)=>b.date?.localeCompare(a.date));
  const fourWeeksAgo = new Date(); fourWeeksAgo.setDate(fourWeeksAgo.getDate()-28);
  const volumeByMuscle = {};
  MUSCLE_GROUPS.forEach(m=>volumeByMuscle[m]=0);
  sessions.filter(s=>new Date(s.date+"T12:00:00")>=fourWeeksAgo).forEach(s=>{ const plan=PLANS.find(p=>p.id===s.planId); Object.entries(s.sets||{}).forEach(([exId,sets])=>{ const ex=plan?.exercises.find(e=>e.id===exId); if(!ex)return; const done=Object.values(sets).filter(x=>x.done); const vol=done.reduce((a,x)=>a+(parseFloat(x.weight)||0)*(parseInt(x.reps)||1),0); if(ex.muscle&&volumeByMuscle[ex.muscle]!==undefined)volumeByMuscle[ex.muscle]+=vol; }); });
  const maxVol=Math.max(...Object.values(volumeByMuscle),1);
  const musclesWithVol=Object.entries(volumeByMuscle).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  const exerciseData={};
  PLANS.flatMap(p=>p.exercises).forEach(ex=>{exerciseData[ex.id]={name:ex.name,muscle:ex.muscle,points:[],pr:{weight:0,reps:0,date:""}};});
  [...sessions].reverse().forEach(s=>{ Object.entries(s.sets||{}).forEach(([exId,sets])=>{ if(!exerciseData[exId])return; const done=Object.values(sets).filter(x=>x.done&&parseFloat(x.weight)>0); if(done.length===0)return; const maxW=Math.max(...done.map(x=>parseFloat(x.weight)||0)); const maxR=Math.max(...done.map(x=>parseInt(x.reps)||0)); exerciseData[exId].points.push({date:s.date,weight:maxW,reps:maxR}); if(maxW>exerciseData[exId].pr.weight)exerciseData[exId].pr={weight:maxW,reps:maxR,date:s.date}; }); });
  const activeExercises=Object.values(exerciseData).filter(e=>e.points.length>0).sort((a,b)=>b.pr.weight-a.pr.weight);
  const last7=checkins.slice(0,7).reverse();

  return (
    <div style={{ padding:"16px", paddingBottom:80 }}>
      <div style={{ fontSize:28, fontWeight:900, color:C.text, fontFamily:F.display, marginBottom:20 }}>PROGRESS</div>
      {checkins.length>=2&&(
        <div style={{marginBottom:20}}>
          <div style={{ fontSize:12, fontWeight:700, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Health Trends · Last 7 Days</div>
          <TrendSparkline label="Weight" unit="lbs" color={C.amber} data={last7.map(e=>({date:e.date,val:parseFloat(e.weight)})).filter(d=>!isNaN(d.val))} target={GOAL_WEIGHT} targetLabel="Goal: 230 lbs" />
          <TrendSparkline label="Recovery Score" unit="%" color={C.green} data={last7.map(e=>({date:e.date,val:parseFloat(e.recovery)})).filter(d=>!isNaN(d.val))} />
          <TrendSparkline label="HRV" unit="ms" color={C.purple} data={last7.map(e=>({date:e.date,val:parseFloat(e.hrv)})).filter(d=>!isNaN(d.val))} />
          <TrendSparkline label="Sleep Performance" unit="%" color={C.teal} data={last7.map(e=>({date:e.date,val:parseFloat(e.sleepPerf)})).filter(d=>!isNaN(d.val))} />
        </div>
      )}
      <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"16px", marginBottom:20 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:14 }}>Training Volume · Muscle Group</div>
        {musclesWithVol.length===0?<div style={{color:C.muted,fontSize:13,fontFamily:F.body}}>Log workouts to see volume breakdown.</div>:musclesWithVol.map(([muscle,vol])=>(
          <div key={muscle} style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:C.text,fontFamily:F.display,fontWeight:600}}>{muscle}</span><span style={{fontSize:11,color:C.muted,fontFamily:F.body}}>{Math.round(vol).toLocaleString()} lbs</span></div>
            <div style={{background:C.dim,borderRadius:3,height:8}}><div style={{background:`linear-gradient(90deg,${C.blue},${C.blueDim})`,width:`${(vol/maxVol)*100}%`,height:"100%",borderRadius:3}}/></div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:C.muted, fontFamily:F.display, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Lift Progress</div>
      {activeExercises.map(ex=>{ const pts=ex.points; if(pts.length<1)return null; const weights=pts.map(p=>p.weight); const minW=Math.min(...weights),maxW=Math.max(...weights),range=maxW-minW||1; const w=300,h=48,pad=8; const svgPts=pts.map((p,i)=>[pad+(i/Math.max(pts.length-1,1))*(w-pad*2),h-pad-((p.weight-minW)/range)*(h-pad*2)]); const path=svgPts.map((p,i)=>`${i===0?"M":"L"}${p[0]},${p[1]}`).join(" "); const trend=pts.length>1?pts[pts.length-1].weight-pts[0].weight:0; return(
        <div key={ex.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:"13px 14px", marginBottom:10 }}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
            <div><div style={{fontSize:15,fontWeight:800,color:C.text,fontFamily:F.display}}>{ex.name}</div><div style={{fontSize:10,color:C.muted,fontFamily:F.body,marginTop:1}}>{pts.length} sessions</div></div>
            <div style={{textAlign:"right"}}><div style={{fontSize:10,color:C.amber,fontFamily:F.display,letterSpacing:"0.1em",textTransform:"uppercase"}}>PR</div><div style={{fontSize:26,fontWeight:900,color:C.amber,fontFamily:F.display,lineHeight:1}}>{ex.pr.weight} <span style={{fontSize:12}}>lbs</span></div>{ex.pr.reps>0&&<div style={{fontSize:10,color:C.muted,fontFamily:F.body}}>{ex.pr.reps} reps · {fmtDate(ex.pr.date)}</div>}</div>
          </div>
          {pts.length>1&&(<><svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%",height:36}}><path d={path} fill="none" stroke={C.blue} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>{svgPts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r={2.5} fill={C.blue}/>)}</svg><div style={{fontSize:11,color:trend>0?C.green:trend<0?C.red:C.muted,fontFamily:F.body,marginTop:3}}>{trend>0?"▲":trend<0?"▼":"—"} {Math.abs(trend)} lbs since first session</div></>)}
        </div>
      );})}
      {activeExercises.length===0&&<div style={{color:C.muted,fontSize:14,fontFamily:F.body,textAlign:"center",padding:"24px 0"}}>Log workouts to track progress.</div>}
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────────────────────
function BottomNav({ tab, setTab, hasCheckinToday }) {
  const tabs = [
    { id:"dashboard", label:"Home",     icon:"⌂" },
    { id:"checkin",   label:"Check-In", icon:"📊", badge:!hasCheckinToday },
    { id:"workout",   label:"Workout",  icon:"⚡" },
    { id:"meals",     label:"Nutrition",icon:"🥗" },
    { id:"progress",  label:"Progress", icon:"📈" },
  ];
  return (
    <div style={{ position:"fixed", bottom:0, left:0, right:0, background:C.card, borderTop:`1px solid ${C.border}`, display:"flex", zIndex:100, paddingBottom:"env(safe-area-inset-bottom)" }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>setTab(t.id)} style={{ flex:1, background:"none", border:"none", padding:"10px 4px 14px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, position:"relative" }}>
          <span style={{ fontSize:17, lineHeight:1 }}>{t.icon}</span>
          {t.badge&&<div style={{ position:"absolute", top:8, right:"calc(50% - 12px)", width:7, height:7, borderRadius:"50%", background:C.blue, border:`2px solid ${C.card}` }}/>}
          <span style={{ fontSize:9, fontFamily:F.display, letterSpacing:"0.08em", textTransform:"uppercase", color:tab===t.id?C.blue:C.muted, fontWeight:tab===t.id?700:400 }}>{t.label}</span>
          {tab===t.id&&<div style={{ width:20, height:2, background:C.blue, borderRadius:2, marginTop:1 }}/>}
        </button>
      ))}
    </div>
  );
}

// ── ROOT APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [workouts, setWorkouts] = useState({});
  const [mealLog, setMealLog] = useState({});
  const [checkins, setCheckins] = useState([]);
  const [hydrationLog, setHydrationLog] = useState({});
  const [launchPlanId, setLaunchPlanId] = useState(null);
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState(false);

  useEffect(() => {
    const load = async () => {
      setSyncing(true);
      try {
        const [w, m, c, h] = await Promise.all([DB.loadWorkouts(), DB.loadMeals(), DB.loadCheckins(), DB.loadHydration()]);
        setWorkouts(w); setMealLog(m); setCheckins(c); setHydrationLog(h);
        setSyncError(false);
      } catch { setSyncError(true); }
      finally { setSyncing(false); }
    };
    load();
  }, []);

  const saveWorkout = async (key, session) => { const u={...workouts,[key]:session}; setWorkouts(u); await DB.saveWorkout(key,session); };
  const saveMeal = async (day, meal, data) => { const dd={...(mealLog[day]||{}),[meal]:data}; const u={...mealLog,[day]:dd}; setMealLog(u); await DB.saveMeals(day,dd); };
  const saveCheckin = async (entry) => { const u=[entry,...checkins.filter(c=>c.date!==entry.date)].sort((a,b)=>b.date.localeCompare(a.date)); setCheckins(u); await DB.saveCheckin(entry); };
  const saveHydration = async (dateKey, oz) => { const u={...hydrationLog,[dateKey]:oz}; setHydrationLog(u); await DB.saveHydration(dateKey,oz); };

  const hasCheckinToday = checkins.some(c=>c.date===todayStr());
  const handleStartWorkout = (planId) => { setLaunchPlanId(planId); setTab("workout"); };

  return (
    <div style={{ background:C.bg, minHeight:"100vh", color:C.text, fontFamily:F.body, maxWidth:480, margin:"0 auto" }}>
      {(syncing||syncError) && (
        <div style={{ position:"fixed", top:0, left:0, right:0, zIndex:200, padding:"8px 16px", background:syncError?C.red+"dd":C.blueDim+"ee", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
          {syncing&&<div style={{ width:12, height:12, border:"2px solid #fff", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>}
          <span style={{ fontSize:12, color:"#fff", fontFamily:F.display, letterSpacing:"0.08em" }}>{syncError?"⚠ SYNC ERROR — CHECK CONNECTION":"SYNCING…"}</span>
        </div>
      )}
      <div style={{ paddingTop:syncing||syncError?34:0 }}>
        {tab==="dashboard" && <Dashboard workouts={workouts} checkins={checkins} onStartWorkout={handleStartWorkout} />}
        {tab==="checkin"   && <CheckInScreen checkins={checkins} onSave={saveCheckin} />}
        {tab==="workout"   && <WorkoutScreen workouts={workouts} onSave={saveWorkout} initPlanId={launchPlanId} />}
        {tab==="meals"     && <MealPlanScreen mealLog={mealLog} onLogMeal={saveMeal} hydrationLog={hydrationLog} onLogHydration={saveHydration} />}
        {tab==="progress"  && <ProgressScreen workouts={workouts} checkins={checkins} />}
      </div>
      <BottomNav tab={tab} setTab={setTab} hasCheckinToday={hasCheckinToday} />
    </div>
  );
}
