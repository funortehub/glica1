import React, { useState, useMemo } from 'react';
import type { PatientData, ReportData, RecommendedInsulin, Meal, HistoryEntry, Adjustment, PatientHandoutData } from '../types';
import { ArrowLeft, Droplet, Shield, FileText, Repeat, BrainCircuit, BookCheck, Droplets, Activity, Save, CheckCircle, LineChart, Utensils, Sun, Moon, Stethoscope, Zap, RefreshCw, FileSignature, Loader2 } from 'lucide-react';
import { generatePatientHandout } from '../services/geminiService';


interface ReportScreenProps {
    patientData: PatientData | null;
    reportData: ReportData | null;
    isLoading: boolean;
    error: string | null;
    onBack: () => void;
    onSave: () => void;
    isViewingFromHistory?: boolean;
    onStartReEvaluation: () => void;
    historyEntry: HistoryEntry | { patient: PatientData, report: ReportData };
}

const InfoCard: React.FC<{ icon: React.ElementType, title: string, children: React.ReactNode, colorClass: string }> = ({ icon: Icon, title, children, colorClass }) => (
    <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-soft">
        <div className={`flex items-center mb-3`}>
            <Icon size={20} className={colorClass} />
            <h3 className="ml-2 text-md font-semibold text-text-primary-light dark:text-text-primary-dark">{title}</h3>
        </div>
        <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark space-y-2">
            {children}
        </div>
    </div>
);

interface InsulinChartProps {
  recommendedInsulins: RecommendedInsulin[];
  meals: Meal[];
}

const InsulinChart: React.FC<InsulinChartProps> = ({ recommendedInsulins, meals }) => {

    const timeToHours = (timeStr: string) => {
        const match = timeStr.match(/(\d{2}):(\d{2})/);
        if (!match) return 0;
        return parseInt(match[1], 10) + parseInt(match[2], 10) / 60;
    };
    
    const insulinActions = useMemo(() => {
        return recommendedInsulins.map(insulin => ({
            type: insulin.type,
            dose: insulin.dose,
            time: timeToHours(insulin.schedule)
        })).filter(action => action.dose > 0 && action.time >= 0);
    }, [recommendedInsulins]);


    const kinetics = {
        NPH: { onset: 2, peak: 6, duration: 16, color: '#38bdf8' },
        Regular: { onset: 0.5, peak: 2.5, duration: 5, color: '#f59e0b' }
    };

    if (insulinActions.length === 0) {
        return <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">Nenhuma insulina ativa para exibir no gráfico.</p>;
    }
    
    const width = 288; // 24h * 12px/h
    const height = 100;
    const baselineY = 75;
    const maxDose = Math.max(...insulinActions.map(a => a.dose), 1);

    const curves = insulinActions.flatMap((action, index) => {
        const { peak, duration, color } = kinetics[action.type];
        const { dose, time } = action;
        const peakHeight = (height * 0.6) * (Math.log(dose + 1) / Math.log(maxDose + 1));
        const peakY = baselineY - peakHeight;

        const createCurve = (startTime: number, keySuffix: string) => {
            const startX = startTime * 12;
            const peakX = (startTime + peak) * 12;
            const endX = (startTime + duration) * 12;
            const pathData = `M ${startX},${baselineY} Q ${peakX},${peakY} ${endX},${baselineY}`;
            return <path key={`${index}-${keySuffix}`} d={pathData} stroke={color} strokeWidth="2" fill={color} fillOpacity="0.2" />;
        };
        
        const mainCurve = createCurve(time, 'main');
        const generatedCurves = [mainCurve];

        if (time + duration > 24) {
            const wrappedCurve = createCurve(time - 24, 'wrap');
            generatedCurves.push(wrappedCurve);
        }

        return generatedCurves;
    });

    
    const dayNightIcons = insulinActions.map((action, index) => {
        const startX = action.time * 12;
        if (action.time >= 20 || action.time < 5) {
            return (
                <foreignObject key={`moon-${index}`} x={startX - 8} y={baselineY + 4} width="16" height="16">
                     <Moon size={16} className="text-blue-300" />
                </foreignObject>
            );
        }
        if (action.time >= 5 && action.time < 12) {
             return (
                <foreignObject key={`sun-${index}`} x={startX - 8} y={baselineY + 4} width="16" height="16">
                    <Sun size={16} className="text-yellow-400" />
                </foreignObject>
            );
        }
        return null;
    });

    const timeLabels = Array.from({ length: 13 }, (_, i) => i * 2);
  
    return (
        <div className="w-full overflow-x-auto pb-2">
            <svg width={width} height={height + 25} aria-labelledby="chart-title" role="img" style={{ minWidth: '288px' }}>
                <title id="chart-title">Gráfico de Ação das Insulinas</title>
                <defs>
                    <clipPath id="chart-area">
                        <rect x="0" y="0" width={width} height={height + 25} />
                    </clipPath>
                </defs>
                <g clipPath="url(#chart-area)">
                    <line x1="0" y1={baselineY} x2={width} y2={baselineY} stroke="currentColor" strokeDasharray="2" strokeOpacity="0.3" />
                    {curves}
                    {meals.map(meal => { 
                        const mealTime = timeToHours(meal.time);
                        return (
                            <foreignObject key={`meal-${meal.id}`} x={mealTime * 12 - 8} y={baselineY - 22} width="16" height="16">
                                <Utensils size={16} className="text-text-secondary-light dark:text-text-secondary-dark" />
                            </foreignObject>
                        );
                    })}
                    {dayNightIcons}
                    {timeLabels.map(hour => (
                        <g key={hour} transform={`translate(${hour * 12}, ${baselineY})`}>
                            <line y2="5" stroke="currentColor" strokeOpacity="0.5" />
                            <text y="18" fill="currentColor" fontSize="8" textAnchor="middle">{hour}h</text>
                        </g>
                    ))}
                </g>
            </svg>
            <div className="flex justify-center items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-1.5" style={{backgroundColor: kinetics.NPH.color}}></div>NPH</div>
                <div className="flex items-center"><div className="w-3 h-3 rounded-full mr-1.5" style={{backgroundColor: kinetics.Regular.color}}></div>Regular</div>
                <div className="flex items-center"><Sun size={14} className="mr-1 text-yellow-400"/>Dia</div>
                <div className="flex items-center"><Moon size={14} className="mr-1 text-blue-300"/>Noite</div>
                <div className="flex items-center"><Utensils size={14} className="mr-1.5 text-text-secondary"/>Refeição</div>
            </div>
        </div>
    );
};

const ReEvaluationTrigger: React.FC<{ onStart: () => void; }> = ({ onStart }) => {
    return (
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-soft">
            <h3 className="flex items-center text-md font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
                <Stethoscope size={20} className="mr-2 text-purple-500" />
                Acompanhamento Contínuo
            </h3>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
                Inicie uma nova reavaliação para ajustar o plano de manejo, registrar novas medições ou fazer alterações na terapia atual.
            </p>
            <button onClick={onStart} className="w-full flex items-center justify-center space-x-2 bg-purple-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:opacity-90 transition-colors">
                <RefreshCw size={20} />
                <span>Novo Manejo</span>
            </button>
        </div>
    );
};

const AdjustmentTimeline: React.FC<{ adjustments: Adjustment[], meals: Meal[] }> = ({ adjustments, meals }) => (
    <div className="space-y-4">
        {adjustments.slice().reverse().map((adj, index) => (
            <div key={adj.adjustedAt} className="border-t border-border-light dark:border-border-dark pt-4">
                <p className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Ajuste #{adjustments.length - index} - {new Date(adj.adjustedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                </p>
                 <p className={`font-semibold text-xs mb-2 ${adj.adjustmentReport.goalClassification.toLowerCase().includes("fora") ? 'text-danger' : 'text-success'}`}>{adj.adjustmentReport.goalClassification}</p>
                 <div className="text-xs text-text-primary-light dark:text-text-primary-dark space-y-1 mt-2 pl-2 border-l-2 border-primary/50">
                    <p><strong>NPH:</strong> {adj.adjustmentReport.adjustedConduct.nphDoseText}</p>
                    {/* FIX: Corrected property name from 'regularDoseText' to 'regularDosePlanText' to match type definition */}
                    <p><strong>Regular:</strong> {adj.adjustmentReport.adjustedConduct.regularDosePlanText}</p>
                 </div>
            </div>
        ))}
    </div>
);

const ReportScreen: React.FC<ReportScreenProps> = ({ patientData, reportData, isLoading, error, onBack, onSave, isViewingFromHistory = false, onStartReEvaluation, historyEntry }) => {
    
    const [isSaved, setIsSaved] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const isAlertReport = reportData?.goalClassification === "Insulinoterapia Não Indicada no Momento";

    const handleSaveClick = () => {
        onSave();
        setIsSaved(true);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Droplet size={48} className="text-primary animate-bounce" />
                <h2 className="text-xl font-bold mt-4">Analisando dados...</h2>
                <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">O assistente clínico está processando as informações para gerar a melhor conduta baseada em evidências. Isso pode levar alguns segundos.</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-6 overflow-hidden">
                    <div className="bg-primary h-2.5 rounded-full animate-progress-indeterminate"></div>
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <Shield size={48} className="text-danger" />
                <h2 className="text-xl font-bold mt-4 text-danger">Erro ao Gerar Relatório</h2>
                <p className="text-text-secondary-light dark:text-text-secondary-dark mt-2">{error}</p>
                <button onClick={onBack} className="mt-6 bg-primary text-white font-bold py-2 px-6 rounded-lg">Voltar</button>
            </div>
        );
    }

    if (!reportData || !patientData) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                 <p>Nenhum relatório para exibir.</p>
                 <button onClick={onBack} className="mt-6 bg-primary text-white font-bold py-2 px-6 rounded-lg">Iniciar Cálculo</button>
            </div>
        );
    }

    const { 
        clinicalSummary, goalClassification, calculations, finalConduct, 
        identifiedRisks, complementaryConducts, followUpPlan, guidelineReference 
    } = reportData;

    const showReEvaluationTrigger = isViewingFromHistory && !isAlertReport;

    const getConduct = () => {
        const adjustments = 'adjustments' in historyEntry ? historyEntry.adjustments : undefined;
        const lastAdjustment = adjustments?.[adjustments.length - 1];
        const lastAdjConduct = lastAdjustment?.adjustmentReport.adjustedConduct;
        return lastAdjConduct ? lastAdjConduct : reportData.finalConduct;
    };

    const generatePdfHtml = (patient: PatientData, conduct: ReportData['finalConduct'] | Adjustment['adjustmentReport']['adjustedConduct'], handout: PatientHandoutData): string => {
        const today = new Date().toLocaleDateString('pt-BR');
        const dob = patient.dob ? new Date(patient.dob).toLocaleDateString('pt-BR') : 'N/A';

        const formatTextForPdf = (text: string): string => {
            if (!text) return '';
            // Replace markdown bold (*text*) with HTML strong tag
            const formattedText = text.replace(/\*([^\*]+)\*/g, '<strong>$1</strong>');

            const lines = formattedText.split('\n');
            let html = '';
            let listOpen = false;
            for (const line of lines) {
                const trimmedLine = line.trim();
                // Check for list items AFTER bolding is done
                if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                    if (!listOpen) {
                        html += '<ul class="list-disc list-inside space-y-1">';
                        listOpen = true;
                    }
                    html += `<li>${trimmedLine.substring(2)}</li>`;
                } else {
                    if (listOpen) {
                        html += '</ul>';
                        listOpen = false;
                    }
                    if(trimmedLine) {
                        html += `<p class="mb-2">${trimmedLine}</p>`;
                    }
                }
            }
            if (listOpen) {
                html += '</ul>';
            }
            return html;
        };

        const insulinScheduleHtml = [...conduct.recommendedInsulins]
            .sort((a, b) => {
                const timeA = a.schedule.match(/(\d{2}):(\d{2})/);
                const timeB = b.schedule.match(/(\d{2}):(\d{2})/);
                if (timeA && timeB) {
                    return timeA[0].localeCompare(timeB[0]);
                }
                return a.schedule.localeCompare(b.schedule);
            })
            .map(ins => `
                <tr class="border-b">
                    <td class="p-2 font-semibold">${ins.type}</td>
                    <td class="p-2">${ins.dose} unidades</td>
                    <td class="p-2">${ins.schedule}</td>
                </tr>
            `).join('');

        return `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Plano de Cuidado - ${patient.name}</title>
                <script src="https://cdn.tailwindcss.com"></script>
            </head>
            <body class="font-sans p-8 bg-gray-50">
                <div class="max-w-4xl mx-auto bg-white p-10 rounded-lg shadow-lg">
                    <header class="text-center border-b pb-4 mb-6">
                        <h1 class="text-3xl font-bold text-blue-700">Plano de Cuidado do Paciente</h1>
                    </header>
                    
                    <section class="mb-6 grid grid-cols-3 gap-4 text-sm">
                        <div><strong>Paciente:</strong> ${patient.name}</div>
                        <div><strong>Nascimento:</strong> ${dob}</div>
                        <div><strong>Data:</strong> ${today}</div>
                    </section>

                    <section class="mb-8">
                        <h2 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Seu Tratamento com Insulina</h2>
                        <table class="w-full text-left table-auto">
                            <thead>
                                <tr class="bg-gray-100">
                                    <th class="p-2">Insulina</th>
                                    <th class="p-2">Dose</th>
                                    <th class="p-2">Horário / Refeição</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${insulinScheduleHtml || '<tr><td colspan="3" class="p-2">Nenhuma insulina prescrita.</td></tr>'}
                            </tbody>
                        </table>
                    </section>

                    <section class="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h2 class="text-xl font-semibold text-gray-800 mb-4">Como Guardar sua Insulina</h2>
                        <div class="prose prose-sm max-w-none text-gray-700">
                            ${formatTextForPdf(handout.storageInstructions)}
                        </div>
                    </section>

                    <section class="mb-8">
                        <h2 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Como Aplicar sua Insulina</h2>
                        <div class="prose prose-sm max-w-none text-gray-700">
                            ${formatTextForPdf(handout.applicationInstructions)}
                        </div>
                    </section>

                     <section class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div class="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
                            <h3 class="font-semibold text-lg text-yellow-800 mb-2">O que fazer se a Glicose Baixar (Hipoglicemia)</h3>
                            <div class="prose prose-sm max-w-none text-gray-700">
                                ${formatTextForPdf(handout.hypoglycemiaManagement)}
                            </div>
                        </div>
                         <div class="bg-red-50 border border-red-300 p-4 rounded-lg">
                            <h3 class="font-semibold text-lg text-red-800 mb-2">O que fazer se a Glicose Subir (Hiperglicemia)</h3>
                            <div class="prose prose-sm max-w-none text-gray-700">
                                ${formatTextForPdf(handout.hyperglycemiaManagement)}
                            </div>
                        </div>
                    </section>

                    <section class="mb-8">
                        <h2 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Recomendações Gerais</h2>
                        <div class="prose prose-sm max-w-none text-gray-700">
                            ${formatTextForPdf(handout.generalRecommendations)}
                        </div>
                    </section>

                    <footer class="text-center text-xs text-gray-500 pt-4 mt-6 border-t">
                        <p>Este é um documento de apoio em caso de dúvidas procure uma opinião médica!</p>
                    </footer>
                </div>
                 <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;
    };

    const handleGeneratePdf = async () => {
        if (!patientData || !reportData) return;
        setIsGeneratingPdf(true);
        try {
            const conduct = getConduct();
            const handoutData = await generatePatientHandout(patientData, conduct);
            const htmlContent = generatePdfHtml(patientData, conduct, handoutData);
            
            const pdfWindow = window.open("", "_blank");
            if (pdfWindow) {
                pdfWindow.document.open();
                pdfWindow.document.write(htmlContent);
                pdfWindow.document.close();
            } else {
                alert("Por favor, habilite pop-ups para visualizar o PDF.");
            }
        } catch (e) {
            console.error(e);
            alert("Não foi possível gerar as orientações para o paciente. Tente novamente.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };


    return (
        <div className="p-4 animate-fade-in">
             <header className="flex items-center mb-6 relative">
                <button type="button" onClick={onBack} className="p-2 absolute left-0"><ArrowLeft size={24} /></button>
                <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mx-auto text-center">Relatório de Análise</h1>
            </header>
            
            <div className="space-y-4">
                <InfoCard icon={FileText} title="Resumo Clínico" colorClass="text-primary">
                    {'savedAt' in historyEntry && (
                        <div className="bg-primary/10 dark:bg-primary-dark/20 p-2 rounded-md text-center text-xs font-semibold text-primary dark:text-primary-dark mb-3">
                            Primeiro registro em: {new Date(historyEntry.savedAt).toLocaleDateString('pt-BR')}
                        </div>
                    )}
                    <p>{clinicalSummary}</p>
                    <p className={`font-semibold ${goalClassification.toLowerCase().includes("fora") || goalClassification.toLowerCase().includes("não indicada") ? 'text-danger' : 'text-success'}`}>{goalClassification}</p>
                </InfoCard>

                {!isAlertReport && (
                    <>
                        <InfoCard icon={BrainCircuit} title="Cálculos e Raciocínio (Plano Inicial)" colorClass="text-indigo-500">
                            <p><strong>Meta HbA1c:</strong> {calculations.targetHbA1c}</p>
                            <p><strong>Dose NPH Inicial:</strong> {calculations.nphInitialDose}</p>
                            <p><strong>Ajuste NPH Sugerido:</strong> {calculations.nphAdjustment}</p>
                            <p><strong>Dose Regular Inicial:</strong> {calculations.regularInitialDose}</p>
                        </InfoCard>

                        <div className="p-4 rounded-xl bg-primary/10 dark:bg-primary-dark/20 border-l-4 border-primary dark:border-primary-dark">
                            <div className="flex items-center mb-3">
                                <Droplets size={20} className="text-primary dark:text-primary-dark" />
                                <h3 className="ml-2 text-md font-semibold text-text-primary-light dark:text-text-primary-dark">Conduta Inicial Sugerida</h3>
                            </div>
                             <div className="text-sm text-text-primary-light dark:text-text-primary-dark space-y-2 font-medium">
                                <p><strong>Insulina NPH:</strong> {finalConduct.nphDoseText}</p>
                                <p><strong>Insulina Regular:</strong> {finalConduct.regularDosePlanText}</p>
                                <p><strong>Antidiabéticos Orais:</strong> {finalConduct.adoManagement}</p>
                            </div>
                        </div>
                        
                        <InfoCard icon={LineChart} title="Gráfico de Ação das Insulinas (Plano Inicial)" colorClass="text-purple-500">
                            <InsulinChart recommendedInsulins={finalConduct.recommendedInsulins} meals={patientData.meals} />
                        </InfoCard>
                    </>
                )}
                
                {isViewingFromHistory && 'adjustments' in historyEntry && historyEntry.adjustments && historyEntry.adjustments.length > 0 && (
                     <InfoCard icon={RefreshCw} title="Histórico de Ajustes" colorClass="text-purple-500">
                        <AdjustmentTimeline adjustments={historyEntry.adjustments} meals={patientData.meals}/>
                    </InfoCard>
                )}


                <InfoCard icon={Shield} title="Riscos Identificados" colorClass="text-warning">
                   <ul className="list-disc list-inside">
                        {identifiedRisks.map((risk, i) => <li key={i}>{risk}</li>)}
                    </ul>
                </InfoCard>

                <InfoCard icon={Activity} title="Condutas Complementares" colorClass="text-green-500">
                    <ul className="list-disc list-inside">
                        {complementaryConducts.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                </InfoCard>
                
                <InfoCard icon={Repeat} title="Plano de Seguimento" colorClass="text-cyan-500">
                    <p>{followUpPlan}</p>
                </InfoCard>

                <InfoCard icon={BookCheck} title="Referência da Diretriz" colorClass="text-gray-500">
                    <p className="italic">"{guidelineReference}"</p>
                </InfoCard>
                
                {!isAlertReport && (
                    <button
                        onClick={handleGeneratePdf}
                        disabled={isGeneratingPdf}
                        className="w-full flex items-center justify-center space-x-2 bg-green-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:opacity-90 transition-colors disabled:opacity-50"
                    >
                        {isGeneratingPdf ? (
                            <><Loader2 size={20} className="animate-spin" /><span>Gerando Orientações...</span></>
                        ) : (
                            <><FileSignature size={20} /><span>Gerar PDF para Paciente</span></>
                        )}
                    </button>
                )}


                {showReEvaluationTrigger && (
                    <ReEvaluationTrigger onStart={onStartReEvaluation} />
                )}

                {!isViewingFromHistory && !isAlertReport && (
                    <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-soft">
                        {isSaved ? (
                            <div className="flex items-center justify-center text-center p-2 bg-success/10 text-success rounded-xl">
                                <CheckCircle size={20} className="mr-2"/>
                                <span className="font-semibold">Salvo no histórico com sucesso!</span>
                            </div>
                        ) : (
                            <button onClick={handleSaveClick} className="w-full flex items-center justify-center space-x-2 bg-primary dark:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:opacity-90 transition-colors">
                                <Save size={20} />
                                <span>Salvar no Histórico</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportScreen;