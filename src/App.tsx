import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Settings, 
  Home, 
  BarChart2, 
  Heart, 
  ChevronRight, 
  Plus, 
  Play, 
  SkipBack, 
  SkipForward, 
  X, 
  Check,
  ArrowLeft,
  Mic,
  Camera,
  Image as ImageIcon,
  Search,
  Share2,
  LogOut
} from 'lucide-react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  query, 
  orderBy, 
  Timestamp, 
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';

// --- Error Boundary ---
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<any, any> {
  state: any = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): any {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex flex-col items-center justify-center bg-[#FDF6E9] p-8 text-center">
          <h2 className="text-2xl font-serif text-brio-dark mb-4">¡Ups! Algo salió mal.</h2>
          <p className="text-brio-dark/60 mb-8">Estamos trabajando para solucionarlo.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-brio-dark text-white rounded-full font-bold"
          >
            Reintentar
          </button>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

// --- Types ---
type Screen = 
  | 'splash' 
  | 'welcome' 
  | 'login-options' 
  | 'login-name' 
  | 'login-age' 
  | 'login-freq' 
  | 'login-prefs' 
  | 'home' 
  | 'emotion-detail' 
  | 'stats' 
  | 'space' 
  | 'meditation' 
  | 'settings';

interface Emotion {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  message: string;
  detailMessage: string;
  bgColor: string;
}

interface Entry {
  id: string;
  emotionId: string;
  timestamp: Date;
  note: string;
  photo?: string;
  audio?: string;
}

// --- Constants ---
const EMOTIONS: Emotion[] = [
  { 
    id: 'radiante', 
    name: 'Radiante', 
    icon: (
      <div className="relative w-32 h-32 flex items-center justify-center">
        <div className="absolute inset-0 bg-orange-400" style={{ clipPath: 'polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)' }} />
        <div className="absolute inset-0 border-4 border-brio-dark" style={{ clipPath: 'polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)' }} />
      </div>
    ), 
    color: '#FDBA74',
    bgColor: 'bg-brio-pink',
    message: '¡Qué alegría! Mereces sentirte bien',
    detailMessage: 'Hoy brillas con una energía que contagia.'
  },
  { 
    id: 'triste', 
    name: 'Triste', 
    icon: (
      <div className="relative w-36 h-28 flex items-center justify-center">
        <div className="absolute w-28 h-20 bg-blue-500 rounded-full border-4 border-brio-dark" />
        <div className="absolute w-20 h-20 bg-blue-500 rounded-full -top-4 -left-2 border-4 border-brio-dark" />
        <div className="absolute w-20 h-20 bg-blue-500 rounded-full -top-6 left-6 border-4 border-brio-dark" />
        {/* Fill the gaps */}
        <div className="absolute w-28 h-20 bg-blue-500 rounded-full" />
        <div className="absolute w-20 h-20 bg-blue-500 rounded-full -top-4 -left-2" />
        <div className="absolute w-20 h-20 bg-blue-500 rounded-full -top-6 left-6" />
      </div>
    ), 
    color: '#2563EB',
    bgColor: 'bg-brio-pink',
    message: 'Es válido sentirse así. Gracias por escucharte hoy.',
    detailMessage: 'Las emociones difíciles no duran para siempre, tú puedes con esto.'
  },
  { 
    id: 'neutro', 
    name: 'Neutro', 
    icon: (
      <div className="relative w-32 h-32 flex items-center justify-center">
        <div className="w-24 h-14 bg-pink-200 border-4 border-brio-dark rounded-sm mt-8" />
        <div className="absolute w-12 h-20 bg-pink-200 border-4 border-brio-dark rounded-sm top-4" />
        {/* Fill the gaps */}
        <div className="absolute w-24 h-14 bg-pink-200 rounded-sm mt-8" />
        <div className="absolute w-12 h-20 bg-pink-200 rounded-sm top-4" />
      </div>
    ), 
    color: '#F9A8D4',
    bgColor: 'bg-brio-pink',
    message: 'Un momento de calma también es valioso.',
    detailMessage: 'Reconocerlo es el primer paso hacia la calma.'
  },
  { 
    id: 'agradecido', 
    name: 'Agradecido', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <Heart className="w-20 h-20 text-pink-500 fill-pink-500 stroke-[3px] stroke-brio-dark" />
      </div>
    ), 
    color: '#EC4899',
    bgColor: 'bg-pink-500',
    message: 'La gratitud transforma lo que tenemos en suficiente',
    detailMessage: 'Agradecer es abrir la puerta a más cosas buenas.'
  },
  { 
    id: 'motivado', 
    name: 'Motivado', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 bg-emerald-500 border-4 border-brio-dark" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
      </div>
    ), 
    color: '#10B981',
    bgColor: 'bg-emerald-500',
    message: '¡Esa es la actitud! Vas por buen camino',
    detailMessage: 'Tu determinación es tu mayor fortaleza hoy.'
  },
  { 
    id: 'inspirado', 
    name: 'Inspirado', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute w-16 h-16 bg-yellow-300 rounded-full blur-md opacity-50" />
        <div className="absolute w-12 h-12 bg-yellow-400 rounded-full border-4 border-brio-dark" />
      </div>
    ), 
    color: '#FACC15',
    bgColor: 'bg-yellow-400',
    message: 'Tu creatividad no tiene límites hoy',
    detailMessage: 'Deja que tus ideas fluyan, el mundo las necesita.'
  },
  { 
    id: 'calma', 
    name: 'Calma', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute w-20 h-20 bg-teal-300 rounded-full border-4 border-brio-dark" />
      </div>
    ), 
    color: '#5EEAD4',
    bgColor: 'bg-teal-300',
    message: 'Disfruta de este momento de paz',
    detailMessage: 'La serenidad te permite ver todo con claridad.'
  },
  { 
    id: 'orgulloso', 
    name: 'Orgulloso', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 bg-amber-400 border-4 border-brio-dark" style={{ clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' }} />
      </div>
    ), 
    color: '#FBBF24',
    bgColor: 'bg-amber-400',
    message: 'Reconoce tus logros, por pequeños que sean',
    detailMessage: 'Has llegado lejos, tómate un momento para celebrarlo.'
  },
  { 
    id: 'curioso', 
    name: 'Curioso', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <Search className="w-20 h-20 text-orange-500 stroke-[3px] stroke-brio-dark" />
      </div>
    ), 
    color: '#F97316',
    bgColor: 'bg-orange-500',
    message: 'El mundo está lleno de cosas por descubrir',
    detailMessage: 'Tu curiosidad es la llave a nuevas aventuras.'
  },
  { 
    id: 'ansioso', 
    name: 'Ansioso', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 bg-yellow-400 border-4 border-brio-dark" style={{ clipPath: 'polygon(50% 0%, 60% 20%, 80% 20%, 70% 40%, 90% 40%, 80% 60%, 100% 60%, 50% 100%, 0% 60%, 20% 60%, 10% 40%, 30% 40%, 20% 20%, 40% 20%)' }} />
      </div>
    ), 
    color: '#FACC15',
    bgColor: 'bg-yellow-400',
    message: 'Respira profundo, este momento pasará',
    detailMessage: 'No estás solo en esto, tómalo un respiro a la vez.'
  },
  { 
    id: 'abrumado', 
    name: 'Abrumado', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute w-20 h-20 border-8 border-brio-dark rounded-full border-t-transparent animate-spin" />
      </div>
    ), 
    color: '#94A3B8',
    bgColor: 'bg-slate-400',
    message: 'Una cosa a la vez, tú puedes manejarlo',
    detailMessage: 'Divide tus tareas, lo importante es avanzar poco a poco.'
  },
  { 
    id: 'cansado', 
    name: 'Cansado', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute w-20 h-20 bg-indigo-400 rounded-full border-4 border-brio-dark" style={{ clipPath: 'inset(0 0 50% 0)' }} />
      </div>
    ), 
    color: '#818CF8',
    bgColor: 'bg-indigo-400',
    message: 'Está bien descansar, te lo has ganado',
    detailMessage: 'Tu cuerpo pide pausa, escúchalo con cariño.'
  },
  { 
    id: 'enfadado', 
    name: 'Enfadado', 
    icon: (
      <div className="relative w-24 h-24 flex items-center justify-center">
        <div className="absolute inset-0 bg-red-500 border-4 border-brio-dark" style={{ clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' }} />
      </div>
    ), 
    color: '#EF4444',
    bgColor: 'bg-red-500',
    message: 'Suelta la tensión, busca tu centro',
    detailMessage: 'Tu fuerza es valiosa, úsala para construir calma.'
  }
];

// --- Components ---

const BottomNav = ({ active, onChange }: { active: string, onChange: (s: Screen) => void }) => (
  <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white rounded-full py-3 px-6 shadow-2xl border-2 border-brio-dark flex justify-between items-center z-50">
    <button onClick={() => onChange('home')} className="flex flex-col items-center gap-1.5 flex-1 relative group">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${active === 'home' ? 'bg-[#FDF6E9] text-brio-dark' : 'text-brio-dark/40'}`}>
        <Home size={28} strokeWidth={active === 'home' ? 2.5 : 2} />
      </div>
      <span className={`text-xs font-bold transition-colors ${active === 'home' ? 'text-brio-dark' : 'text-brio-dark/40'}`}>Inicio</span>
      {active === 'home' && <div className="absolute -bottom-2 w-2 h-2 bg-brio-dark rounded-full" />}
    </button>
    <button onClick={() => onChange('stats')} className="flex flex-col items-center gap-1.5 flex-1 relative group">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${active === 'stats' ? 'bg-[#FDF6E9] text-brio-dark' : 'text-brio-dark/40'}`}>
        <BarChart2 size={28} strokeWidth={active === 'stats' ? 2.5 : 2} />
      </div>
      <span className={`text-xs font-bold transition-colors ${active === 'stats' ? 'text-brio-dark' : 'text-brio-dark/40'}`}>Patrones</span>
      {active === 'stats' && <div className="absolute -bottom-2 w-2 h-2 bg-brio-dark rounded-full" />}
    </button>
    <button onClick={() => onChange('space')} className="flex flex-col items-center gap-1.5 flex-1 relative group">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${active === 'space' ? 'bg-[#FDF6E9] text-brio-dark' : 'text-brio-dark/40'}`}>
        <Heart size={28} strokeWidth={active === 'space' ? 2.5 : 2} />
      </div>
      <span className={`text-xs font-bold transition-colors ${active === 'space' ? 'text-brio-dark' : 'text-brio-dark/40'}`}>Mi espacio</span>
      {active === 'space' && <div className="absolute -bottom-2 w-2 h-2 bg-brio-dark rounded-full" />}
    </button>
  </div>
);

const Header = ({ onCalendar, onSettings, title = "Hoy, 18 mar", showBack = false, onBack }: { onCalendar?: () => void, onSettings?: () => void, title?: string, showBack?: boolean, onBack?: () => void }) => (
  <div className="flex justify-between items-center px-6 pt-12 pb-8">
    {showBack ? (
      <button onClick={onBack} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md border-2 border-brio-dark">
        <ArrowLeft size={28} className="text-brio-dark" />
      </button>
    ) : (
      <button onClick={onCalendar} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md border-2 border-brio-dark">
        <Calendar size={28} className="text-brio-dark" />
      </button>
    )}
    <span className="text-brio-dark font-bold text-lg">{title}</span>
    <button onClick={onSettings} className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-brio-dark">
      <Settings size={28} className="text-brio-dark" />
    </button>
  </div>
);

const SettingsGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-3xl border border-brio-dark/10 p-2 flex flex-col mb-4">
    {children}
  </div>
);

const SettingsItem = ({ label, value, toggle }: { label: string, value?: string, toggle?: boolean }) => (
  <div className="flex justify-between items-center p-4 border-b border-brio-dark/5 last:border-0">
    <span className="text-brio-dark font-medium">{label}</span>
    <div className="flex items-center gap-2">
      {value && <span className="text-brio-dark/60">{value}</span>}
      {toggle ? (
        <div className="w-12 h-7 bg-gray-200 rounded-full relative p-1">
          <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
        </div>
      ) : (
        <ChevronRight size={20} className="text-brio-dark/60" />
      )}
    </div>
  </div>
);

const StatCard = ({ title, children, showShare = false }: { title: string, children: React.ReactNode, showShare?: boolean }) => (
  <div className="p-6 bg-white rounded-[32px] shadow-sm border border-brio-dark/5 mb-6">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-medium">{title}</h3>
      {showShare && <Share2 size={20} className="text-brio-dark/60" />}
    </div>
    {children}
  </div>
);

const Section = ({ title, onMore, children }: { title: string, onMore: () => void, children: React.ReactNode }) => (
  <div className="mb-8">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-medium">{title}</h3>
      <ChevronRight size={20} className="text-brio-dark/60" onClick={onMore} />
    </div>
    {children}
  </div>
);

const ToolCard = ({ title, color, onClick }: { title: string, color: string, onClick?: () => void }) => (
  <div 
    onClick={onClick}
    className={`min-w-[120px] h-[160px] p-4 rounded-2xl flex flex-col justify-between cursor-pointer border border-brio-dark/5 ${color}`}
  >
    <div className="flex justify-end">
       <div className="w-1 h-4 bg-brio-dark/20 rounded-full" />
    </div>
    <div className="flex flex-col">
      <span className="text-[10px] text-brio-dark/60 uppercase font-bold">Meditación</span>
      <span className="text-lg font-serif leading-tight mt-1">{title}</span>
    </div>
  </div>
);

const CalendarOverlay = ({ isOpen, onClose, entries }: { isOpen: boolean, onClose: () => void, entries: Entry[] }) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/20 z-[60]"
        />
        <motion.div 
          initial={{ x: '-100%' }} 
          animate={{ x: 0 }} 
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed top-0 left-0 h-screen w-[85%] max-w-sm bg-white z-[70] p-8 overflow-y-auto no-scrollbar"
        >
          <div className="flex justify-between items-center mb-8">
             <h2 className="text-3xl font-serif">Noviembre, 22</h2>
             <X onClick={onClose} className="text-brio-dark" />
          </div>
          
            <div className="grid grid-cols-7 gap-2 mb-8 text-center">
              {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => (
                <span key={d} className="text-[10px] uppercase font-bold text-brio-dark/40">{d}</span>
              ))}
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const now = new Date();
                const dayEntries = entries.filter(e => 
                  e.timestamp.getDate() === day && 
                  e.timestamp.getMonth() === now.getMonth() &&
                  e.timestamp.getFullYear() === now.getFullYear()
                );
                const hasEntry = dayEntries.length > 0;
                const lastEmo = hasEntry ? EMOTIONS.find(e => e.id === dayEntries[dayEntries.length - 1].emotionId) : null;
                
                return (
                  <div key={i} className={`aspect-square flex items-center justify-center text-sm font-medium relative ${hasEntry ? 'text-white' : 'text-brio-dark'}`}>
                    {hasEntry && lastEmo && (
                      <div className={`absolute inset-0 rounded-xl ${lastEmo.bgColor}`} style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} />
                    )}
                    <span className="relative z-10">{day < 10 ? `0${day}` : day}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-8">
              <h3 className="text-xl font-serif mb-4">Registros del mes</h3>
              <div className="flex flex-col gap-4">
                {entries
                  .filter(e => e.timestamp.getMonth() === new Date().getMonth())
                  .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                  .map(entry => {
                    const emo = EMOTIONS.find(e => e.id === entry.emotionId);
                    return (
                      <div key={entry.id} className="flex items-center gap-4 p-4 bg-brio-card rounded-2xl border border-brio-dark/5">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <div className="scale-50">{emo?.icon}</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium text-sm">{emo?.name}</h4>
                            <span className="text-[10px] text-brio-dark/40">{entry.timestamp.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                          </div>
                          <p className="text-xs text-brio-dark/60 line-clamp-1">{entry.note || 'Sin notas'}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [screen, setScreen] = React.useState<Screen>('splash');
  const [user, setUser] = React.useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [userName, setUserName] = React.useState('');
  const [age, setAge] = React.useState('');
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [selectedEmotion, setSelectedEmotion] = React.useState<Emotion>(EMOTIONS[0]);
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<Entry | null>(null);
  const [note, setNote] = React.useState('');
  const [frequency, setFrequency] = React.useState('De vez en cuando');
  const [notifications, setNotifications] = React.useState(true);

  // Auth Listener
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Initial Splash Timer
  React.useEffect(() => {
    if (screen === 'splash') {
      const timer = setTimeout(() => {
        if (isAuthReady) {
          setScreen(user ? 'home' : 'welcome');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [screen, isAuthReady, user]);

  // Firestore Sync
  React.useEffect(() => {
    if (!user || !isAuthReady) {
      setEntries([]);
      return;
    }

    const entriesRef = collection(db, 'users', user.uid, 'entries');
    const q = query(entriesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const syncedEntries: Entry[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(data.timestamp)
        } as Entry;
      });
      setEntries(syncedEntries);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/entries`);
    });

    return () => unsubscribe();
  }, [user, isAuthReady]);

  const handleSaveEntry = async () => {
    if (!user) return;

    const entryId = editingEntry ? editingEntry.id : crypto.randomUUID();
    const entryData = {
      id: entryId,
      userId: user.uid,
      emotionId: selectedEmotion.id,
      timestamp: editingEntry ? editingEntry.timestamp : new Date(),
      note: note,
    };

    try {
      const entryRef = doc(db, 'users', user.uid, 'entries', entryId);
      await setDoc(entryRef, entryData);
      setNote('');
      setEditingEntry(null);
      setScreen('home');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/entries/${entryId}`);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'entries', id));
      setScreen('home');
      setEditingEntry(null);
      setNote('');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/entries/${id}`);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const firebaseUser = await loginWithGoogle();
      // Save user profile to Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          createdAt: serverTimestamp()
        });
      }
      setScreen('home');
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setScreen('welcome');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  if (!isAuthReady && screen === 'splash') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-brio-cream">
        <div className="text-brio-dark text-8xl font-serif mb-4 animate-pulse">✿</div>
        <h1 className="text-brio-dark text-6xl font-serif">Brío</h1>
      </div>
    );
  }

  const renderScreen = () => {
    switch (screen) {
      case 'splash':
        return (
          <motion.div 
            key="splash"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="h-screen flex flex-col items-center justify-center bg-brio-cream"
          >
            <div className="text-brio-dark text-8xl font-serif mb-4">✿</div>
            <h1 className="text-brio-dark text-6xl font-serif">Brío</h1>
          </motion.div>
        );

      case 'welcome':
        return (
          <motion.div 
            key="welcome"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="h-screen flex flex-col items-center justify-between py-16 px-8 text-center"
          >
            <div className="flex flex-col items-center">
              <div className="text-brio-dark text-6xl font-serif mb-2">✿ Brío</div>
              <p className="text-xl text-brio-dark/80 max-w-[250px]">Bienestar emocional mediante registro diario</p>
            </div>
            
            <div className="w-64 h-64 rounded-full bg-red-900/10 flex items-center justify-center overflow-hidden">
               <div className="w-full h-full bg-gradient-to-b from-red-900 to-orange-200 opacity-80" style={{ clipPath: 'circle(50% at 50% 50%)' }} />
            </div>

            <div className="flex flex-col items-center gap-8 w-full">
              <p className="text-lg text-brio-dark font-medium">Construye tu mejor yo<br/>Encuentra tus patrones<br/>Cuenta tu día</p>
              <button 
                onClick={() => setScreen('login-options')}
                className="w-full py-4 rounded-full border border-brio-dark text-brio-dark text-lg font-medium hover:bg-brio-dark hover:text-white transition-colors"
              >
                Comenzar
              </button>
            </div>
          </motion.div>
        );

      case 'login-options':
        return (
          <motion.div 
            key="login-options"
            initial={{ y: 20, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            className="h-screen flex flex-col items-center justify-center px-8 bg-orange-200/30"
          >
            <div className="w-64 h-64 rounded-full bg-red-900 mb-12 flex items-center justify-center overflow-hidden">
               <div className="w-full h-full bg-white/20" style={{ clipPath: 'circle(40% at 30% 30%)' }} />
            </div>
            
            <h2 className="text-2xl text-brio-dark font-serif text-center mb-8">Estás a un paso de empezar a sentir</h2>
            
            <div className="w-full bg-white/50 p-8 rounded-3xl flex flex-col gap-4">
              <button onClick={handleGoogleLogin} className="w-full py-4 bg-white rounded-2xl border border-brio-dark/10 flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 transition-colors">
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                <span className="font-bold text-lg text-brio-dark">Iniciar sesión con Google</span>
              </button>
              <button onClick={() => setScreen('login-name')} className="w-full py-4 bg-white rounded-2xl border border-brio-dark/10 flex items-center justify-center gap-3 shadow-sm">
                <span className="text-2xl"></span> Iniciar sesión con Apple
              </button>
              <button onClick={() => setScreen('login-name')} className="w-full py-4 bg-brio-card rounded-2xl border border-brio-dark/10 text-brio-dark font-medium">
                Seguir sin cuenta
              </button>
              
              <p className="text-xs text-center text-brio-dark/60 mt-4">
                Al iniciar sesión aceptas:<br/>Terminos y Condiciones
              </p>
            </div>
          </motion.div>
        );

      case 'login-name':
        return (
          <motion.div 
            key="login-name"
            initial={{ x: 50, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            className="h-screen flex flex-col p-8 justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-12">
                <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-1/3 bg-brio-dark" />
                </div>
                <X className="ml-4 text-brio-dark" onClick={() => setScreen('welcome')} />
              </div>
              <span className="text-brio-dark/60">1/3</span>
              <h2 className="text-4xl font-serif text-brio-dark mt-4 mb-12">¿Cuál es su nombre o apodo?</h2>
              <input 
                type="text" 
                placeholder="Toca para escribir"
                className="w-full p-6 bg-white rounded-2xl border border-brio-dark/20 text-xl outline-none focus:border-brio-dark transition-colors"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
              />
              <p className="text-sm text-brio-dark/60 mt-4">Tranquilo, tus datos solo se usan para los resultados.</p>
            </div>
            
            <div className="flex gap-4">
              <button onClick={() => setScreen('login-options')} className="flex-1 py-4 rounded-2xl border border-brio-dark text-brio-dark font-medium">Atrás</button>
              <button onClick={() => setScreen('login-age')} className="flex-1 py-4 rounded-2xl bg-brio-dark text-white font-medium">Siguiente</button>
            </div>
          </motion.div>
        );

      case 'login-age':
        return (
          <motion.div 
            key="login-age"
            initial={{ x: 50, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            className="h-screen flex flex-col p-8 justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-12">
                <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-brio-dark" />
                </div>
                <X className="ml-4 text-brio-dark" onClick={() => setScreen('welcome')} />
              </div>
              <span className="text-brio-dark/60">2/3</span>
              <h2 className="text-4xl font-serif text-brio-dark mt-4 mb-12">¿Cuál es su edad?</h2>
              <input 
                type="number" 
                placeholder="Toca para escribir"
                className="w-full p-6 bg-white rounded-2xl border border-brio-dark/20 text-xl outline-none focus:border-brio-dark transition-colors"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
              <p className="text-sm text-brio-dark/60 mt-4">Tranquilo, tus datos solo se usan para los resultados.</p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <button onClick={() => setScreen('login-name')} className="flex-1 py-4 rounded-2xl border border-brio-dark text-brio-dark font-medium">Atrás</button>
                <button onClick={() => setScreen('login-freq')} className="flex-1 py-4 rounded-2xl bg-brio-dark text-white font-medium">Siguiente</button>
              </div>
              <p className="text-xs text-center text-brio-dark/60">¿Prefieres no decirlo? ¡No hay problema! Pulsa en "Siguiente"</p>
            </div>
          </motion.div>
        );

      case 'login-freq':
        return (
          <motion.div 
            key="login-freq"
            initial={{ x: 50, opacity: 0 }} 
            animate={{ x: 0, opacity: 1 }}
            className="h-screen flex flex-col p-8 justify-between"
          >
            <div>
              <div className="flex justify-between items-center mb-12">
                <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-brio-dark" />
                </div>
                <X className="ml-4 text-brio-dark" onClick={() => setScreen('welcome')} />
              </div>
              <span className="text-brio-dark/60">3/3</span>
              <h2 className="text-3xl font-serif text-brio-dark mt-4 mb-12">¿Con qué frecuencia reflexionas o llevas un registro fuera de Brio?</h2>
              
              <div className="flex flex-col gap-4 p-6 bg-white rounded-3xl border border-brio-dark/10">
                {['Mucha frecuencia', 'De vez en cuando', 'Casi nunca', 'Nunca'].map((opt) => (
                  <label key={opt} className="flex items-center gap-4 cursor-pointer group" onClick={() => setFrequency(opt)}>
                    <div className={`w-6 h-6 rounded border border-brio-dark flex items-center justify-center transition-colors ${frequency === opt ? 'bg-brio-dark' : 'bg-transparent'}`}>
                      <Check size={16} className={`text-white transition-opacity ${frequency === opt ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                    <span className={`transition-colors ${frequency === opt ? 'text-brio-dark font-bold' : 'text-brio-dark/80'}`}>{opt}</span>
                  </label>
                ))}
              </div>
              
              <p className="text-sm text-brio-dark/60 mt-8">Tranquilo, tus datos solo se usan para los resultados.</p>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <button onClick={() => setScreen('login-age')} className="flex-1 py-4 rounded-2xl border border-brio-dark text-brio-dark font-medium">Atrás</button>
                <button onClick={() => setScreen('login-prefs')} className="flex-1 py-4 rounded-2xl bg-brio-dark text-white font-medium">Comenzar</button>
              </div>
              <p className="text-xs text-center text-brio-dark/60">¿Prefieres no decirlo? ¡No hay problema! Pulsa en "Siguiente"</p>
            </div>
          </motion.div>
        );

      case 'login-prefs':
        return (
          <motion.div 
            key="login-prefs"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="h-screen flex flex-col p-8 justify-between items-center text-center"
          >
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 text-brio-dark mb-8 flex items-center justify-center">
                <div className="relative">
                   <div className="text-8xl">✿</div>
                   <div className="absolute inset-0 flex items-center justify-center text-white">
                     <div className="w-12 h-16 bg-white rounded-t-full mt-2" />
                   </div>
                </div>
              </div>
              <h2 className="text-4xl font-serif text-brio-dark mb-12">Preferencias</h2>
              
              <div className="w-full flex flex-col gap-8 text-left">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="bg-brio-dark text-white text-[10px] px-2 py-1 rounded-full uppercase font-bold">Recomendado</span>
                    <h3 className="text-xl font-medium mt-2">Recordatorio diario</h3>
                    <p className="text-sm text-brio-dark/60">Permitir notificaciones</p>
                  </div>
                  <button 
                    onClick={() => setNotifications(!notifications)}
                    className={`w-14 h-8 rounded-full relative p-1 transition-colors duration-300 ${notifications ? 'bg-brio-dark' : 'bg-gray-200'}`}
                  >
                    <motion.div 
                      animate={{ x: notifications ? 24 : 0 }}
                      className="w-6 h-6 bg-white rounded-full shadow-sm" 
                    />
                  </button>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium">Hora de recordatorio</h3>
                  <p className="text-sm text-brio-dark/60">No establecido</p>
                </div>
                
                <div>
                  <h3 className="text-xl font-medium">Idioma de entrada</h3>
                  <p className="text-sm text-brio-dark/60">Español</p>
                </div>
              </div>
            </div>
            
            <div className="w-full flex flex-col gap-6">
              <button onClick={() => setScreen('home')} className="w-full py-4 rounded-full border border-brio-dark text-brio-dark font-medium">Comenzar</button>
              <div className="bg-brio-card p-4 rounded-2xl flex items-center gap-4 text-left">
                <div className="w-8 h-8 flex items-center justify-center">🔔</div>
                <p className="text-[10px] text-brio-dark/60 leading-tight">Solo te enviaremos notificaciones importantes y recordatorios de reflexión</p>
              </div>
            </div>
          </motion.div>
        );

      case 'home':
        const lastEntry = entries[entries.length - 1];
        const currentBgColor = lastEntry ? EMOTIONS.find(e => e.id === lastEntry.emotionId)?.bgColor || 'bg-brio-pink' : 'bg-brio-pink';

        return (
          <div key="home" className={`h-screen flex flex-col ${currentBgColor} relative overflow-hidden transition-colors duration-500`}>
            <Header onCalendar={() => setIsCalendarOpen(true)} onSettings={() => setScreen('settings')} />
            
            <div className="flex-1 bg-[#FDF6E9] rounded-t-[60px] flex flex-col overflow-y-auto no-scrollbar pb-48">
              <div className="text-center mt-16 px-6">
                <h1 className="text-5xl font-serif text-brio-dark font-bold">Hola,</h1>
                <p className="text-base text-brio-dark mt-3 font-medium">Tómate un momento, ¿cómo estás hoy?</p>
              </div>
              
              <div className="w-full flex items-center overflow-x-auto no-scrollbar gap-4 sm:gap-8 py-12 sm:py-20 px-6 sm:px-10 snap-x snap-mandatory">
                {EMOTIONS.map((emo) => {
                  const isActive = selectedEmotion.id === emo.id;
                  return (
                    <motion.div 
                      key={emo.id}
                      whileTap={{ scale: 0.95 }}
                      onViewportEnter={() => setSelectedEmotion(emo)}
                      viewport={{ amount: 0.8 }}
                      onClick={() => {
                        if (isActive) {
                          setEditingEntry(null);
                          setNote('');
                          setScreen('emotion-detail');
                        }
                      }}
                      className={`min-w-[240px] xs:min-w-[280px] sm:min-w-[340px] h-[400px] xs:h-[440px] sm:h-[540px] rounded-[120px] xs:rounded-[140px] sm:rounded-[170px] flex flex-col items-center justify-center gap-8 sm:gap-12 cursor-pointer transition-all duration-500 snap-center relative border-4 border-brio-dark/5 ${isActive ? 'bg-white shadow-[0_40px_100px_rgba(59,130,246,0.2)] scale-105 z-10' : 'bg-[#E5E1D8] opacity-40 scale-90'}`}
                    >
                      <div className="transition-transform duration-500 scale-[1.1] xs:scale-[1.3] sm:scale-[1.6]">
                        {emo.icon}
                      </div>
                      <span className={`font-serif text-brio-dark transition-all duration-500 ${isActive ? 'text-4xl xs:text-5xl sm:text-7xl' : 'text-3xl xs:text-4xl sm:text-6xl'}`}>
                        {emo.name}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
              
              <div className="text-center mb-10 px-6">
                <p className="text-base text-brio-dark font-medium max-w-[300px] mx-auto leading-relaxed">
                  {selectedEmotion.message}
                  <br />
                  <span className="text-sm opacity-60 font-normal">Gracias por escucharte hoy.</span>
                </p>
              </div>
              
              <div className="flex flex-col gap-4 px-6">
                <div className="flex flex-col gap-3">
                  {entries.length === 0 ? (
                    <div className="w-full py-6 bg-white border-2 border-brio-dark/10 rounded-3xl text-center text-brio-dark/80 font-bold text-base shadow-sm">
                      Aún no hay registros para mostrar
                    </div>
                  ) : (
                    <>
                      <h3 className="text-xl font-bold px-2 text-brio-dark">Registros recientes</h3>
                      {[...entries].reverse().map((entry) => {
                        const emo = EMOTIONS.find(e => e.id === entry.emotionId)!;
                        return (
                          <motion.div 
                            key={entry.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                              setSelectedEmotion(emo);
                              setEditingEntry(entry);
                              setNote(entry.note);
                              setScreen('emotion-detail');
                            }}
                            className="p-5 bg-white rounded-3xl border-2 border-brio-dark flex items-center justify-between shadow-md cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="scale-50">{emo.icon}</div>
                              <div className="flex flex-col">
                                <span className="font-bold text-brio-dark text-lg">{emo.name}</span>
                                <span className="text-xs text-brio-dark/40 uppercase font-black">
                                  {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                            <ChevronRight size={24} className="text-brio-dark" />
                          </motion.div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <BottomNav active="home" onChange={setScreen} />
            <CalendarOverlay isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} entries={entries} />
          </div>
        );

      case 'emotion-detail':
        return (
          <div key="emotion-detail" className={`h-screen flex flex-col ${selectedEmotion.bgColor} relative overflow-hidden transition-colors duration-500`}>
            <Header 
              title={editingEntry ? "Modificar registro" : "Nuevo registro"} 
              showBack 
              onBack={() => setScreen('home')} 
              onSettings={() => setScreen('settings')} 
            />
            
            <div className="flex-1 bg-brio-cream rounded-t-[40px] mt-4 p-6 flex flex-col overflow-y-auto no-scrollbar pb-32">
              <div className="text-center mt-4">
                <h1 className="text-4xl font-serif text-brio-dark">{editingEntry ? '¿Algo más que añadir?' : '¡Bien hecho!'}</h1>
                <p className="text-lg text-brio-dark/80 mt-2">Tus vibras están al máximo. ¡A disfrutar!</p>
              </div>
              
              <div className="w-full mt-8 p-8 bg-white rounded-[40px] shadow-xl flex flex-col items-center gap-6 border border-brio-dark/5">
                <div className="scale-110">{selectedEmotion.icon}</div>
                <div className="text-center">
                  <span className="text-sm text-brio-dark/60">Me siento</span>
                  <h2 className="text-4xl font-serif text-brio-dark mt-1">{selectedEmotion.name}</h2>
                </div>
                <p className="text-center text-brio-dark/80 px-4 text-sm">{selectedEmotion.detailMessage}</p>
                
                <div className="w-full flex flex-col gap-4 mt-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold uppercase text-brio-dark/40 ml-2">Contexto</label>
                    <textarea 
                      placeholder="¿Qué te hace sentir así? Escribe aquí..."
                      className="w-full p-4 bg-brio-card rounded-2xl text-sm outline-none focus:ring-1 focus:ring-brio-dark/20 min-h-[100px] resize-none"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-4 bg-white border border-brio-dark/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold">
                      <Camera size={16} /> Foto
                    </button>
                    <button className="p-4 bg-white border border-brio-dark/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold">
                      <Mic size={16} /> Audio
                    </button>
                  </div>
                </div>

                <button 
                  onClick={handleSaveEntry}
                  className="w-full py-4 bg-brio-dark text-white rounded-full font-medium shadow-lg hover:bg-brio-dark/90 transition-colors mt-4"
                >
                  {editingEntry ? 'Guardar cambios' : 'Registrar emoción'}
                </button>
              </div>
              
              {editingEntry && (
                <button 
                  onClick={() => handleDeleteEntry(editingEntry.id)}
                  className="mt-6 text-red-500 font-medium text-sm text-center"
                >
                  Eliminar registro
                </button>
              )}
            </div>
            
            <BottomNav active="home" onChange={setScreen} />
            <CalendarOverlay isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} entries={entries} />
          </div>
        );

      case 'stats':
        const emotionCounts = EMOTIONS.reduce((acc, emo) => {
          acc[emo.id] = entries.filter(e => e.emotionId === emo.id).length;
          return acc;
        }, {} as Record<string, number>);

        const totalEntries = entries.length;
        const positiveCount = entries.filter(e => ['radiante', 'feliz', 'motivado'].includes(e.emotionId)).length;
        const negativeCount = entries.filter(e => ['triste'].includes(e.emotionId)).length;
        const positivePercent = totalEntries > 0 ? (positiveCount / totalEntries) * 100 : 0;

        return (
          <div key="stats" className="h-screen flex flex-col bg-green-200 relative overflow-hidden">
            <div className="flex justify-between items-center px-6 py-8">
              <div className="flex flex-col">
                <h1 className="text-2xl font-medium text-brio-dark">Tu mapa emocional</h1>
                <p className="text-xs text-brio-dark/60">Descubre los ritmos que te acompañan</p>
              </div>
              <button onClick={() => setScreen('settings')} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-brio-dark/10">
                <Settings size={24} />
              </button>
            </div>
            
            <div className="flex-1 bg-brio-cream rounded-t-[40px] mt-4 p-6 overflow-y-auto no-scrollbar pb-32">
              <StatCard title="Racha de días">
                <div className="flex justify-between items-center mt-4">
                  {['Lun', 'Mar', 'Mier', 'Jue', 'Hoy'].map((d, i) => (
                    <div key={d} className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full border-2 border-brio-dark flex items-center justify-center ${i >= 2 || entries.length > 0 ? 'bg-brio-dark text-white' : ''}`}>
                        {i >= 2 || entries.length > 0 ? <Check size={16} /> : null}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-brio-dark/60">{d}</span>
                    </div>
                  ))}
                  <div className="w-12 h-12 rounded-2xl border-2 border-brio-dark flex items-center justify-center text-2xl font-serif">
                    {entries.length > 0 ? '1' : '0'}
                  </div>
                </div>
                <p className="text-sm text-brio-dark mt-6 flex items-center gap-2">🏆 Racha más larga: <span className="font-bold">{entries.length > 0 ? '1' : '0'}</span></p>
              </StatCard>

              <StatCard title="Contador de Estados" showShare>
                <div className="relative flex justify-center mt-8">
                  <div className="w-48 h-24 border-t-[30px] border-l-[30px] border-r-[30px] border-orange-400 rounded-t-full border-b-0" />
                  <div className="absolute bottom-0 text-4xl font-serif">{totalEntries}</div>
                </div>
                <div className="flex justify-between mt-8">
                  {EMOTIONS.map(e => (
                    <div key={e.id} className="flex flex-col items-center gap-1">
                      <div className="relative">
                        <div className="w-10 h-10 bg-white rounded-2xl border border-brio-dark/10 flex items-center justify-center shadow-sm">
                          <div className="scale-50">{e.icon}</div>
                        </div>
                        {emotionCounts[e.id] > 0 && (
                          <span className="absolute -top-2 -right-2 bg-brio-pink text-white text-[10px] px-1.5 rounded-full border border-white">
                            {emotionCounts[e.id]}
                          </span>
                        )}
                      </div>
                      <span className="text-[8px] uppercase font-bold text-brio-dark/60">{e.name}</span>
                    </div>
                  ))}
                </div>
              </StatCard>

              <StatCard title="Tendencias generales">
                <p className="text-xs text-brio-dark/60">¿Cuántos días estuviste de buen humor?</p>
                <div className="w-full h-12 bg-gray-100 rounded-full mt-4 relative overflow-hidden flex">
                  <div className="h-full bg-orange-400 transition-all duration-500" style={{ width: `${positivePercent}%` }} />
                  <div className="h-full bg-blue-400 transition-all duration-500" style={{ width: `${totalEntries > 0 ? (negativeCount / totalEntries) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-bold text-brio-dark/60">
                  <span>{positiveCount} {positiveCount === 1 ? 'día' : 'días'}</span>
                  <span>{negativeCount} {negativeCount === 1 ? 'día' : 'días'}</span>
                </div>
                <div className="flex gap-4 mt-6">
                  <div className="flex-1 p-4 bg-brio-card rounded-2xl">
                    <span className="text-[10px] text-brio-dark/60">Días negativos</span>
                    <p className="text-lg font-medium">{negativeCount} {negativeCount === 1 ? 'día' : 'días'}</p>
                  </div>
                  <div className="flex-1 p-4 bg-orange-100 rounded-2xl relative">
                    <span className="text-[10px] text-brio-dark/60">Días positivos</span>
                    <p className="text-lg font-medium">{positiveCount} {positiveCount === 1 ? 'día' : 'días'}</p>
                    {positiveCount > 0 && <div className="absolute bottom-4 right-4 bg-brio-dark text-white p-1 rounded-full"><Check size={12} /></div>}
                  </div>
                </div>
                {totalEntries > 0 && (
                  <div className="mt-4 p-4 bg-white/50 border border-brio-dark/10 rounded-2xl text-center text-xs text-brio-dark/80 italic">
                    {positivePercent > 50 ? '¡Estás en racha! Nos alegra verte feliz, sigue así.' : 'Cada día es una nueva oportunidad. ¡Ánimo!'}
                  </div>
                )}
              </StatCard>
            </div>
            
            <BottomNav active="stats" onChange={setScreen} />
            <CalendarOverlay isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} entries={entries} />
          </div>
        );

      case 'space':
        return (
          <div key="space" className="h-screen flex flex-col bg-sky-400 relative overflow-hidden">
            <div className="flex justify-between items-center px-6 py-8">
              <div className="flex flex-col">
                <h1 className="text-2xl font-medium text-brio-dark">Tu espacio personal</h1>
                <p className="text-xs text-brio-dark/60">Pequeñas acciones para sentirte mejor</p>
              </div>
              <button onClick={() => setScreen('settings')} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-brio-dark/10">
                <Settings size={24} />
              </button>
            </div>
            
            <div className="flex-1 bg-brio-cream rounded-t-[40px] mt-4 p-6 overflow-y-auto no-scrollbar pb-32">
              <div className="p-6 bg-white rounded-[32px] shadow-sm border border-brio-dark/5 flex justify-between items-center mb-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-serif leading-tight">¡Completaste tu día!</h2>
                  <p className="text-sm text-brio-dark/80 mt-2 font-medium">Logro de hábitos desbloqueado</p>
                  <p className="text-[10px] text-brio-dark/60 mt-1 italic">"Por finalizar exitosamente tus 3 retos diarios"</p>
                </div>
                <div className="w-20 h-20 rounded-full border-4 border-brio-dark flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-4 border-brio-dark flex items-center justify-center">
                    <div className="w-4 h-4 rounded-full bg-brio-dark" />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-medium">Retos diarios</h3>
                  <div className="flex gap-4">
                    <Search size={20} className="text-brio-dark/60" />
                    <Share2 size={20} className="text-brio-dark/60" />
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {[
                    { text: 'Escribe tres cosas que te salieron bien hoy', color: 'bg-green-100' },
                    { text: 'Apaga el móvil 15 minutos y respira', color: 'bg-blue-100' },
                    { text: 'Piensa en cinco cosas que te hacen especial', color: 'bg-pink-100' }
                  ].map((reto, i) => (
                    <div key={i} className={`p-4 rounded-2xl flex items-center gap-4 ${reto.color} border border-brio-dark/5`}>
                      <div className="w-6 h-6 rounded-md border border-brio-dark bg-white" />
                      <span className="text-sm text-brio-dark/80 font-medium">{reto.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-medium">Herramientas de reflexión</h3>
                </div>
                
                <Section title="Meditación guiada" onMore={() => {}}>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                    <ToolCard title="Meditación Metta" color="bg-orange-100" onClick={() => setScreen('meditation')} />
                    <ToolCard title="Aliviar Ansiedad" color="bg-green-100" onClick={() => setScreen('meditation')} />
                    <ToolCard title="Auto Compasión" color="bg-pink-100" onClick={() => setScreen('meditation')} />
                  </div>
                </Section>

                <Section title="Afirmaciones" onMore={() => {}}>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                    <ToolCard title="Auto-Estima" color="bg-sky-100" />
                    <ToolCard title="Gratitud Matutina" color="bg-purple-100" />
                    <ToolCard title="Dejar ir y Soltar" color="bg-orange-100" />
                  </div>
                </Section>

                <Section title="Respiración" onMore={() => {}}>
                  <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                    <ToolCard title="Respiración Cuadrada" color="bg-pink-200" />
                    <ToolCard title="Respiración 4-7-8" color="bg-orange-100" />
                    <ToolCard title="Respiración León" color="bg-green-100" />
                  </div>
                </Section>
              </div>

              <div className="p-8 bg-brio-card/50 rounded-3xl text-center text-xs text-brio-dark/60 leading-relaxed italic">
                Gracias por permitirnos formar parte de tu viaje emocional, este es tu espacio seguro.
              </div>
            </div>
            
            <BottomNav active="space" onChange={setScreen} />
            <CalendarOverlay isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} entries={entries} />
          </div>
        );

      case 'meditation':
        return (
          <motion.div 
            key="meditation"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="h-screen flex flex-col bg-brio-cream p-8"
          >
            <Header title="Meditación" showBack onBack={() => setScreen('space')} onSettings={() => setScreen('settings')} />
            
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="w-72 h-72 rounded-full bg-orange-100 border-4 border-brio-dark flex items-center justify-center overflow-hidden mb-12">
                <div className="w-full h-full bg-cover bg-center opacity-80 flex items-center justify-center" style={{ backgroundImage: 'url(https://picsum.photos/seed/meditation/400/400)' }}>
                  <div className="scale-150">{EMOTIONS[0].icon}</div>
                </div>
              </div>
              
              <h2 className="text-4xl font-serif text-brio-dark">Metta Meditación</h2>
              <p className="text-brio-dark/60 mt-2">Reproduciendo</p>
              
              <div className="w-full mt-12">
                <div className="flex items-center gap-4 mb-8">
                  <span className="text-xs font-bold">1:30</span>
                  <div className="flex-1 h-1 bg-brio-dark/10 relative rounded-full">
                    <div className="absolute top-0 left-0 h-full w-1/3 bg-brio-dark rounded-full" />
                    <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-3 h-3 bg-brio-dark rounded-full" />
                  </div>
                  <span className="text-xs font-bold">5:00</span>
                </div>
                
                <div className="flex justify-center items-center gap-12">
                  <SkipBack size={32} className="text-brio-dark fill-brio-dark" />
                  <button className="w-20 h-20 bg-brio-dark rounded-full flex items-center justify-center text-white shadow-lg">
                    <Play size={32} fill="white" />
                  </button>
                  <SkipForward size={32} className="text-brio-dark fill-brio-dark" />
                </div>
              </div>
            </div>
            
            <BottomNav active="space" onChange={setScreen} />
            <CalendarOverlay isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} entries={entries} />
          </motion.div>
        );

      case 'settings':
        return (
          <motion.div 
            key="settings"
            initial={{ y: 100, opacity: 0 }} 
            animate={{ y: 0, opacity: 1 }}
            className="h-screen flex flex-col bg-brio-cream p-8 overflow-y-auto no-scrollbar"
          >
            <Header title="Ajustes" showBack onBack={() => setScreen('home')} />
            
            <div className="flex flex-col gap-6 pb-32">
              <div className="bg-white p-6 rounded-[32px] border border-brio-dark/5 shadow-sm flex items-center gap-4 mb-4">
                <div className="w-16 h-16 bg-brio-pink rounded-full border-2 border-brio-dark overflow-hidden flex items-center justify-center">
                  {user?.photoURL ? (
                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-brio-dark">
                      {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-brio-dark text-lg">{user?.displayName || 'Usuario'}</h3>
                  <p className="text-sm text-brio-dark/60">{user?.email}</p>
                </div>
              </div>

              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 flex items-center justify-center">🌐</div>
                  <span className="font-medium">Idioma</span>
                </div>
                <div className="flex items-center gap-2 text-brio-dark/60">
                  <span>Español</span>
                  <ChevronRight size={20} />
                </div>
              </div>

              <SettingsGroup>
                <SettingsItem label="Notificaciones" toggle />
                <SettingsItem label="Estilo de mensajes" value="Neutral" />
                <SettingsItem label="Frecuencia de recordatorios" value="Nunca" />
                <SettingsItem label="Consejo del día" value="Una vez al día" />
              </SettingsGroup>

              <SettingsGroup>
                <SettingsItem label="Privacidad y seguridad" />
                <SettingsItem label="Bloqueo con huella / PIN" value="Activado" />
                <SettingsItem label="Borrar registros" />
                <SettingsItem label="Exportar mis datos" />
              </SettingsGroup>

              <SettingsGroup>
                <SettingsItem label="Sobre esta app" />
                <SettingsItem label="Ayuda y FAQ" />
              </SettingsGroup>

              <button 
                onClick={handleLogout}
                className="w-full py-5 bg-red-50 text-red-600 rounded-3xl border-2 border-red-100 font-bold flex items-center justify-center gap-2 mt-4"
              >
                <LogOut size={20} />
                Cerrar sesión
              </button>
            </div>
            
            <BottomNav active="home" onChange={setScreen} />
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-md mx-auto bg-brio-cream min-h-screen relative overflow-hidden shadow-2xl">
      <AnimatePresence mode="wait">
        {renderScreen()}
      </AnimatePresence>
    </div>
  );
}
