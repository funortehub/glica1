
import React, { useMemo, useState } from 'react';
import type { HistoryEntry, AdjustmentReportData, RecommendedInsulin, Meal, PatientData, Adjustment, PatientHandoutData } from '../types';
import { ArrowLeft, Bot, Shield, FileText, Repeat, BrainCircuit, BookCheck, Droplets, Activity, LineChart, Utensils, Sun, Moon, Save, CheckCircle, FileSignature, Loader2 } from 'lucide-react';
import { generatePatientHandout } from '../services/geminiService';

interface AdjustmentReportScreenProps {
    historyEntry: HistoryEntry;
    adjustmentReportData: AdjustmentReportData;
    onBack: () => void;
    onSave: () => void;
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

const SaveAdjustmentForm: React.FC<{ onSave: () => void }> = ({ onSave }) => {
    const [isSaved, setIsSaved] = useState(false);

    const handleSave = () => {
        onSave();
        setIsSaved(true);
    };

    if (isSaved) {
        return (
            <div className="flex items-center justify-center text-center p-4 bg-success/10 text-success rounded-xl">
                <CheckCircle size={20} className="mr-2"/>
                <span className="font-semibold">Ajuste salvo no histórico!</span>
            </div>
        );
    }

    return (
        <div className="bg-card-light dark:bg-card-dark p-4 rounded-xl shadow-soft space-y-4">
             <h3 className="text-md font-semibold text-text-primary-light dark:text-text-primary-dark text-center">Finalizar Reavaliação</h3>
            <button onClick={handleSave} className="w-full flex items-center justify-center space-x-2 bg-primary dark:bg-primary-dark text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:opacity-90 transition-colors">
                <Save size={20} />
                <span>Salvar Ajuste no Histórico</span>
            </button>
        </div>
    );
};

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
    
    const width = 288;
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
    
    const timeLabels = Array.from({ length: 13 }, (_, i) => i * 2);
  
    return (
        <div className="w-full overflow-x-auto pb-2">
            <svg width={width} height={height + 25} aria-labelledby="chart-title" role="img" style={{ minWidth: '288px' }}>
                <title id="chart-title">Gráfico de Ação das Insulinas Ajustado</title>
                <defs><clipPath id="chart-area-adj"><rect x="0" y="0" width={width} height={height + 25} /></clipPath></defs>
                <g clipPath="url(#chart-area-adj)">
                    <line x1="0" y1={baselineY} x2={width} y2={baselineY} stroke="currentColor" strokeDasharray="2" strokeOpacity="0.3" />
                    {curves}
                    {meals.map(meal => { 
                        const mealTime = timeToHours(meal.time);
                        return <foreignObject key={`meal-${meal.id}`} x={mealTime * 12 - 8} y={baselineY - 22} width="16" height="16"><Utensils size={16} className="text-text-secondary-light dark:text-text-secondary-dark" /></foreignObject>;
                    })}
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
                <div className="flex items-center"><Utensils size={14} className="mr-1.5 text-text-secondary"/>Refeição</div>
            </div>
        </div>
    );
};

const AdjustmentReportScreen: React.FC<AdjustmentReportScreenProps> = ({ historyEntry, adjustmentReportData, onBack, onSave }) => {
    const { patient } = historyEntry;
    const { goalClassification, situationAnalysis, adjustedConduct, monitoringPlan, nextGoals } = adjustmentReportData;
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const generatePdfHtml = (patient: PatientData, conduct: AdjustmentReportData['adjustedConduct'], handout: PatientHandoutData): string => {
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
        setIsGeneratingPdf(true);
        try {
            const handoutData = await generatePatientHandout(patient, adjustedConduct);
            const htmlContent = generatePdfHtml(patient, adjustedConduct, handoutData);
            
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
                <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mx-auto text-center">Relatório de Ajuste</h1>
            </header>
            
            <div className="space-y-4">
                <InfoCard icon={FileText} title="Análise da Situação Atual" colorClass="text-primary">
                    <p>{situationAnalysis}</p>
                    <p className={`font-semibold ${goalClassification.toLowerCase().includes("fora") ? 'text-danger' : 'text-success'}`}>{goalClassification}</p>
                </InfoCard>

                <div className="p-4 rounded-xl bg-primary/10 dark:bg-primary-dark/20 border-l-4 border-primary dark:border-primary-dark">
                    <div className="flex items-center mb-3">
                        <Droplets size={20} className="text-primary dark:text-primary-dark" />
                        <h3 className="ml-2 text-md font-semibold text-text-primary-light dark:text-text-primary-dark">Conduta de Ajuste Sugerida</h3>
                    </div>
                     <div className="text-sm text-text-primary-light dark:text-text-primary-dark space-y-2 font-medium">
                        <p><strong>Insulina NPH:</strong> {adjustedConduct.nphDoseText}</p>
                        <p><strong>Insulina Regular:</strong> {adjustedConduct.regularDosePlanText}</p>
                        <p><strong>Antidiabéticos Orais:</strong> {adjustedConduct.adoManagement}</p>
                    </div>
                </div>
                
                <InfoCard icon={LineChart} title="Gráfico de Ação das Insulinas (Ajustado)" colorClass="text-purple-500">
                    <InsulinChart recommendedInsulins={adjustedConduct.recommendedInsulins} meals={patient.meals} />
                </InfoCard>

                <InfoCard icon={Activity} title="Plano de Monitorização" colorClass="text-green-500">
                   <p>{monitoringPlan}</p>
                </InfoCard>
                
                <InfoCard icon={Repeat} title="Metas para Próxima Reavaliação" colorClass="text-cyan-500">
                    <p>{nextGoals}</p>
                </InfoCard>

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

                <SaveAdjustmentForm onSave={onSave} />
            </div>
        </div>
    );
};

export default AdjustmentReportScreen;
