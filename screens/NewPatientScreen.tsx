
import React, { useState } from 'react';
import { Input } from '../components/FormControls';
import { ArrowLeft, User, ArrowRight } from 'lucide-react';

interface NewPatientScreenProps {
    onContinue: (name: string, dob: string) => void;
    onBack: () => void;
}

const NewPatientScreen: React.FC<NewPatientScreenProps> = ({ onContinue, onBack }) => {
    const [name, setName] = useState('');
    const [dob, setDob] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !dob) {
            setError('Nome completo e data de nascimento são obrigatórios.');
            return;
        }
        setError('');
        onContinue(name.trim(), dob);
    };

    return (
        <div className="p-4 animate-fade-in flex flex-col h-full">
            <header className="flex items-center mb-6 relative">
                <button type="button" onClick={onBack} className="p-2 absolute left-0"><ArrowLeft size={24} /></button>
                <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mx-auto text-center">Novo Paciente</h1>
            </header>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-center space-y-8">
                <div className="text-center">
                    <div className="inline-block p-4 bg-primary/10 dark:bg-primary-dark/20 rounded-full mb-4">
                        <User size={40} className="text-primary dark:text-primary-dark"/>
                    </div>
                    <h2 className="text-lg font-semibold">Identificação do Paciente</h2>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                        Comece inserindo os dados básicos para iniciar a avaliação.
                    </p>
                </div>

                {error && <div className="bg-danger/20 border border-danger text-danger p-3 rounded-lg text-center">{error}</div>}

                <div className="space-y-6">
                     <Input 
                        label="Nome Completo do Paciente" 
                        value={name} 
                        onChange={(e) => setName(e.target.value)} 
                        placeholder="Insira o nome completo" 
                        required
                     />
                    <Input 
                        label="Data de Nascimento" 
                        value={dob} 
                        onChange={(e) => setDob(e.target.value)} 
                        type="date" 
                        required
                    />
                </div>

                <div className="pt-4">
                    <button
                      type="submit"
                      className="w-full bg-primary dark:bg-primary-dark text-white font-bold py-4 px-4 rounded-xl shadow-lg hover:opacity-90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                    >
                      <span>Continuar para Cálculo</span>
                      <ArrowRight size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default NewPatientScreen;
