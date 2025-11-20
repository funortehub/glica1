
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-soft overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-4 text-left font-semibold"
            >
                <span>{title}</span>
                <ChevronDown size={20} className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 border-t border-border-light dark:border-border-dark text-text-secondary-light dark:text-text-secondary-dark text-sm space-y-2">
                    {children}
                </div>
            </div>
        </div>
    );
}

const GuideScreen: React.FC = () => {
    return (
        <div className="p-4 animate-fade-in">
            <header className="flex items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mx-auto">Diretriz Resumida</h1>
            </header>
            
            <div className="space-y-3">
                <AccordionItem title="Metas Glicêmicas (SBD 2024)">
                    <p><strong>Adultos:</strong> HbA1c &lt; 7%</p>
                    <p><strong>Idosos (&gt;65a):</strong> HbA1c &lt; 7,5%</p>
                    <p><strong>Idosos Frágeis:</strong> HbA1c &lt; 8%</p>
                    <p><strong>Jejum Ideal:</strong> 80-130 mg/dL</p>
                    <p><strong>Pós-prandial (2h):</strong> &lt; 180 mg/dL</p>
                </AccordionItem>
                
                <AccordionItem title="Indicação de Insulina (PCDT DM2)">
                    <p>• HbA1c &gt; 9%</p>
                    <p>• Glicemia &gt; 300 mg/dL</p>
                    <p>• Sintomas de hiperglicemia (poliúria, polidipsia, perda ponderal)</p>
                    <p>• Falha com Metformina + Sulfonilureia</p>
                </AccordionItem>
                
                <AccordionItem title="Insulina NPH: Dose e Ajuste">
                    <p><strong>Dose Inicial:</strong> 10U à noite OU 0,2 U/kg ao deitar.</p>
                    <p><strong>Ajuste Semanal (Jejum):</strong></p>
                    <ul className="list-disc list-inside ml-4">
                        <li>&gt;130 mg/dL: +2U ou +10-15%</li>
                        <li>&lt;70 mg/dL: –4U ou –10%</li>
                        <li>80–130 mg/dL: Manter</li>
                    </ul>
                </AccordionItem>

                <AccordionItem title="Insulina Regular: Dose e Ajuste">
                    <p><strong>Dose Inicial:</strong> 2-4U antes da principal refeição.</p>
                    <p><strong>Ajuste (Pós-prandial 2h):</strong></p>
                    <ul className="list-disc list-inside ml-4">
                        <li>&gt;180 mg/dL: +2U</li>
                        <li>&gt;250 mg/dL: +4U</li>
                        <li>&lt;70 mg/dL: –2 a –4U</li>
                    </ul>
                </AccordionItem>
                
                <AccordionItem title="Manejo dos Antidiabéticos Orais">
                    <p><strong>Metformina:</strong> Manter sempre que TFG &gt; 30.</p>
                    <p><strong>Sulfonilureia:</strong> Suspender se iniciar esquema basal-bolus.</p>
                    <p><strong>Dapagliflozina:</strong> Manter se TFG &gt; 30 e houver indicação (Risco CV, ICC, DRC).</p>
                </AccordionItem>
            </div>
             <p className="text-xs text-center text-text-secondary-light dark:text-text-secondary-dark mt-8">
                Fonte: Diretrizes SBD 2024 e PCDT DM2 - SUS. Consulte sempre a documentação oficial.
            </p>
        </div>
    );
};

export default GuideScreen;
