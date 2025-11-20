

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { HistoryEntry } from '../types';
import { History as HistoryIcon, User, Search, UserPlus, RefreshCw, Trash2 } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="bg-card-light dark:bg-card-dark rounded-xl shadow-lg p-6 m-4 max-w-sm w-full">
        <h3 id="dialog-title" className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">{title}</h3>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-danger text-white font-semibold hover:opacity-90 transition-opacity">
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
};

interface HistoryScreenProps {
    history: HistoryEntry[];
    onView: (item: HistoryEntry) => void;
    onAddTestPatient: () => void;
    onDelete: (id: string) => void;
}

const calculateAge = (dobString?: string): number | null => {
    if (!dobString) return null;
    const birthDate = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

const HistoryItem: React.FC<{
    item: HistoryEntry;
    onView: (item: HistoryEntry) => void;
    onDeleteRequest: (item: HistoryEntry) => void;
    activeSwipeId: string | null;
    setActiveSwipeId: (id: string | null) => void;
}> = ({ item, onView, onDeleteRequest, activeSwipeId, setActiveSwipeId }) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const startX = useRef(0);
    const currentX = useRef(0);
    const isDragging = useRef(false);

    const isSwiped = activeSwipeId === item.id;
    const deleteButtonWidth = 80;

    const handleDragStart = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
        if (activeSwipeId && activeSwipeId !== item.id) {
             setActiveSwipeId(null); 
        }
        startX.current = 'touches' in e ? e.touches[0].clientX : e.clientX;
        isDragging.current = true;
        if (itemRef.current) {
            itemRef.current.style.transition = 'none';
        }
    };

    const handleDragMove = (e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging.current || !itemRef.current) return;
        
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const deltaX = clientX - startX.current;

        if (deltaX < 5 && deltaX > -deleteButtonWidth - 20) {
            currentX.current = deltaX;
            itemRef.current.style.transform = `translateX(${deltaX}px)`;
        }
    };

    const handleDragEnd = () => {
        if (!isDragging.current || !itemRef.current) return;
        isDragging.current = false;
        itemRef.current.style.transition = 'transform 0.3s ease';

        const threshold = -deleteButtonWidth / 2;
        if (currentX.current < threshold) {
            itemRef.current.style.transform = `translateX(-${deleteButtonWidth}px)`;
            setActiveSwipeId(item.id!);
        } else {
            itemRef.current.style.transform = 'translateX(0px)';
            if (isSwiped) {
                setActiveSwipeId(null);
            }
        }
    };
    
    useEffect(() => {
        if (!isSwiped && itemRef.current) {
            itemRef.current.style.transform = 'translateX(0px)';
        }
    }, [isSwiped]);

    const handleClick = () => {
        if (Math.abs(currentX.current) > 5) {
             currentX.current = 0;
             return;
        }
        onView(item);
    }
    
    const handleDelete = () => {
        if (item.id) {
            onDeleteRequest(item);
        }
    };

    const currentAge = calculateAge(item.patient.dob);
    const displayAge = currentAge !== null ? currentAge : item.patient.age;
    const numAdjustments = item.adjustments?.length || 0;

    return (
        <div className="relative w-full overflow-hidden rounded-xl bg-card-light dark:bg-card-dark shadow-soft">
            <div className="absolute inset-y-0 right-0 flex items-center justify-center w-20 bg-danger" style={{width: `${deleteButtonWidth}px`}}>
                <button onClick={handleDelete} className="flex flex-col items-center justify-center h-full w-full text-white" aria-label={`Apagar ${item.patient.name}`}>
                    <Trash2 size={24} />
                    <span className="text-xs mt-1">Apagar</span>
                </button>
            </div>
            
            <div
                ref={itemRef}
                className="relative w-full text-left bg-card-light dark:bg-card-dark p-4 flex items-center space-x-4 cursor-pointer z-10"
                onTouchStart={handleDragStart}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
                onMouseDown={handleDragStart}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onClick={handleClick}
            >
                <div className="p-3 bg-primary/10 dark:bg-primary-dark/20 rounded-full mt-1 self-start">
                    <User size={24} className="text-primary dark:text-primary-dark" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
                        {item.patient.name || `Paciente de ${displayAge} anos`}
                    </p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                        {displayAge} anos, {item.patient.sex}
                    </p>
                    <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
                        Salvo em: {new Date(item.savedAt).toLocaleDateString('pt-BR')}
                    </p>
                </div>
                {numAdjustments > 0 && (
                     <div className="flex-shrink-0 flex flex-col items-center justify-center text-center ml-2 p-2 bg-purple-500/10 rounded-lg">
                        <span className="text-lg font-bold text-purple-500">{numAdjustments}</span>
                        <RefreshCw size={16} className="text-purple-500"/>
                    </div>
                )}
            </div>
        </div>
    );
};


const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onView, onAddTestPatient, onDelete }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeSwipeId, setActiveSwipeId] = useState<string | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<HistoryEntry | null>(null);

    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            const searchLower = searchTerm.toLowerCase();
            const currentAge = calculateAge(item.patient.dob)?.toString() || item.patient.age.toString();
            return searchTerm === '' ||
                item.patient.name?.toLowerCase().includes(searchLower) ||
                currentAge.includes(searchLower);
        });
    }, [history, searchTerm]);
    
    const handleOpenDeleteDialog = (item: HistoryEntry) => {
        setItemToDelete(item);
        setIsConfirmOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setItemToDelete(null);
        setIsConfirmOpen(false);
    };

    const handleConfirmDelete = () => {
        if (itemToDelete && itemToDelete.id) {
            onDelete(itemToDelete.id);
            setActiveSwipeId(null);
        }
        handleCloseDeleteDialog();
    };


    return (
        <div className="p-4 animate-fade-in">
            <header className="flex items-center mb-6">
                <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mx-auto">Histórico de Pacientes</h1>
            </header>
            
            <div className="mb-4 p-4 bg-card-light dark:bg-card-dark rounded-xl shadow-soft">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary-light dark:text-text-secondary-dark" size={20}/>
                    <input 
                        type="text"
                        placeholder="Buscar por nome ou idade..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg p-3 pl-10 focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                    />
                </div>
            </div>

            <div className="mb-6">
                 <button
                    onClick={onAddTestPatient}
                    className="w-full flex items-center justify-center space-x-2 bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:opacity-90 transition-colors"
                >
                    <UserPlus size={20} />
                    <span>Adicionar Paciente Teste</span>
                </button>
            </div>


            {filteredHistory.length === 0 ? (
                <div className="text-center text-text-secondary-light dark:text-text-secondary-dark mt-20">
                    <HistoryIcon size={48} className="mx-auto" />
                    <p className="mt-4">{history.length > 0 ? 'Nenhum resultado encontrado para o filtro aplicado.' : 'Nenhum paciente foi salvo ainda. Adicione um paciente teste para começar.'}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredHistory.map((item) => (
                         <HistoryItem
                            key={item.id || item.savedAt}
                            item={item}
                            onView={onView}
                            onDeleteRequest={handleOpenDeleteDialog}
                            activeSwipeId={activeSwipeId}
                            setActiveSwipeId={setActiveSwipeId}
                        />
                    ))}
                </div>
            )}
            
            <ConfirmationDialog
                isOpen={isConfirmOpen}
                onClose={handleCloseDeleteDialog}
                onConfirm={handleConfirmDelete}
                title="Confirmar Exclusão"
                message={`Tem certeza que deseja apagar o registro de ${itemToDelete?.patient.name}? Esta ação não pode ser desfeita.`}
            />
        </div>
    );
};

export default HistoryScreen;