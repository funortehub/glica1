

import { GoogleGenAI, Type } from "@google/genai";
import type { PatientData, ReportData, FollowUpData, Meal, AdjustmentReportData, HistoryEntry, Adjustment, PatientHandoutData } from '../types';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const reportSchema = {
    type: Type.OBJECT,
    properties: {
        clinicalSummary: { type: Type.STRING, description: "Resumo clínico conciso do paciente." },
        goalClassification: { type: Type.STRING, description: "Classificação do controle glicêmico (dentro/fora da meta)." },
        calculations: {
            type: Type.OBJECT,
            properties: {
                targetHbA1c: { type: Type.STRING, description: "Meta de HbA1c para este paciente." },
                nphInitialDose: { type: Type.STRING, description: "Cálculo da dose inicial de insulina NPH." },
                nphAdjustment: { type: Type.STRING, description: "Sugestão de ajuste semanal para NPH." },
                regularInitialDose: { type: Type.STRING, description: "Cálculo da dose inicial de insulina Regular, se indicada." },
            },
            required: ['targetHbA1c', 'nphInitialDose', 'nphAdjustment', 'regularInitialDose']
        },
        finalConduct: {
            type: Type.OBJECT,
            properties: {
                recommendedInsulins: {
                    type: Type.ARRAY,
                    description: "Array estruturado das doses de insulina recomendadas para o gráfico.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ['NPH', 'Regular'] },
                            dose: { type: Type.NUMBER },
                            schedule: { type: Type.STRING, description: "Horário da aplicação. Ex: 'Manhã (07:00)', 'Almoço (12:30)', 'Noite (22:00)'" }
                        },
                         required: ['type', 'dose', 'schedule']
                    }
                },
                nphDoseText: { type: Type.STRING, description: "Descrição textual da dose de NPH. Ex: 20U pela manhã e 10U à noite" },
                regularDosePlanText: { type: Type.STRING, description: "Descrição textual do plano de Regular. Ex: 4U antes do almoço" },
                adoManagement: { type: Type.STRING, description: "Recomendação sobre manter ou suspender antidiabéticos orais." },
            },
            required: ['recommendedInsulins', 'nphDoseText', 'regularDosePlanText', 'adoManagement']
        },
        identifiedRisks: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de riscos identificados (ex: hipoglicemia)." },
        complementaryConducts: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Lista de condutas complementares (ex: educação, monitorização)." },
        followUpPlan: { type: Type.STRING, description: "Plano de seguimento sugerido (ex: reavaliar em 7-14 dias)." },
        guidelineReference: { type: Type.STRING, description: "Trecho da diretriz SBD/SUS que embasa a decisão." },
    },
    required: ['clinicalSummary', 'goalClassification', 'calculations', 'finalConduct', 'identifiedRisks', 'complementaryConducts', 'followUpPlan', 'guidelineReference']
};

const adjustmentReportSchema = {
    type: Type.OBJECT,
    properties: {
        goalClassification: { type: Type.STRING, description: "Classificação do controle glicêmico atual do paciente (DENTRO ou FORA DA META), para ser usada no próximo seguimento." },
        situationAnalysis: { type: Type.STRING, description: "Breve análise da situação atual do paciente." },
        adjustedConduct: {
            type: Type.OBJECT,
            properties: {
                recommendedInsulins: {
                    type: Type.ARRAY,
                    description: "Array estruturado das doses de insulina AJUSTADAS para o gráfico.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, enum: ['NPH', 'Regular'] },
                            dose: { type: Type.NUMBER },
                            schedule: { type: Type.STRING, description: "Horário da aplicação. Ex: 'Manhã (07:00)', 'Almoço (12:30)', 'Noite (22:00)'" }
                        },
                         required: ['type', 'dose', 'schedule']
                    }
                },
                nphDoseText: { type: Type.STRING, description: "Descrição textual da NOVA dose de NPH. Ex: 22U pela manhã e 12U à noite" },
                regularDosePlanText: { type: Type.STRING, description: "Descrição textual do NOVO plano de Regular. Ex: 6U antes do almoço" },
                adoManagement: { type: Type.STRING, description: "Recomendação sobre manter ou suspender antidiabéticos orais após o ajuste." },
            },
            required: ['recommendedInsulins', 'nphDoseText', 'regularDosePlanText', 'adoManagement']
        },
        monitoringPlan: { type: Type.STRING, description: "Plano de monitorização para os próximos dias, focado nos pontos de ajuste." },
        nextGoals: { type: Type.STRING, description: "Metas claras para a próxima reavaliação (ex: Glicemia de jejum entre 80-130 mg/dL)." },
    },
    required: ['goalClassification', 'situationAnalysis', 'adjustedConduct', 'monitoringPlan', 'nextGoals']
};

const handoutSchema = {
    type: Type.OBJECT,
    properties: {
        storageInstructions: { type: Type.STRING, description: "Instruções claras sobre como armazenar a insulina (geladeira, etc)." },
        applicationInstructions: { type: Type.STRING, description: "Instruções passo-a-passo sobre como aplicar a insulina (locais, rodízio, etc)." },
        hypoglycemiaManagement: { type: Type.STRING, description: "O que fazer em caso de hipoglicemia (<70 mg/dL), incluindo a regra dos 15." },
        hyperglycemiaManagement: { type: Type.STRING, description: "O que fazer em caso de hiperglicemia, quando procurar o médico." },
        generalRecommendations: { type: Type.STRING, description: "Recomendações gerais sobre dieta, exercício e monitorização." },
    },
    required: ['storageInstructions', 'applicationInstructions', 'hypoglycemiaManagement', 'hyperglycemiaManagement', 'generalRecommendations'],
};


function buildPrompt(data: PatientData, isFastMode: boolean): string {
    const insulinsUsed = data.currentInsulins && data.currentInsulins.length > 0 && data.currentInsulins[0].type !== 'Nenhuma'
    ? data.currentInsulins.map(ins => `  - ${ins.type}, ${ins.dose}U, ${ins.schedule}`).join('\n')
    : 'Nenhuma';

    const meals = data.meals.map(meal => `  - ${meal.name}: ${meal.time}`).join('\n');
    
    const postPrandialMeals = data.postPrandialMealIds && data.postPrandialMealIds.length > 0
      ? ` (após ${data.postPrandialMealIds.map(id => data.meals.find(m => m.id === id)?.name || '').join(', ')})`
      : '';

    const mandatoryGuidelines = `
    Você é um assistente clínico para médicos, especializado em Diabetes Mellitus tipo 2. Sua função é analisar os dados do paciente e gerar um plano de insulinoterapia estritamente baseado nas diretrizes da Sociedade Brasileira de Diabetes (SBD 2024) e no PCDT DM2 do SUS. Seja objetivo, profissional e forneça a saída exclusivamente no formato JSON solicitado.

    **Diretrizes Mandatórias:**

    1.  **Metas Glicêmicas:**
        *   Adultos: HbA1c < 7%
        *   Idosos (>65 anos): HbA1c < 7.5%
        *   Idosos frágeis/comorbidades graves: HbA1c < 8%
        *   Jejum ideal: 80-130 mg/dL
        *   Pós-prandial (2h): < 180 mg/dL
        *   Hipoglicemia: < 70 mg/dL

    2.  **Indicação de Insulina:**
        *   HbA1c > 9%
        *   Glicemia de jejum > 300 mg/dL
        *   Sintomas de hiperglicemia (poliúria, polidipsia, perda ponderal)
        *   Falha terapêutica com Metformina + Sulfonilureia (SU)

    3.  **Cálculo Insulina NPH (Basal):**
        *   Dose inicial: 10U à noite ou 0.2 U/kg ao deitar. Priorize 0.2 U/kg. Se a Glicemia de Jejum (GJ) estiver controlada, mas houver hiperglicemia durante o dia (ex: pré-almoço elevada), considere iniciar a NPH pela manhã.
        *   Ajuste Semanal (baseado na glicemia de jejum):
            *   GJ > 130 mg/dL: +2U ou +10-15% da dose.
            *   GJ < 70 mg/dL: -4U ou -10% da dose.
            *   GJ 80-130 mg/dL: Manter a dose.
        *   Dividir em 2 doses/dia (60-70% pré-café, 30-40% pré-jantar) se: Jejum controlado mas pré-jantar elevada, ou dose total > 0.5 U/kg.

    4.  **Cálculo Insulina Regular (Prandial):**
        *   Indicação: Glicemia pós-prandial > 180 mg/dL apesar de basal otimizada.
        *   Dose inicial: 2 a 4U antes da principal refeição. Aplicar 15-30 min antes.
        *   Ajuste (baseado na glicemia pós-prandial da refeição correspondente):
            *   GPP > 180 mg/dL: +2U
            *   GPP > 250 mg/dL: +4U
            *   GPP < 70 mg/dL: -2 a -4U

    5.  **Manejo de Antidiabéticos Orais (ADO):**
        *   Metformina: Manter, se não houver contraindicação (TFG < 30).
        *   Sulfonilureia (Gliclazida, Glibenclamida): **Suspender** se iniciar insulina basal-bolus. Manter se usar apenas basal.
        *   iSGLT2 (Dapagliflozina): Manter se TFG > 30 e houver: Risco CV alto, ICC FEVE <= 40%, ou DRC (Albuminúria > 200 mg/g).

    6.  **Perguntas de Segurança para Ajuste (Considerar no plano):**
        *   Hipoglicemias recentes?
        *   Mudança alimentar ou exercício intenso?
        *   Doença aguda / infecção?
        *   Risco de hipoglicemia noturna?
    `;
    
    let patientDataSection;

    if (isFastMode) {
        patientDataSection = `
    **Dados do Paciente para Análise (Modo Rápido):**
    *   Idade: ${data.age} anos
    *   Peso: ${data.weight} kg
    *   Controle Glicêmico: HbA1c ${data.hba1c}%, Jejum ${data.fastingGlucose} mg/dL, Pré-prandial ${data.prePrandialGlucose} mg/dL, Pós-prandial ${data.postPrandialGlucose} mg/dL${postPrandialMeals}
    *   Hipoglicemia: ${data.hypoglycemiaEpisodes}
    *   Insulinas em uso:\n${insulinsUsed}
    *   Refeições do Paciente:\n${meals}
    `;
    } else {
        patientDataSection = `
    **Dados do Paciente para Análise:**
    *   Idade: ${data.age} anos
    *   Sexo: ${data.sex}
    *   Peso: ${data.weight} kg, Altura: ${data.height} m, IMC: ${data.imc.toFixed(2)} kg/m²
    *   Frágil/Comorbidades graves: ${data.isFrail ? 'Sim' : 'Não'}
    *   Comorbidades: ${data.comorbidities.join(', ') || 'Nenhuma'}
    *   Medicamentos em uso: ${data.medications.join(', ') || 'Nenhum'}
    *   Função Renal: Creatinina ${data.creatinine} mg/dL, TFG ${data.tfg.toFixed(2)} ml/min, Albuminúria ${data.albuminuria} mg/g
    *   Controle Glicêmico: HbA1c ${data.hba1c}%, Jejum ${data.fastingGlucose} mg/dL, Pré-prandial ${data.prePrandialGlucose} mg/dL, Pós-prandial ${data.postPrandialGlucose} mg/dL${postPrandialMeals}
    *   Hipoglicemia: ${data.hypoglycemiaEpisodes}
    *   Sintomas Clínicos Atuais: ${data.clinicalSymptoms.join(', ') || 'Nenhum'}
    *   Situação Clínica Especial: ${data.clinicalSituation.join(', ') || 'Nenhuma'}
    *   Insulinas em uso:\n${insulinsUsed}
    *   Refeições do Paciente:\n${meals}
    `;
    }

    return `${mandatoryGuidelines}\n${patientDataSection}\n\nBaseado estritamente nas diretrizes acima e nos dados do paciente, gere o plano terapêutico em formato JSON. **IMPORTANTE**: No campo 'recommendedInsulins', crie um item para cada aplicação de insulina (NPH ou Regular) com a dose e o horário exato (ex: 'Manhã (07:00)') para ser usado na construção de um gráfico.`;
}


export const generateInsulinReport = async (data: PatientData, isFastMode: boolean): Promise<ReportData> => {
    try {
        const prompt = buildPrompt(data, isFastMode);
        const model = isFastMode ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

        const response = await ai.models.generateContent({
            model: model, 
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: reportSchema,
            },
        });

        const jsonText = response.text.trim();
        if (!jsonText.startsWith('{') || !jsonText.endsWith('}')) {
             throw new Error("A resposta do assistente não está em formato JSON válido.");
        }
        
        const reportData = JSON.parse(jsonText) as ReportData;
        return reportData;

    } catch (error) {
        console.error("Error generating report from Gemini:", error);
        if (error instanceof Error && error.message.includes('JSON')) {
            throw new Error("A resposta do assistente não pôde ser processada. Tente novamente.");
        }
        throw new Error("Não foi possível gerar o relatório. O assistente pode estar sobrecarregado ou os dados são inválidos.");
    }
};

export const generateFollowUpPlan = async (
    patientData: PatientData, 
    initialReport: ReportData, 
    lastTherapeuticPlan: { adjustedConduct: Adjustment['adjustmentReport']['adjustedConduct'] } | { finalConduct: ReportData['finalConduct'] },
    followUpData: FollowUpData,
    meals: Meal[],
    adjustments?: Adjustment[],
    isFastMode: boolean = false
): Promise<AdjustmentReportData> => {
    const highGlucoseMealNames = followUpData.highGlucoseMeals
        .map(id => meals.find(m => m.id === id)?.name)
        .filter(Boolean)
        .join(', ') || 'Nenhuma específica';
    
    const previousConduct = 'adjustedConduct' in lastTherapeuticPlan 
        ? lastTherapeuticPlan.adjustedConduct 
        : lastTherapeuticPlan.finalConduct;

    const hyperglycemiaEventsString = followUpData.hyperglycemiaEvents && followUpData.hyperglycemiaEvents.length > 0
        ? followUpData.hyperglycemiaEvents
            .map(event => `  - ${event.time}: ${event.value} mg/dL`)
            .join('\n')
        : 'Nenhum momento específico de hiperglicemia foi relatado.';

    const hypoglycemiaTimings = followUpData.hypoglycemiaTimings.join(', ') || 'Não especificado';

    const adjustmentHistoryString = adjustments && adjustments.length > 0
        ? adjustments.map((adj, index) => `
    - **Ajuste #${index + 1} (${new Date(adj.adjustedAt).toLocaleDateString('pt-BR')})**:
      - Glicemia de Jejum: ${adj.followUpData.currentFastingGlucose} mg/dL, HbA1c: ${adj.followUpData.currentHbA1c}%
      - Nova Conduta: NPH (${adj.adjustmentReport.adjustedConduct.nphDoseText}), Regular (${adj.adjustmentReport.adjustedConduct.regularDosePlanText})
    `).join('')
        : 'Nenhum ajuste anterior.';


    const prompt = `
    Você é um endocrinologista especialista em DM2, atuando como consultor para outro médico. Um paciente que iniciou insulinoterapia recentemente retorna para reavaliação. Sua tarefa é analisar os dados de seguimento e propor um **plano de ajuste terapêutico** em formato JSON.

    **Diretrizes Mandatórias para Ajuste:**
    - **Ajuste NPH (baseado na glicemia de jejum):**
        - GJ > 130 mg/dL: +2U ou +10-15% da dose.
        - GJ < 70 mg/dL: -4U ou -10% da dose.
    - **Ajuste NPH por Padrão Diurno:** Se a GJ estiver controlada, mas houver um padrão de hiperglicemia em outro horário (ex: pré-almoço ou pré-jantar), considere dividir a dose de NPH ou adicionar uma nova dose (ex: NPH pela manhã para controlar a glicemia da tarde).
    - **Ajuste Regular (baseado na glicemia pós-prandial da refeição correspondente):**
        - GPP > 180 mg/dL: +2U
        - GPP > 250 mg/dL: +4U
        - GPP < 70 mg/dL: -2 a -4U
    - **Cálculos baseados em peso:** Se precisar recalcular doses com base no peso (U/kg), **use o PESO ATUALIZADO** do paciente.
    - **Segurança:** Priorize a segurança, evitando hipoglicemia. Se houver hipoglicemia, reduza a dose correspondente antes de qualquer aumento.

    **1. RESUMO DO CASO INICIAL:**
    - Paciente: ${patientData.age} anos.
    - Diagnóstico: DM2 com HbA1c inicial de ${patientData.hba1c}%.
    - Meta Terapêutica: HbA1c ${initialReport.calculations.targetHbA1c}.

    **2. PLANO TERAPÊutico ANTERIOR (O MAIS RECENTE):**
    - Insulina NPH: ${previousConduct.nphDoseText || 'Nenhuma'}
    - Insulina Regular: ${previousConduct.regularDosePlanText || 'Nenhuma'}
    - ADOs: ${previousConduct.adoManagement}

    **3. HISTÓRICO DE AJUSTES ANTERIORES:** ${adjustmentHistoryString}

    **4. DADOS DA REAVALIAÇÃO ATUAL:**
    - **Peso Atual: ${followUpData.currentWeight} kg.** (IMC inicial: ${patientData.imc.toFixed(2)} kg/m²)
    - Glicemia de Jejum Atual: ${followUpData.currentFastingGlucose} mg/dL.
    - Glicemia Pré-Prandial (média) Atual: ${followUpData.currentPrePrandialGlucose} mg/dL.
    - Glicemia Pós-Prandial (2h) Atual: ${followUpData.currentPostPrandialGlucose} mg/dL.
    - HbA1c Atual: ${followUpData.currentHbA1c}%.
    - Refeições com Hiperglicemia Pós-Prandial Persistente: ${highGlucoseMealNames}.
    - Momentos de Hiperglicemia (Horário: Valor):\n${hyperglycemiaEventsString}
    - Episódios de Hipoglicemia Recentes: ${followUpData.newHypoglycemiaEpisodes}.
    - Momentos de Hipoglicemia Recentes: ${hypoglycemiaTimings}.
    - Notas Adicionais do Médico: "${followUpData.patientNotes || 'Nenhuma'}"

    **5. SUA TAREFA (GERAR JSON):**
    Com base estritamente nas diretrizes, nos dados atuais (incluindo o **NOVO PESO**) E NO HISTÓRICO DE AJUSTES, gere o **Plano de Ajuste Terapêutico** em formato JSON.
    - Analise os **momentos de hiperglicemia** para identificar padrões que necessitem de uma nova dose de insulina (NPH ou Regular) em um novo horário.
    - No campo 'goalClassification', defina se o paciente está 'DENTRO DA META' ou 'FORA DA META'.
    - Analise a situação atual.
    - Proponha o ajuste das insulinas (NPH e/ou Regular). **Leve em conta a alteração de peso para o cálculo de doses, se necessário.**
    - Crie um novo array 'recommendedInsulins' com TODAS as doses finais (ajustadas ou não) para o novo gráfico.
    - Defina um plano de monitorização e metas.
    `;

    try {
        const model = isFastMode ? 'gemini-2.5-flash' : 'gemini-2.5-pro';

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: adjustmentReportSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AdjustmentReportData;

    } catch (error) {
        console.error("Error generating follow-up plan from Gemini:", error);
        throw new Error("Não foi possível gerar o plano de ajuste terapêutico.");
    }
};

export const generatePatientHandout = async (
    patientData: PatientData,
    conduct: ReportData['finalConduct'] | AdjustmentReportData['adjustedConduct']
): Promise<PatientHandoutData> => {
    const prompt = `
    Você é um educador em diabetes criando um guia prático para um paciente do SUS.
    **NÃO use jargões médicos.** Use uma linguagem simples, clara e encorajadora.
    Sua tarefa é gerar um guia para o paciente em formato JSON. O texto de cada seção deve ser conciso. Use quebras de linha (\\n) para separar parágrafos e itens de lista. Estruture em pequenos parágrafos e listas com marcadores para máxima clareza.
    O paciente se chama **${patientData.name || 'Paciente'}**.
    O plano de tratamento com insulina dele(a) é:
    - Insulina NPH: ${conduct.nphDoseText}
    - Insulina Regular: ${conduct.regularDosePlanText}

    Gere o guia cobrindo os seguintes pontos de forma objetiva:
    1.  **storageInstructions**: Como guardar a insulina corretamente (na geladeira, etc).
    2.  **applicationInstructions**: Um passo a passo de como aplicar a insulina. **Inclua instruções detalhadas e claras para os dois tipos de aplicação: com SERINGAS e com CANETAS**, cobrindo o preparo da dose, locais de aplicação, técnica do rodízio, e o que fazer com o material após o uso.
    3.  **hypoglycemiaManagement**: O que fazer se a glicose ficar baixa (< 70 mg/dL). Explique a "Regra dos 15" (ingerir 15g de carboidrato simples, esperar 15 min e medir de novo).
    4.  **hyperglycemiaManagement**: O que fazer se a glicose ficar alta. Quando se preocupar e procurar o médico.
    5.  **generalRecommendations**: Recomendações gerais e amigáveis sobre alimentação, atividade física e a importância de medir a glicose.

    Seja direto e prático. Use negrito (com asteriscos, ex: *palavra*) o mínimo possível, apenas para destacar os alertas de segurança mais críticos (ex: *Regra dos 15*, *sintomas de hipoglicemia grave*).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: handoutSchema,
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as PatientHandoutData;

    } catch (error) {
        console.error("Error generating patient handout from Gemini:", error);
        throw new Error("Não foi possível gerar as orientações para o paciente.");
    }
};