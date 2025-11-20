
import React, { useState, useEffect, useCallback } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import CalculatorScreen from './screens/CalculatorScreen';
import ReportScreen from './screens/ReportScreen';
import HistoryScreen from './screens/HistoryScreen';
import GuideScreen from './screens/GuideScreen';
import HomeScreen from './screens/HomeScreen';
import NewPatientScreen from './screens/NewPatientScreen';
import ReEvaluationScreen from './screens/ReEvaluationScreen';
import AdjustmentReportScreen from './screens/AdjustmentReportScreen';
import type { PatientData, ReportData, HistoryEntry, Screen, AdjustmentReportData, FollowUpData, Adjustment } from './types';
import { LayoutDashboard, History, BookOpen, Lightbulb, UserPlus } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, arrayUnion, query, orderBy, limit, where, deleteDoc } from 'firebase/firestore';


// --- START FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyC6MCXqH2TXWzahesHtyk7JeB-gHshiWFc",
  authDomain: "carcarahealthplus-4ef7b.firebaseapp.com",
  projectId: "carcarahealthplus-4ef7b",
  storageBucket: "carcarahealthplus-4ef7b.firebasestorage.app",
  messagingSenderId: "149920030952",
  appId: "1:149920030952:web:e19ea0ba0b0f400d18295d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const historyCollection = collection(db, 'glica1');

const getHistory = async (): Promise<HistoryEntry[]> => {
    const q = query(historyCollection, orderBy('savedAt', 'desc'), limit(50));
    const historySnapshot = await getDocs(q);
    const historyList = historySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    } as HistoryEntry));
    return historyList;
};

const saveHistoryEntry = async (entry: Omit<HistoryEntry, 'id'>): Promise<string> => {
    const docRef = await addDoc(historyCollection, entry);
    return docRef.id;
};

const updateHistoryEntryWithAdjustment = async (entryId: string, adjustment: Adjustment) => {
    if (!entryId) {
        console.error("No entry ID provided for adjustment update");
        return;
    }
    const entryDoc = doc(db, 'glica1', entryId);
    await updateDoc(entryDoc, {
        adjustments: arrayUnion(adjustment)
    });
};

const patientExists = async (patientName: string): Promise<boolean> => {
    const q = query(historyCollection, where("patient.name", "==", patientName));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
};
// --- END FIREBASE SETUP ---


const MainApp: React.FC = () => {
    const [screen, setScreen] = useState<Screen>('home');
    const [initialPatientInfo, setInitialPatientInfo] = useState<{ name: string; dob: string } | null>(null);
    const [patientData, setPatientData] = useState<PatientData | null>(null);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    const [reEvalData, setReEvalData] = useState<HistoryEntry | null>(null);
    const [adjustmentReportData, setAdjustmentReportData] = useState<AdjustmentReportData | null>(null);
    const [followUpDataSource, setFollowUpDataSource] = useState<FollowUpData | null>(null);
    const [isFastMode, setIsFastMode] = useState(false);
    const { theme } = useTheme();

    useEffect(() => {
        const loadHistory = async () => {
            try {
                const firestoreHistory = await getHistory();
                setHistory(firestoreHistory);
            } catch (e) {
                console.error("Failed to load history from Firestore", e);
                setError("Não foi possível carregar o histórico de pacientes.");
            }
        };
        loadHistory();
    }, []);
    
    useEffect(() => {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const handleNewPatientContinue = (name: string, dob: string) => {
        setInitialPatientInfo({ name, dob });
        setScreen('calculator');
    };

    const handleGenerateReport = useCallback(async (data: PatientData, fastMode: boolean) => {
        // No "Modo Rápido", o sistema assume que o paciente já falhou a terapia oral e precisa de insulina,
        // então a verificação de indicação de insulinoterapia é pulada.
        if (!fastMode) {
            const isUsingAntidiabetic = data.medications.some(med => 
                ['Metformina', 'Gliclazida', 'Glibenclamida', 'Dapagliflozina', 'Outro ADO'].includes(med)
            );
        
            // Se HbA1c < 7.5, ou se 7.5 <= HbA1c <= 9.0 E o paciente não usa ADO (e não tem sintomas), a diretriz é iniciar/otimizar ADO.
            if ((data.hba1c < 7.5 || (!isUsingAntidiabetic && data.hba1c <= 9.0)) && data.clinicalSymptoms.length === 0) {
                 setIsLoading(true);
                 setError(null);
                 setPatientData(data);
                 setIsViewingHistory(false);
                 setReEvalData(null);
                 setAdjustmentReportData(null);
                 setScreen('report');
        
                 const alertReport: ReportData = {
                    goalClassification: "Insulinoterapia Não Indicada no Momento",
                    clinicalSummary: `Paciente com HbA1c de ${data.hba1c}%. Com base nos dados fornecidos e nas diretrizes atuais, a insulinoterapia não é a primeira linha de tratamento.`,
                    calculations: {
                        targetHbA1c: "N/A", nphInitialDose: "N/A", nphAdjustment: "N/A", regularInitialDose: "N/A",
                    },
                    finalConduct: {
                        recommendedInsulins: [], nphDoseText: "Não aplicável.", regularDosePlanText: "Não aplicável.", adoManagement: "Otimizar terapia oral.",
                    },
                    identifiedRisks: ["Iniciar insulina neste momento pode ser inadequado e não segue as diretrizes para este perfil de paciente."],
                    complementaryConducts: [
                        "Recomenda-se iniciar ou otimizar a terapia com antidiabéticos orais.",
                        "A combinação de Metformina com outro antidiabético oral (ex: Sulfonilureia, iSGLT2) deve ser tentada por pelo menos 3 meses antes de reavaliar a necessidade de insulina, salvo contraindicações.",
                        "Focar em mudanças de estilo de vida: dieta e atividade física."
                    ],
                    followUpPlan: "Reavaliar o controle glicêmico em 3 meses após otimização da terapia oral.",
                    guidelineReference: "Diretriz SBD 2024 / PCDT DM2-SUS: A insulinoterapia é indicada em casos de falha da terapia oral otimizada, ou em situações específicas como HbA1c > 9%, descompensação aguda ou sintomas catabólicos."
                 };
        
                 setReportData(alertReport);
                 setIsLoading(false);
                 return;
            }
        }
    
        setIsLoading(true);
        setError(null);
        setPatientData(data);
        setIsViewingHistory(false);
        setReEvalData(null);
        setAdjustmentReportData(null);
        setScreen('report');
        try {
            const { generateInsulinReport } = await import('./services/geminiService');
            const report = await generateInsulinReport(data, fastMode);
            setReportData(report);
        } catch (e) {
            console.error(e);
            setError('Falha ao gerar o relatório. O assistente pode estar sobrecarregado. Tente novamente em alguns instantes.');
            setReportData(null);
        } finally {
            setIsLoading(false);
        }
    }, []);
    
    const handleSaveToHistory = useCallback(async () => {
        if (!patientData || !reportData) return;

        const newHistoryEntry: Omit<HistoryEntry, 'id'> = { 
            patient: patientData, 
            report: reportData,
            savedAt: new Date().toISOString(),
            adjustments: [],
        };
        try {
            const newId = await saveHistoryEntry(newHistoryEntry);
            const entryWithId: HistoryEntry = { ...newHistoryEntry, id: newId };
            setHistory(prevHistory => [entryWithId, ...prevHistory]);
        } catch(e) {
            console.error("Failed to save history to Firestore", e);
            setError("Falha ao salvar paciente no banco de dados.");
        }
    }, [patientData, reportData, history]);


    const viewHistoryItem = (item: HistoryEntry) => {
        setPatientData(item.patient);
        setReportData(item.report);
        setReEvalData(item);
        setIsLoading(false);
        setError(null);
        setIsViewingHistory(true);
        setAdjustmentReportData(null);
        setScreen('report');
    };
    
    const handleStartReEvaluation = (item: HistoryEntry) => {
        setReEvalData(item);
        setScreen('re-evaluation');
    };

    const handlePlanGenerated = (plan: AdjustmentReportData, sourceData: FollowUpData) => {
        setAdjustmentReportData(plan);
        setFollowUpDataSource(sourceData);
        setScreen('adjustment-report');
    };

    const handleSaveAdjustment = useCallback(async () => {
        if (!reEvalData || !reEvalData.id || !adjustmentReportData || !followUpDataSource) return;

        const newAdjustment: Adjustment = {
            adjustedAt: new Date().toISOString(),
            adjustmentReport: adjustmentReportData,
            followUpData: followUpDataSource,
        };
        
        try {
            await updateHistoryEntryWithAdjustment(reEvalData.id, newAdjustment);

            const updatedHistory = history.map(entry => {
                if (entry.id === reEvalData.id) {
                    return {
                        ...entry,
                        adjustments: [...(entry.adjustments || []), newAdjustment],
                    };
                }
                return entry;
            });
    
            setHistory(updatedHistory);
            
            const updatedEntry = updatedHistory.find(e => e.id === reEvalData.id);
            if (updatedEntry) {
                viewHistoryItem(updatedEntry);
            } else {
                setScreen('history');
            }
        } catch(e) {
            console.error("Failed to save adjustment to Firestore", e);
            setError("Falha ao salvar ajuste no banco de dados.");
        }
    }, [history, reEvalData, adjustmentReportData, followUpDataSource]);


    const handleBackToCalculator = () => {
        setIsViewingHistory(false);
        setReEvalData(null);
        setAdjustmentReportData(null);
        setScreen('calculator');
    }

    const addTestPatient = useCallback(async () => {
        const testPatientEntryData: Omit<HistoryEntry, 'id' | 'savedAt'> = {
          patient: {
            name: 'Paciente Teste Fora da Meta', dob: '1969-01-15', age: 55, sex: 'masculino',
            weight: 95, height: 1.75, imc: 31.02, isFrail: false,
            comorbidities: ['HAS', 'Dislipidemia', 'Obesidade'], medications: ['Metformina', 'Losartana'],
            creatinine: 1.1, tfg: 75, albuminuria: 50, hba1c: 9.8, fastingGlucose: 240,
            prePrandialGlucose: 260, postPrandialGlucose: 310, postPrandialMealIds: [2],
            hypoglycemiaEpisodes: 'raro', clinicalSymptoms: ['Poliúria', 'Perda Ponderal'], clinicalSituation: [],
            currentInsulins: [{ id: 1, type: 'Nenhuma', dose: 0, schedule: '' }],
            meals: [
              { id: 1, name: 'Café da Manhã', time: '07:00' }, { id: 2, name: 'Almoço', time: '12:00' },
              { id: 3, name: 'Jantar', time: '19:00' },
            ],
          },
          report: {
            goalClassification: 'Paciente significativamente FORA DA META glicêmica.',
            clinicalSummary: 'Paciente de 55 anos, com DM2, obesidade e HAS, apresentando mau controle glicêmico (HbA1c 9.8%) e sintomas cardinais, indicando necessidade de insulinoterapia.',
            calculations: { targetHbA1c: '< 7.0%', nphInitialDose: '0.2 U/kg -> 19U de NPH ao deitar.', nphAdjustment: 'Ajustar +2U a cada 3-7 dias se GJ > 130 mg/dL.', regularInitialDose: 'Considerar se glicemia pós-prandial persistir elevada após otimização da basal.' },
            finalConduct: {
              recommendedInsulins: [{ type: 'NPH', dose: 19, schedule: 'Noite (22:00)' }],
              nphDoseText: '19 unidades de NPH ao deitar (22:00).',
              regularDosePlanText: 'Não indicada no momento. Reavaliar após ajuste da insulina basal.',
              adoManagement: 'Manter Metformina. Suspender sulfonilureia, se em uso.',
            },
            identifiedRisks: ['Risco de hipoglicemia noturna (monitorar)'],
            complementaryConducts: ['Educação em diabetes', 'Monitorização da glicemia capilar (jejum)'],
            followUpPlan: 'Reavaliar em 7 a 14 dias para ajuste de dose.',
            guidelineReference: 'Diretriz SBD 2024: Pacientes com HbA1c > 9% e sintomas catabólicos devem iniciar insulinoterapia.',
          },
          adjustments: [],
        };
        
        try {
            const alreadyExists = await patientExists(testPatientEntryData.patient.name);
            if (!alreadyExists) {
                const newEntry: Omit<HistoryEntry, 'id'> = {
                    ...testPatientEntryData,
                    savedAt: new Date().toISOString(),
                };
                const newId = await saveHistoryEntry(newEntry);
                const entryWithId: HistoryEntry = { ...newEntry, id: newId };
                setHistory(prevHistory => [entryWithId, ...prevHistory]);
            }
        } catch (e) {
            console.error("Failed to add test patient", e);
            setError("Falha ao adicionar paciente teste.");
        }
    }, [history]);

    const handleStartApp = (fastMode: boolean) => {
        setIsFastMode(fastMode);
        setScreen('new-patient');
    };

    const handleDeleteHistory = async (entryId: string) => {
        try {
            if (!entryId) return;
            await deleteDoc(doc(db, 'glica1', entryId));
            setHistory(prevHistory => prevHistory.filter(item => item.id !== entryId));
        } catch (e) {
            console.error("Failed to delete entry", e);
            setError("Falha ao apagar o registro do histórico.");
        }
    };

    const renderContent = () => {
        switch (screen) {
            case 'new-patient':
                return <NewPatientScreen onContinue={handleNewPatientContinue} onBack={() => setScreen('home')} />;
            case 'calculator':
                return <CalculatorScreen onSubmit={handleGenerateReport} initialInfo={initialPatientInfo} isFastMode={isFastMode} />;
            case 'report':
                const currentEntry = { patient: patientData!, report: reportData! };
                return <ReportScreen 
                            patientData={patientData} 
                            reportData={reportData} 
                            isLoading={isLoading} 
                            error={error} 
                            onBack={handleBackToCalculator}
                            onSave={handleSaveToHistory}
                            isViewingFromHistory={isViewingHistory}
                            onStartReEvaluation={() => reEvalData && handleStartReEvaluation(reEvalData)}
                            historyEntry={reEvalData || currentEntry}
                        />;
            case 'history':
                return <HistoryScreen history={history} onView={viewHistoryItem} onAddTestPatient={addTestPatient} onDelete={handleDeleteHistory} />;
            case 'guide':
                return <GuideScreen />;
            case 're-evaluation':
                return reEvalData ? (
                    <ReEvaluationScreen 
                        historyEntry={reEvalData} 
                        onBack={() => viewHistoryItem(reEvalData)} 
                        onPlanGenerated={handlePlanGenerated}
                        isFastMode={isFastMode}
                    />
                ) : null;
            case 'adjustment-report':
                 return reEvalData && adjustmentReportData ? (
                    <AdjustmentReportScreen
                        historyEntry={reEvalData}
                        adjustmentReportData={adjustmentReportData}
                        onBack={() => viewHistoryItem(reEvalData)}
                        onSave={handleSaveAdjustment}
                    />
                ) : null;
            case 'home':
            default:
                return <HomeScreen onStart={handleStartApp} />;
        }
    };

    const NavItem: React.FC<{ icon: React.ElementType, label: string, active: boolean, onClick: () => void }> = ({ icon: Icon, label, active, onClick }) => (
        <button onClick={onClick} className={`flex flex-col items-center justify-center space-y-1 w-full text-center px-1 py-2 rounded-lg transition-colors duration-200 ${active ? 'bg-primary/10 text-primary dark:text-primary-dark' : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
            <Icon size={24} />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );

    return (
        <div className="flex flex-col h-screen font-sans text-text-primary-light dark:text-text-primary-dark bg-background-light dark:bg-background-dark">
            <main className="flex-1 overflow-y-auto pb-20">
                {renderContent()}
            </main>
            <nav className="fixed bottom-0 left-0 right-0 bg-card-light dark:bg-card-dark border-t border-border-light dark:border-border-dark shadow-soft z-50">
                <div className="max-w-md mx-auto grid grid-cols-3 gap-2 p-1">
                    <NavItem icon={LayoutDashboard} label="Início" active={screen === 'home'} onClick={() => setScreen('home')} />
                    <NavItem icon={History} label="Histórico" active={screen === 'history'} onClick={() => setScreen('history')} />
                    <NavItem icon={BookOpen} label="Diretriz" active={screen === 'guide'} onClick={() => setScreen('guide')} />
                </div>
            </nav>
        </div>
    );
};

const App: React.FC = () => (
    <ThemeProvider>
        <MainApp />
    </ThemeProvider>
);

export default App;
