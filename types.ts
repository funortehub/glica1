export interface Meal {
  id: number;
  name: string;
  time: string; // "HH:mm" format
}

export interface PatientData {
  age: number;
  sex: 'masculino' | 'feminino';
  weight: number;
  height: number;
  imc: number;
  isFrail: boolean;
  comorbidities: string[];
  medications: string[];
  creatinine: number;
  tfg: number;
  albuminuria: number;
  hba1c: number;
  fastingGlucose: number;
  prePrandialGlucose: number;
  postPrandialGlucose: number;
  postPrandialMealIds: number[];
  hypoglycemiaEpisodes: 'nenhum' | 'raro' | 'frequente';
  clinicalSymptoms: string[];
  clinicalSituation: string[];
  currentInsulins: Array<{
    id: number;
    type: 'Nenhuma' | 'NPH' | 'Regular';
    dose: number;
    schedule: string;
  }>;
  meals: Meal[];
  name: string;
  dob: string;
}

export interface RecommendedInsulin {
  type: 'NPH' | 'Regular';
  dose: number;
  schedule: string; // Ex: "Manhã (07:00)"
}

export interface ReportData {
  clinicalSummary: string;
  goalClassification: string;
  calculations: {
    targetHbA1c: string;
    nphInitialDose: string;
    nphAdjustment: string;
    regularInitialDose: string;
  };
  finalConduct: {
    recommendedInsulins: RecommendedInsulin[];
    nphDoseText: string;
    regularDosePlanText: string;
    adoManagement: string;
  };
  identifiedRisks: string[];
  complementaryConducts: string[];
  followUpPlan: string;
  guidelineReference: string;
}

export interface HyperglycemiaEvent {
  id: number;
  time: string;
  value: number;
}

export interface FollowUpData {
    currentFastingGlucose: number;
    currentHbA1c: number;
    currentPrePrandialGlucose: number;
    currentPostPrandialGlucose: number;
    currentWeight: number;
    highGlucoseMeals: number[];
    hyperglycemiaEvents: HyperglycemiaEvent[];
    newHypoglycemiaEpisodes: 'nenhum' | 'raro' | 'frequente' | 'nao_avaliado';
    hypoglycemiaTimings: string[];
    patientNotes: string;
}

export interface AdjustmentReportData {
  goalClassification: string;
  situationAnalysis: string;
  adjustedConduct: {
    recommendedInsulins: RecommendedInsulin[];
    nphDoseText: string;
    regularDosePlanText: string;
    adoManagement: string;
  };
  monitoringPlan: string;
  nextGoals: string;
}

export interface PatientHandoutData {
  storageInstructions: string;
  applicationInstructions: string;
  hypoglycemiaManagement: string;
  hyperglycemiaManagement: string;
  generalRecommendations: string;
}

export interface Adjustment {
  adjustedAt: string;
  adjustmentReport: AdjustmentReportData;
  followUpData: FollowUpData;
}

export interface HistoryEntry {
  id?: string; // Firestore document ID
  patient: PatientData;
  report: ReportData;
  savedAt: string;
  adjustments?: Adjustment[];
}

export type Screen = 'home' | 'new-patient' | 'calculator' | 'report' | 'history' | 'guide' | 're-evaluation' | 'adjustment-report';