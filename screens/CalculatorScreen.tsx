


import React, { useState, useMemo, useEffect } from 'react';
import type { PatientData, Meal } from '../types';
import { FormSection, Input, Select, CheckboxGroup, Toggle } from '../components/FormControls';
import { Zap, PlusCircle, Trash2, Utensils, User } from 'lucide-react';

interface CalculatorScreenProps {
  onSubmit: (data: PatientData, isFastMode: boolean) => void;
  initialInfo: { name: string; dob: string } | null;
  isFastMode: boolean;
}

const initialState: PatientData = {
    name: '',
    dob: '',
    age: 0,
    sex: 'masculino',
    weight: 0,
    height: 0,
    imc: 0,
    isFrail: false,
    comorbidities: [],
    medications: [],
    creatinine: 0,
    tfg: 0,
    albuminuria: 0,
    hba1c: 0,
    fastingGlucose: 0,
    prePrandialGlucose: 0,
    postPrandialGlucose: 0,
    postPrandialMealIds: [],
    hypoglycemiaEpisodes: 'nenhum',
    clinicalSymptoms: [],
    clinicalSituation: [],
    currentInsulins: [{ id: 1, type: 'Nenhuma', dose: 0, schedule: '' }],
    meals: [
        { id: 1, name: 'Café da Manhã', time: '08:00' },
        { id: 2, name: 'Almoço', time: '12:30' },
        { id: 3, name: 'Jantar', time: '19:00' },
    ],
};

const getImcClassification = (imc: number): string => {
    if (imc <= 0) return '';
    if (imc < 18.5) return 'Abaixo do peso';
    if (imc < 24.9) return 'Peso normal';
    if (imc < 29.9) return 'Sobrepeso';
    if (imc < 34.9) return 'Obesidade Grau I';
    if (imc < 39.9) return 'Obesidade Grau II';
    return 'Obesidade Grau III';
};


const CalculatorScreen: React.FC<CalculatorScreenProps> = ({ onSubmit, initialInfo, isFastMode }) => {
    const [formData, setFormData] = useState<PatientData>(initialState);
    const [heightDisplay, setHeightDisplay] = useState('');
    const [creatinineDisplay, setCreatinineDisplay] = useState('');
    const [hba1cDisplay, setHba1cDisplay] = useState('');
    const [error, setError] = useState('');
    
    useEffect(() => {
        if (initialInfo) {
            const birthDate = new Date(initialInfo.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            setFormData(prev => ({
                ...initialState, // Reset form for new patient
                name: initialInfo.name,
                dob: initialInfo.dob,
                age: age > 0 ? age : 0,
            }));
        }
    }, [initialInfo]);

    const imc = useMemo(() => {
        if (isFastMode || formData.height <= 0 || formData.weight <= 0) {
            return 0;
        }
        return formData.weight / (formData.height * formData.height);
    }, [formData.weight, formData.height, isFastMode]);
    const imcClassification = useMemo(() => getImcClassification(imc), [imc]);

    const tfg = useMemo(() => {
        if (isFastMode || formData.creatinine <= 0 || formData.age <= 0) return 0;
        
        const scr = formData.creatinine;
        const age = formData.age;
        const kappa = formData.sex === 'feminino' ? 0.7 : 0.9;
        const alpha = formData.sex === 'feminino' ? -0.241 : -0.302;
        const sexFactor = formData.sex === 'feminino' ? 1.012 : 1.0;

        const part1 = Math.pow(Math.min(scr / kappa, 1.0), alpha);
        const part2 = Math.pow(Math.max(scr / kappa, 1.0), -1.200);
        const ageFactor = Math.pow(0.9938, age);

        return 142 * part1 * part2 * ageFactor * sexFactor;
    }, [formData.age, formData.creatinine, formData.sex, isFastMode]);

    const sortedMeals = useMemo(() => 
        [...formData.meals].sort((a, b) => a.time.localeCompare(b.time)),
    [formData.meals]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        if (name === 'height') {
            const onlyNums = value.replace(/[^\d]/g, '');
            let maskedValue = onlyNums;
            if (onlyNums.length > 1) {
                maskedValue = `${onlyNums.slice(0, 1)}.${onlyNums.slice(1, 3)}`;
            }
            setHeightDisplay(maskedValue);
            setFormData(prev => ({ ...prev, height: parseFloat(maskedValue) || 0 }));
            return;
        }

        if (name === 'creatinine') {
            const onlyNums = value.replace(/[^\d]/g, '');
            let maskedValue = onlyNums;
            if (onlyNums.length > 1) {
                maskedValue = `${onlyNums.slice(0, 1)}.${onlyNums.slice(1, 3)}`;
            }
            setCreatinineDisplay(maskedValue);
            setFormData(prev => ({ ...prev, creatinine: parseFloat(maskedValue) || 0 }));
            return;
        }

        if (name === 'hba1c') {
            const onlyNums = value.replace(/[^\d]/g, '');
            let maskedValue = onlyNums;
            if (onlyNums.length > 2) { // 10.5 -> 105
                maskedValue = `${onlyNums.slice(0, 2)}.${onlyNums.slice(2, 3)}`;
            } else if (onlyNums.length > 1) { // 7.5 -> 75
                 maskedValue = `${onlyNums.slice(0, 1)}.${onlyNums.slice(1, 2)}`;
            }
            setHba1cDisplay(maskedValue);
            setFormData(prev => ({ ...prev, hba1c: parseFloat(maskedValue) || 0 }));
            return;
        }

        const isNumber = type === 'number';
        setFormData(prev => ({
            ...prev,
            [name]: isNumber ? (parseFloat(value.replace(',', '.')) || 0) : value,
        }));
    };
    
    const handleCheckboxChange = (field: keyof Omit<PatientData, 'currentInsulins' | 'sex' | 'hypoglycemiaEpisodes' | 'meals' | 'postPrandialMealIds' | 'name' | 'dob'>) => (selection: string[]) => {
      setFormData(prev => ({ ...prev, [field]: selection }));
    };

    const handleInsulinChange = (id: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            currentInsulins: prev.currentInsulins.map(ins => {
                if (ins.id !== id) return ins;

                const updatedInsulin = { 
                    ...ins, 
                    [name]: name === 'dose' ? (parseFloat(value.replace(',', '.')) || 0) : value 
                };
                
                if (name === 'type') {
                    updatedInsulin.schedule = '';
                }
                return updatedInsulin;
            })
        }));
    };

    const handleAddInsulin = () => {
        setFormData(prev => ({
            ...prev,
            currentInsulins: prev.currentInsulins.length === 1 && prev.currentInsulins[0].type === 'Nenhuma'
                ? [{ id: Date.now(), type: 'NPH', dose: 10, schedule: '22:00' }]
                : [...prev.currentInsulins, { id: Date.now(), type: 'NPH', dose: 10, schedule: '' }]
        }));
    };

    const handleRemoveInsulin = (id: number) => {
        setFormData(prev => {
            const newInsulins = prev.currentInsulins.filter(ins => ins.id !== id);
            if (newInsulins.length === 0) {
                return { ...prev, currentInsulins: [{ id: 1, type: 'Nenhuma', dose: 0, schedule: '' }] };
            }
            return { ...prev, currentInsulins: newInsulins };
        });
    };

    const handleMealChange = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            meals: prev.meals.map(meal => meal.id === id ? { ...meal, [name]: value } : meal)
        }));
    };

    const handleAddMeal = () => {
        setFormData(prev => ({
            ...prev,
            meals: [...prev.meals, { id: Date.now(), name: 'Lanche', time: '16:00'}]
        }));
    };

    const handleRemoveMeal = (id: number) => {
        setFormData(prev => ({
            ...prev,
            meals: prev.meals.filter(meal => meal.id !== id)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.hba1c <= 0 || formData.fastingGlucose <= 0) {
            setError('HbA1c e Glicemia de Jejum são obrigatórios.');
            window.scrollTo(0,0);
            return;
        }
        setError('');
        const dataToSubmit = { ...formData, imc, tfg };
        onSubmit(dataToSubmit, isFastMode);
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 animate-fade-in">
            <header className="flex items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mx-auto">Dados do Paciente</h1>
            </header>
            
            {formData.name && (
                <div className="mb-6 p-4 bg-primary/10 dark:bg-primary-dark/20 rounded-xl flex items-center space-x-3">
                    <User className="text-primary dark:text-primary-dark" size={24} />
                    <div>
                        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">Paciente</p>
                        <p className="font-semibold text-text-primary-light dark:text-text-primary-dark">{formData.name}</p>
                    </div>
                </div>
            )}
            
            {error && <div className="bg-danger/20 border border-danger text-danger p-3 rounded-lg mb-4 text-center">{error}</div>}

            <FormSection title="Dados Antropométricos">
                <Input label="Idade" name="age" type="number" value={formData.age} onChange={handleChange} unit="anos" disabled />
                {!isFastMode && (
                  <Select label="Sexo" name="sex" value={formData.sex} onChange={handleChange}>
                      <option value="masculino">Masculino</option>
                      <option value="feminino">Feminino</option>
                  </Select>
                )}
                <Input label="Peso" name="weight" type="number" value={formData.weight} onChange={handleChange} unit="kg" />
                {!isFastMode && (
                  <>
                    <Input label="Altura" name="height" type="text" value={heightDisplay} onChange={handleChange} unit="m" placeholder="Ex: 1.75" />
                    <div className="col-span-full bg-primary/10 dark:bg-primary-dark/20 p-3 rounded-lg text-center">
                        <span className="font-semibold text-primary dark:text-primary-dark">IMC: {imc.toFixed(2)} kg/m²</span>
                        {imcClassification && <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark ml-2">({imcClassification})</span>}
                    </div>
                  </>
                )}
            </FormSection>

            {!isFastMode && (
              <>
                <FormSection title="Clínica e Comorbidades">
                     <Toggle label="Paciente frágil ou com comorbidades graves?" checked={formData.isFrail} onChange={(c) => setFormData(p => ({ ...p, isFrail: c }))} />
                     <CheckboxGroup
                        label="Comorbidades"
                        options={['HAS', 'Dislipidemia', 'Obesidade', 'DRC', 'Albuminúria', 'ICC', 'DCV']}
                        selectedOptions={formData.comorbidities}
                        onChange={handleCheckboxChange('comorbidities')}
                    />
                     <CheckboxGroup
                        label="Medicamentos em Uso"
                        options={['Metformina', 'Gliclazida', 'Glibenclamida', 'Dapagliflozina', 'Outro ADO', 'IECA/BRA']}
                        selectedOptions={formData.medications}
                        onChange={handleCheckboxChange('medications')}
                    />
                </FormSection>
                
                <FormSection title="Dados Laboratoriais">
                     <Input label="Creatinina" name="creatinine" type="text" value={creatinineDisplay} onChange={handleChange} unit="mg/dL" placeholder="Ex: 1.2" />
                     <div className="col-span-full bg-primary/10 dark:bg-primary-dark/20 p-3 rounded-lg text-center">
                        <span className="font-semibold text-primary dark:text-primary-dark">TFG (CKD-EPI 2021): {tfg.toFixed(2)} ml/min</span>
                    </div>
                     <Input label="Relação Albumina/Creatinina" name="albuminuria" type="number" value={formData.albuminuria} onChange={handleChange} unit="mg/g" />
                </FormSection>
              </>
            )}

            <FormSection title="Refeições">
                <div className="col-span-full space-y-3">
                    {sortedMeals.map(meal => (
                        <div key={meal.id} className="grid grid-cols-12 gap-2 items-end">
                            <div className="col-span-6 sm:col-span-7">
                                <Input label="Refeição" name="name" type="text" value={meal.name} onChange={e => handleMealChange(meal.id, e)} />
                            </div>
                            <div className="col-span-5 sm:col-span-4">
                                <Input label="Horário" name="time" type="time" value={meal.time} onChange={e => handleMealChange(meal.id, e)} />
                            </div>
                            <div className="col-span-1 flex justify-center">
                                <button type="button" onClick={() => handleRemoveMeal(meal.id)} className="p-2 text-danger">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                    <button type="button" onClick={handleAddMeal} className="flex items-center justify-center space-x-2 w-full text-primary dark:text-primary-dark font-semibold p-2 rounded-lg hover:bg-primary/10 transition-colors">
                        <Utensils size={16} />
                        <span>Adicionar Refeição</span>
                    </button>
                </div>
            </FormSection>

            <FormSection title="Controle Glicêmico">
                <Input label="HbA1c" name="hba1c" type="text" value={hba1cDisplay} onChange={handleChange} unit="%" placeholder="Ex: 8.5" required />
                <Input label="Glicemia de Jejum" name="fastingGlucose" type="number" value={formData.fastingGlucose} onChange={handleChange} unit="mg/dL" required/>
                <Input label="Glicemia Pré-Prandial (média)" name="prePrandialGlucose" type="number" value={formData.prePrandialGlucose} onChange={handleChange} unit="mg/dL" />
                <Input label="Glicemia Pós-Prandial (2h)" name="postPrandialGlucose" type="number" value={formData.postPrandialGlucose} onChange={handleChange} unit="mg/dL" />
                
                {formData.postPrandialGlucose > 0 && (
                     <CheckboxGroup
                        label="Referente a qual refeição?"
                        options={sortedMeals.map(m => m.name)}
                        selectedOptions={formData.postPrandialMealIds.map(id => sortedMeals.find(m => m.id === id)?.name).filter(Boolean) as string[]}
                        onChange={(selectedNames) => {
                            const selectedIds = selectedNames.map(name => sortedMeals.find(m => m.name === name)?.id).filter(Boolean) as number[];
                            setFormData(prev => ({...prev, postPrandialMealIds: selectedIds}));
                        }}
                    />
                )}

                <div className={`${formData.postPrandialGlucose > 0 ? '' : 'col-span-full'}`}>
                    <Select label="Episódios de Hipoglicemia" name="hypoglycemiaEpisodes" value={formData.hypoglycemiaEpisodes} onChange={handleChange}>
                        <option value="nenhum">Nenhum</option>
                        <option value="raro">Raro</option>
                        <option value="frequente">Frequente</option>
                    </Select>
                </div>
            </FormSection>

            {!isFastMode && (
                <FormSection title="Situação Clínica Atual">
                     <CheckboxGroup
                        label="Sintomas Cardinais"
                        options={['Poliúria', 'Polidipsia', 'Perda Ponderal']}
                        selectedOptions={formData.clinicalSymptoms}
                        onChange={handleCheckboxChange('clinicalSymptoms')}
                    />
                     <CheckboxGroup
                        label="Fatores de Descompensação"
                        options={['Infecção / Doença Aguda', 'Mudança Alimentar', 'Exercício Intenso', 'Mudança de Peso']}
                        selectedOptions={formData.clinicalSituation}
                        onChange={handleCheckboxChange('clinicalSituation')}
                    />
                </FormSection>
            )}
            
            <FormSection title="Insulina Atual (se aplicável)">
                <div className="col-span-full space-y-4">
                    {formData.currentInsulins.map((insulin) => (
                        <div key={insulin.id} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-background-light dark:bg-background-dark rounded-lg border border-border-light dark:border-border-dark relative">
                            <Select label="Tipo" name="type" value={insulin.type} onChange={(e) => handleInsulinChange(insulin.id, e)}>
                                <option value="Nenhuma">Nenhuma</option>
                                <option value="NPH">NPH</option>
                                <option value="Regular">Regular</option>
                            </Select>
                            <Input label="Dose Total" name="dose" type="number" value={insulin.dose} onChange={(e) => handleInsulinChange(insulin.id, e)} unit="U/dia" disabled={insulin.type === 'Nenhuma'} />
                            
                            {insulin.type === 'Regular' ? (
                                <Select
                                    label="Refeição"
                                    name="schedule"
                                    value={insulin.schedule}
                                    onChange={(e) => handleInsulinChange(insulin.id, e)}
                                >
                                    <option value="">Selecione uma refeição</option>
                                    {sortedMeals.map((meal) => (
                                        <option key={meal.id} value={`${meal.name} (${meal.time})`}>
                                            {meal.name} ({meal.time})
                                        </option>
                                    ))}
                                </Select>
                            ) : (
                                <Input label="Esquema" name="schedule" type="text" placeholder="Ex: 20U às 22h" value={insulin.schedule} onChange={(e) => handleInsulinChange(insulin.id, e)} disabled={insulin.type === 'Nenhuma'} />
                            )}

                             {formData.currentInsulins.length > 1 && (
                                <button type="button" onClick={() => handleRemoveInsulin(insulin.id)} className="absolute -top-2 -right-2 p-1 bg-danger text-white rounded-full">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                     <button type="button" onClick={handleAddInsulin} className="flex items-center justify-center space-x-2 w-full text-primary dark:text-primary-dark font-semibold p-2 rounded-lg hover:bg-primary/10 transition-colors">
                        <PlusCircle size={20} />
                        <span>Adicionar Insulina</span>
                    </button>
                </div>
            </FormSection>

            <button
              type="submit"
              className="w-full mt-6 bg-primary dark:bg-primary-dark text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <Zap size={20} />
              <span>Gerar Conduta</span>
            </button>
        </form>
    );
};

export default CalculatorScreen;