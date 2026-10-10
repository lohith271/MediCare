import type {
  RetestRule,
  InteractionRule,
  TestConditionMap,
} from "@/lib/types/database";

export const BRAND_GENERIC_MAP: Record<string, { generic: string; ingredients: string[] }> = {
  glucophage: { generic: "metformin", ingredients: ["metformin"] },
  glycomet: { generic: "metformin", ingredients: ["metformin"] },
  janumet: { generic: "metformin + sitagliptin", ingredients: ["metformin", "sitagliptin"] },
  amoxil: { generic: "amoxicillin", ingredients: ["amoxicillin"] },
  augmentin: { generic: "amoxicillin + clavulanic acid", ingredients: ["amoxicillin", "clavulanic acid"] },
  lipitor: { generic: "atorvastatin", ingredients: ["atorvastatin"] },
  atorva: { generic: "atorvastatin", ingredients: ["atorvastatin"] },
  zestril: { generic: "lisinopril", ingredients: ["lisinopril"] },
  prinivil: { generic: "lisinopril", ingredients: ["lisinopril"] },
  norvasc: { generic: "amlodipine", ingredients: ["amlodipine"] },
  amlopres: { generic: "amlodipine", ingredients: ["amlodipine"] },
  lasix: { generic: "furosemide", ingredients: ["furosemide"] },
  aldactone: { generic: "spironolactone", ingredients: ["spironolactone"] },
  coumadin: { generic: "warfarin", ingredients: ["warfarin"] },
  ecosprin: { generic: "aspirin", ingredients: ["aspirin"] },
  aspirin: { generic: "aspirin", ingredients: ["aspirin"] },
  panadol: { generic: "paracetamol", ingredients: ["paracetamol"] },
  tylenol: { generic: "paracetamol", ingredients: ["paracetamol"] },
  calpol: { generic: "paracetamol", ingredients: ["paracetamol"] },
  crocin: { generic: "paracetamol", ingredients: ["paracetamol"] },
  advil: { generic: "ibuprofen", ingredients: ["ibuprofen"] },
  motrin: { generic: "ibuprofen", ingredients: ["ibuprofen"] },
  brufen: { generic: "ibuprofen", ingredients: ["ibuprofen"] },
  zithromax: { generic: "azithromycin", ingredients: ["azithromycin"] },
  azithral: { generic: "azithromycin", ingredients: ["azithromycin"] },
  cipro: { generic: "ciprofloxacin", ingredients: ["ciprofloxacin"] },
  ciprobid: { generic: "ciprofloxacin", ingredients: ["ciprofloxacin"] },
};

export const CONDITION_SYNONYMS: Record<string, string> = {
  t2dm: "Type 2 Diabetes Mellitus",
  "type 2 dm": "Type 2 Diabetes Mellitus",
  "type 2 diabetes": "Type 2 Diabetes Mellitus",
  "type 2 diabetes mellitus": "Type 2 Diabetes Mellitus",
  diabetes: "Type 2 Diabetes Mellitus",
  htn: "Essential Hypertension",
  hypertension: "Essential Hypertension",
  "high blood pressure": "Essential Hypertension",
  cad: "Coronary Artery Disease",
  "coronary artery disease": "Coronary Artery Disease",
  ckd: "Chronic Kidney Disease",
  "chronic kidney disease": "Chronic Kidney Disease",
  dyslipidemia: "Hyperlipidemia",
  hyperlipidemia: "Hyperlipidemia",
  "high cholesterol": "Hyperlipidemia",
  gerd: "Gastroesophageal Reflux Disease",
  "acid reflux": "Gastroesophageal Reflux Disease",
  hypothyroidism: "Hypothyroidism",
  asthma: "Bronchial Asthma",
};

export const RETEST_RULES: RetestRule[] = [
  {
    test_pattern: "hba1c|glycated hemoglobin|hemoglobin a1c",
    min_days: 90,
    note: "HbA1c typically repeated every 90 days (3 months) for glycemic control monitoring",
  },
  {
    test_pattern: "lipid|cholesterol|triglyceride|ldl|hdl",
    min_days: 180,
    note: "Lipid panel is typically evaluated every 6 months (180 days) under general guidance",
  },
  {
    test_pattern: "cbc|complete blood count|hemogram",
    min_days: 30,
    note: "Complete blood count typical repeat interval is 30 days unless acute symptoms present",
  },
  {
    test_pattern: "tsh|thyroid stimulating hormone|free t4",
    min_days: 60,
    note: "Thyroid function (TSH) monitoring typical interval is 60-90 days",
  },
  {
    test_pattern: "creatinine|egfr|renal function|kidney function|bun",
    min_days: 90,
    note: "Kidney function (Creatinine/eGFR) is typically evaluated every 90 days in chronic care",
  },
  {
    test_pattern: "liver function|lft|sgpt|sgot|alt|ast",
    min_days: 90,
    note: "Liver function test typical interval is 90 days under routine monitoring",
  },
  {
    test_pattern: "vitamin d|25-hydroxy vitamin d",
    min_days: 90,
    note: "Vitamin D typically reassessed after 90 to 180 days of supplementation",
  },
];

export const INTERACTION_RULES: InteractionRule[] = [
  {
    drug_a: "lisinopril",
    drug_b: "spironolactone",
    severity: "high",
    note: "Hyperkalemia risk: Concurrent ACE inhibitor and potassium-sparing diuretic can dangerously elevate serum potassium.",
  },
  {
    drug_a: "lisinopril",
    drug_b: "potassium",
    severity: "high",
    note: "Severe hyperkalemia risk: Concurrent ACE inhibitor and potassium supplementation.",
  },
  {
    drug_a: "aspirin",
    drug_b: "warfarin",
    severity: "high",
    note: "Major bleeding hazard: Dual antiplatelet and anticoagulant therapy significantly elevates hemorrhage risk.",
  },
  {
    drug_a: "aspirin",
    drug_b: "ibuprofen",
    severity: "moderate",
    note: "NSAID antagonism & GI bleed: Ibuprofen can diminish cardioprotective effects of low-dose aspirin and heighten gastrointestinal ulceration risk.",
  },
  {
    drug_a: "metformin",
    drug_b: "cimetidine",
    severity: "moderate",
    note: "Reduced metformin elimination: Cimetidine reduces renal tubular clearance of metformin, raising the risk of lactic acidosis.",
  },
  {
    drug_a: "atorvastatin",
    drug_b: "clarithromycin",
    severity: "high",
    note: "Severe myopathy risk: Strong CYP3A4 inhibition elevates atorvastatin plasma concentration, raising rhabdomyolysis risk.",
  },
  {
    drug_a: "atorvastatin",
    drug_b: "gemfibrozil",
    severity: "high",
    note: "Elevated statin toxicity: Concomitant fibrate and statin therapy markedly increases risk of severe myopathy.",
  },
  {
    drug_a: "ciprofloxacin",
    drug_b: "theophylline",
    severity: "high",
    note: "Theophylline toxicity: Ciprofloxacin inhibits hepatic CYP1A2, elevating theophylline levels and seizure risk.",
  },
  {
    drug_a: "methotrexate",
    drug_b: "ibuprofen",
    severity: "high",
    note: "Severe toxicity: NSAIDs decrease renal clearance of methotrexate, causing severe bone marrow and gastrointestinal toxicity.",
  },
  {
    drug_a: "amlodipine",
    drug_b: "simvastatin",
    severity: "moderate",
    note: "Statin accumulation: Amlodipine increases simvastatin exposure; standard practice limits simvastatin to 20 mg daily.",
  },
];

export const TEST_CONDITION_MAP: TestConditionMap[] = [
  { test_pattern: "hba1c|glucose", condition_canonical: "Type 2 Diabetes Mellitus" },
  { test_pattern: "lipid|cholesterol|ldl|triglyceride", condition_canonical: "Hyperlipidemia" },
  { test_pattern: "creatinine|egfr", condition_canonical: "Chronic Kidney Disease" },
  { test_pattern: "tsh|free t4", condition_canonical: "Hypothyroidism" },
];
