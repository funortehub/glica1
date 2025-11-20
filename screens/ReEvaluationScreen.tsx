

import React, { useState } from 'react';
import type { HistoryEntry, FollowUpData, AdjustmentReportData, HyperglycemiaEvent } from '../types';
import { generateFollowUpPlan } from '../services/geminiService';
import { FormSection, Input, Select, CheckboxGroup } from '../components/FormControls';
import { ArrowLeft, Droplet, Zap, PlusCircle, Trash2 } from 'lucide-react';

interface ReEvaluationScreenProps {
    historyEntry: HistoryEntry;
    onBack: () => void;
    onPlanGenerated: (plan: AdjustmentReportData, sourceData: FollowUpData) => void;
    isFastMode: boolean;
}

const ReEvaluationScreen: React.FC<ReEvaluationScreenProps> = ({ historyEntry, onBack, onPlanGenerated, isFastMode }) => {
    const { patient, report } = historyEntry;

    const [formData, setFormData] = useState<FollowUpData>({
        currentFastingGlucose: 0,
        currentHbA1c: 0,
        currentPrePrandialGlucose: 0,
        currentPostPrandialGlucose: 0,
        currentWeight: patient.weight || 0,
        highGlucoseMeals: [],
        hyperglycemiaEvents: [],
        newHypoglycemiaEpisodes: 'nao_avaliado',
        hypoglycemiaTimings: [],
        patientNotes: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGeneratePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.currentWeight <= 0) {
            setError('O peso atual do paciente é obrigatório.');
            return;
        }
        if (formData.currentFastingGlucose <= 0 && formData.currentHbA1c <= 0) {
            setError('Pelo menos um valor de Glicemia de Jejum ou HbA1c atual é necessário.');
            return;
        }
        setError(null);
        setIsLoading(true);
        try {
            const lastAdjustment = historyEntry.adjustments?.[historyEntry.adjustments.length - 1];
            const lastTherapeuticPlan = lastAdjustment 
                ? { adjustedConduct: lastAdjustment.adjustmentReport.adjustedConduct } 
                : { finalConduct: historyEntry.report.finalConduct };

            const result = await generateFollowUpPlan(
                patient, 
                report, 
                lastTherapeuticPlan, 
                formData, 
                patient.meals,
                historyEntry.adjustments,
                isFastMode
            );
            onPlanGenerated(result, formData);
        } catch (err: any) {
            setError(err.message || 'Falha ao gerar o plano de ajuste.');
        } finally {
            setIsLoading(false);
        }
    };

    const sortedMeals = [...patient.meals].sort((a, b) => a.time.localeCompare(b.time));

    const handleCheckboxChange = (field: keyof Pick<FollowUpData, 'highGlucoseMeals' | 'hypoglycemiaTimings'>) => (selection: string[] | number[]) => {
        setFormData(prev => ({ ...prev, [field]: selection }));
    };
    
    const handleAddHyperglycemia = () => {
        setFormData(prev => ({
            ...prev,
            hyperglycemiaEvents: [
                ...prev.hyperglycemiaEvents,
                { id: Date.now(), time: '12:00', value: 0 }
            ]
        }));
    };

    const handleRemoveHyperglycemia = (id: number) => {
        setFormData(prev => ({
            ...prev,
            hyperglycemiaEvents: prev.hyperglycemiaEvents.filter(event => event.id !== id)
        }));
    };

    const handleHyperglycemiaChange = (id: number, field: 'time' | 'value', value: string) => {
        setFormData(prev => ({
            ...prev,
            hyperglycemiaEvents: prev.hyperglycemiaEvents.map(event => 
                event.id === id 
                    ? { ...event, [field]: field === 'value' ? Number(value) : value }
                    : event
            )
        }));
    };

    return (
        <div className="p-4 animate-fade-in">
            <header className="flex items-center mb-6 relative">
                <button type="button" onClick={onBack} className="p-2 absolute left-0"><ArrowLeft size={24} /></button>
                <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mx-auto text-center">Reavaliação</h1>
            </header>

            <form onSubmit={handleGeneratePlan}>
                <p className="text-center text-text-secondary-light dark:text-text-secondary-dark mb-4 text-sm">
                    Paciente: <strong>{patient.name || 'N/A'}</strong>
                </p>

                <FormSection title="Dados Atuais de Acompanhamento">
                     <Input 
                        label="Peso Atual" 
                        name="currentWeight" 
                        type="number" 
                        value={formData.currentWeight} 
                        onChange={(e) => setFormData(p => ({...p, currentWeight: Number(e.target.value) || 0}))} 
                        unit="kg"
                        required
                     />
                     <Input 
                        label="Glicemia de Jejum Atual" 
                        name="currentFastingGlucose" 
                        type="number" 
                        value={formData.currentFastingGlucose} 
                        onChange={(e) => setFormData(p => ({...p, currentFastingGlucose: Number(e.target.value) || 0}))} 
                        unit="mg/dL"
                     />
                     <Input 
                        label="HbA1c Atual" 
                        name="currentHbA1c" 
                        type="number"
                        step="0.1"
                        value={formData.currentHbA1c}
                        onChange={(e) => setFormData(p => ({...p, currentHbA1c: parseFloat(e.target.value.replace(',', '.')) || 0}))} 
                        unit="%"
                     />
                     <Input 
                        label="Glicemia Pré-Prandial (média)" 
                        name="currentPrePrandialGlucose" 
                        type="number" 
                        value={formData.currentPrePrandialGlucose} 
                        onChange={(e) => setFormData(p => ({...p, currentPrePrandialGlucose: Number(e.target.value) || 0}))} 
                        unit="mg/dL"
                     />
                     <Input 
                        label="Glicemia Pós-Prandial (2h)" 
                        name="currentPostPrandialGlucose" 
                        type="number" 
                        value={formData.currentPostPrandialGlucose} 
                        onChange={(e) => setFormData(p => ({...p, currentPostPrandialGlucose: Number(e.target.value) || 0}))} 
                        unit="mg/dL"
                     />
                     <CheckboxGroup
                        label="Refeições com Hiperglicemia"
                        options={sortedMeals.map(m => m.name)}
                        selectedOptions={formData.highGlucoseMeals.map(id => sortedMeals.find(m => m.id === id)?.name).filter(Boolean) as string[]}
                        onChange={(selectedNames) => {
                            const selectedIds = selectedNames.map(name => sortedMeals.find(m => m.name === name)?.id).filter(Boolean) as number[];
                            handleCheckboxChange('highGlucoseMeals')(selectedIds);
                        }}
                    />
                    
                    <div className="col-span-full space-y-3">
                        <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Momentos de Hiperglicemia</label>
                        {formData.hyperglycemiaEvents.map(event => (
                            <div key={event.id} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5">
                                    <Input 
                                        label="Horário" 
                                        type="time" 
                                        value={event.time} 
                                        onChange={e => handleHyperglycemiaChange(event.id, 'time', e.target.value)} 
                                    />
                                </div>
                                <div className="col-span-6">
                                    <Input 
                                        label="Glicemia" 
                                        type="number" 
                                        value={event.value} 
                                        onChange={e => handleHyperglycemiaChange(event.id, 'value', e.target.value)} 
                                        unit="mg/dL" 
                                    />
                                </div>
                                <div className="col-span-1 flex justify-center">
                                    <button type="button" onClick={() => handleRemoveHyperglycemia(event.id)} className="p-2 text-danger">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddHyperglycemia} className="flex items-center justify-center space-x-2 w-full text-primary dark:text-primary-dark font-semibold p-2 rounded-lg hover:bg-primary/10 transition-colors">
                            <PlusCircle size={16} />
                            <span>Adicionar Momento</span>
                        </button>
                    </div>

                    <div className="col-span-full">
                        <Select 
                            label="Novos Episódios de Hipoglicemia" 
                            name="newHypoglycemiaEpisodes" 
                            value={formData.newHypoglycemiaEpisodes}
                            onChange={(e) => setFormData(p => ({...p, newHypoglycemiaEpisodes: e.target.value as FollowUpData['newHypoglycemiaEpisodes']}))}
                        >
                            <option value="nao_avaliado">Não Avaliado</option>
                            <option value="nenhum">Nenhum</option>
                            <option value="raro">Raro</option>
                            <option value="frequente">Frequente</option>
                        </Select>
                    </div>

                    {(formData.newHypoglycemiaEpisodes === 'raro' || formData.newHypoglycemiaEpisodes === 'frequente') && (
                        <CheckboxGroup
                            label="Momentos da Hipoglicemia"
                            options={['Madrugada (00-06h)', 'Manhã (06-12h)', 'Tarde (12-18h)', 'Noite (18-00h)']}
                            selectedOptions={formData.hypoglycemiaTimings}
                            onChange={handleCheckboxChange('hypoglycemiaTimings')}
                        />
                    )}

                     <div className="flex flex-col space-y-1 col-span-full">
                        <label className="text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark">Notas Adicionais</label>
                        <textarea
                            value={formData.patientNotes}
                            onChange={(e) => setFormData(p => ({ ...p, patientNotes: e.target.value }))}
                            placeholder="Ex: paciente relatou melhora da poliúria, iniciou caminhadas 2x/semana."
                            className="w-full h-24 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        />
                    </div>
                </FormSection>

                {error && <div className="bg-danger/20 border border-danger text-danger p-3 rounded-lg mb-4 text-center">{error}</div>}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full mt-2 bg-primary dark:bg-primary-dark text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Droplet size={20} className="animate-spin" />
                            <span>Analisando...</span>
                        </>
                    ) : (
                        <>
                            <Zap size={20} />
                            <span>Gerar Plano de Ajuste</span>
                        </>
                    )}
                </button>
            </form>
            
             {isLoading && (
                <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50">
                    <Droplet size={48} className="text-white animate-bounce" />
                    <h2 className="text-xl font-bold mt-4 text-white">Gerando novo manejo...</h2>
                    <p className="text-gray-300 mt-2 text-center px-4">O sistema está analisando os novos dados para ajustar o plano.</p>
                </div>
            )}
        </div>
    );
};

export default ReEvaluationScreen;
