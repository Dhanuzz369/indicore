'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSubjects, getQuestions, getQuestionCountBySubject, reportIssue } from '@/lib/appwrite/queries'
import { getCurrentUser } from '@/lib/appwrite/auth'
import { useQuizStore } from '@/store/quiz-store'
import { toast } from 'sonner'
import { 
  Loader2, ChevronRight, Search, SlidersHorizontal, 
  Lock, ArrowRight, Sparkles, User, LayoutGrid, Flag, FileText
} from 'lucide-react'
import type { Question, Subject } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

const PAPER_OPTIONS = [
  { examType: "UPSC_PRE", year: 2024, label: "GS Paper I", status: "active", theme: "orange", questions: 100, time: "2 Hr", marks: 200, id: "p1" },
  { examType: "UPSC_PRE", year: 2023, label: "GS Paper I", status: "active", theme: "black", questions: 100, time: "2 Hr", marks: 200, id: "p2" },
  { examType: "UPSC_PRE", year: 2022, label: "GS Paper I", status: "locked", theme: "gray", questions: 100, time: "2 Hr", marks: 200, id: "p3" },
]

const DIFFICULTY_OPTIONS = ['All', 'Easy', 'Medium', 'Hard'] as const
const QUESTION_COUNT_OPTIONS = [10, 20, 30, 50]

function getSubjectAccent(name: string) {
  const l = name.toLowerCase()
  if (l.includes('polity')) return { color: '#FF6B00', bg: 'bg-orange-50', icon: '⚖️' }
  if (l.includes('hist')) return { color: '#8B4513', bg: 'bg-[#FDF5E6]', icon: '🏛️' }
  if (l.includes('geo')) return { color: '#007AFF', bg: 'bg-blue-50', icon: '🌍' }
  if (l.includes('econ')) return { color: '#FF3B30', bg: 'bg-red-50', icon: '📈' }
  if (l.includes('environ')) return { color: '#34C759', bg: 'bg-green-50', icon: '🌿' }
  if (l.includes('science') || l.includes('tech')) return { color: '#5856D6', bg: 'bg-indigo-50', icon: '🔬' }
  return { color: '#FF6B00', bg: 'bg-orange-50', icon: '📚' }
}

function QuizSetupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const { setQuestions, setTestMode, setPaperLabel } = useQuizStore()

  const [activeTab, setActiveTab] = useState<'full' | 'subject'>(tabParam === 'subject' ? 'subject' : 'full')
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null)
  
  type SubjectWithCount = Subject & { count: number }
  const [subjects, setSubjects] = useState<SubjectWithCount[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All')
  const [questionCount, setQuestionCount] = useState(20)
  const [startLoading, setStartLoading] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    getCurrentUser().then(user => {
      if (user) setUserName(user.name || 'Aspirant')
    })

    const fetchSubjects = async () => {
      try {
        const result = await getSubjects()
        const subjectsData = result.documents as unknown as Subject[]
        const withCounts = await Promise.all(
          subjectsData.map(async (subj) => ({
            ...subj,
            count: await getQuestionCountBySubject(subj.$id)
          }))
        )
        setSubjects(withCounts)
      } catch {
        toast.error('Failed to load subjects')
      } finally {
        setLoadingSubjects(false)
      }
    }
    fetchSubjects()
  }, [])

  const handleStartTest = async (paper: typeof PAPER_OPTIONS[0]) => {
    if (paper.status === 'locked') {
      toast.info('This test is currently locked. Complete previous papers to unlock.')
      return
    }
    setLoadingCardId(paper.id)
    try {
      const result = await getQuestions({ limit: paper.questions, examType: paper.examType, year: paper.year })
      if (!result.documents?.length) { toast.error('No questions found for this paper.'); setLoadingCardId(null); return }
      setQuestions(result.documents as unknown as Question[])
      setTestMode(true)
      setPaperLabel(`${paper.label} ${paper.year}`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch (error) {
      toast.error('Failed to start test')
      setLoadingCardId(null)
    }
  }

  const handleStartPractice = async () => {
    if (!selectedSubject) return
    setStartLoading(true)
    try {
      const filters: Parameters<typeof getQuestions>[0] = { subjectId: selectedSubject.$id, limit: questionCount }
      if (selectedDifficulty !== 'All') filters.difficulty = selectedDifficulty.toLowerCase()
      const result = await getQuestions(filters)
      if (!result.documents?.length) { toast.error('No questions found. Try different filters.'); setStartLoading(false); return }
      setQuestions(result.documents as unknown as Question[])
      setTestMode(false)
      setPaperLabel(`${selectedSubject.Name} · Practice`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch (error) {
      toast.error('Failed to start practice')
      setStartLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-32">
      
      {/* ── HEADER ── */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
             <LayoutGrid className="h-6 w-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            {activeTab === 'full' ? 'Practice Selection' : 'PRACTICE LAB'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 shadow-sm text-gray-400 hover:text-[#FF6B00] transition-colors">
            <Search className="h-5 w-5" />
          </button>
          <div className="h-12 w-12 rounded-full bg-gray-900 border-2 border-white shadow-md overflow-hidden ring-4 ring-gray-50">
             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="User" />
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="max-w-3xl mx-auto px-6 mt-4">
        <div className="bg-gray-100 p-1.5 rounded-[2rem] flex h-16">
          <button 
            onClick={() => setActiveTab('full')}
            className={`flex-1 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'full' ? 'bg-[#FF6B00] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Full Length Test
          </button>
          <button 
            onClick={() => setActiveTab('subject')}
            className={`flex-1 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all ${activeTab === 'subject' ? 'bg-[#FF6B00] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Subject Practice
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 mt-16">
        
        {/* ── FULL LENGTH TEST VIEW ── */}
        {activeTab === 'full' && (
          <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tighter uppercase">UPSC CSE.</h2>
              <div className="flex bg-gray-100 p-1.5 rounded-full h-10 px-3 w-fit">
                <button className="text-[10px] font-black text-white bg-black rounded-full px-5 uppercase tracking-tighter">Prelims</button>
                <button className="text-[10px] font-black text-gray-400 px-5 uppercase tracking-tighter">Mains</button>
              </div>
            </div>

            {/* GS Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {PAPER_OPTIONS.map(paper => (
                <div key={paper.id} className="relative bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8 group hover:shadow-xl hover:border-orange-100 transition-all flex flex-col">
                  <div className="absolute top-6 right-8 text-[72px] font-black text-gray-50 opacity-100 select-none -z-10 tracking-tighter group-hover:scale-110 transition-transform">
                    {paper.year}
                  </div>
                  
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1 font-mono">UPSC PRELIMS</p>
                  <h3 className="text-2xl font-black text-gray-900 mb-8">{paper.label}</h3>

                  <div className="grid grid-cols-3 gap-4 mb-10 mt-auto">
                    <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Questions</p>
                      <p className="text-sm font-black text-gray-900">{paper.questions}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Duration</p>
                      <p className="text-sm font-black text-gray-900">{paper.time}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Marks</p>
                      <p className="text-sm font-black text-gray-900">{paper.marks}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleStartTest(paper)}
                    className={`h-16 w-full rounded-2xl flex items-center justify-center gap-3 font-black text-[11px] uppercase tracking-widest transition-all ${
                      paper.status === 'locked' 
                        ? 'bg-gray-50 text-gray-300 border border-gray-100' 
                        : paper.theme === 'black'
                          ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-gray-200'
                          : 'bg-[#FF6B00] text-white hover:bg-orange-600 shadow-lg shadow-orange-100'
                    }`}
                  >
                    {loadingCardId === paper.id ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>
                        Start Test {paper.status === 'locked' ? <Lock className="h-4 w-4" /> : <ArrowRight className="h-5 w-5" />}
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* ADAPTIVE LEARNING CARD */}
              <div className="lg:col-span-2 bg-[#111111] rounded-[2.5rem] overflow-hidden p-10 text-white relative">
                <span className="inline-block px-4 py-1.5 bg-[#FF6B00] text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
                  Adaptive Learning
                </span>
                <h3 className="text-4xl font-black tracking-tight leading-tight mb-6">Focus on Weak<br/>Subjects</h3>
                <p className="text-sm text-gray-400 font-medium leading-relaxed mb-10 max-w-md">
                  Our AI analyzed your recent mock tests. You should practice &apos;Ancient History&apos; and &apos;Art & Culture&apos; for higher impact scores.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <button 
                    onClick={() => setActiveTab('subject')}
                    className="w-full sm:w-auto bg-white text-black px-10 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 transition-colors shadow-xl"
                  >
                    Go to Subjects
                  </button>
                  <div className="flex -space-x-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-10 w-10 rounded-full border-4 border-[#111111] bg-gray-800 flex items-center justify-center overflow-hidden">
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}red`} alt="Aspirant" />
                      </div>
                    ))}
                    <div className="h-10 w-10 rounded-full border-4 border-[#111111] bg-orange-600 flex items-center justify-center text-[10px] font-black">+42</div>
                  </div>
                </div>
                
                <div className="hidden lg:block absolute right-0 bottom-0 w-1/3 h-full grayscale opacity-20 hover:opacity-40 transition-opacity">
                  <img 
                    src="https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=800" 
                    alt="Ancient" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* PREVIOUS ANALYSIS CARD */}
              <div className="bg-[#FFF8EF] rounded-[2.5rem] p-10 flex flex-col">
                <div className="h-14 w-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-8">
                  <Sparkles className="h-7 w-7 text-orange-600" />
                </div>
                <h4 className="text-2xl font-black text-gray-900 mb-4">Previous Analysis</h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed mb-10">
                  Review your mistakes from the 2023 prelims to improve your current score by up to 15%.
                </p>
                <button className="mt-auto text-[11px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2 hover:translate-x-2 transition-transform">
                  View Insights <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SUBJECT PRACTICE VIEW ── */}
        {activeTab === 'subject' && (
          <div className="space-y-12">
            <div className="mb-16">
              <h2 className="text-6xl md:text-8xl font-black text-gray-900 tracking-tighter leading-none">Subject-wise<br/>Practice</h2>
              <p className="text-lg text-gray-400 font-medium mt-6 max-w-xl leading-relaxed">Pick a subject and start practicing targeted PYQs from the world&apos;s most exhaustive database.</p>
            </div>

            {/* Subject Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loadingSubjects ? (
                 Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-[2.5rem]" />)
              ) : subjects.map(subj => {
                const accent = getSubjectAccent(subj.Name)
                
                return (
                  <div 
                    key={subj.$id} 
                    className="relative bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-8 hover:shadow-xl hover:border-orange-50 transition-all group flex flex-col"
                  >
                    <div 
                      className="absolute top-0 left-0 right-0 h-1.5" 
                      style={{ backgroundColor: accent.color }}
                    />
                    
                    <div className="flex items-start justify-between mb-8">
                      <div className={`h-16 w-16 ${accent.bg} rounded-3xl flex items-center justify-center text-3xl shadow-sm group-hover:scale-110 transition-transform`}>
                        {accent.icon}
                      </div>
                      <div className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${accent.bg}`} style={{ color: accent.color }}>
                        {subj.slug.split('-')[0]}
                      </div>
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 mb-2">{subj.Name}</h3>
                    <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest flex items-center gap-2 grayscale-0">
                      <FileText className="h-3 w-3" /> {subj.count} questions
                    </p>
                    
                    <button 
                      onClick={() => handleStartPracticeWithDefault(subj)}
                      className="mt-10 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-[#FF6B00] group-hover:translate-x-2 transition-transform h-12 w-fit px-6 rounded-2xl bg-orange-50/50 hover:bg-orange-50"
                    >
                      Start Practice <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* UNLOCK ALL CARD */}
            <div className="bg-gradient-to-tr from-[#FF6B00] to-orange-500 rounded-[3rem] p-12 text-white relative overflow-hidden mt-16 shadow-2xl shadow-orange-100">
               <div className="relative z-10 max-w-2xl">
                 <h3 className="text-4xl md:text-5xl font-black uppercase leading-tight mb-6">Unlock All<br/>Subjects</h3>
                 <p className="text-lg text-orange-100 font-medium mb-12 leading-relaxed">Get unlimited access to 10,000+ targeted PYQs and advanced analytics. Join 50,000+ aspirants preparing for UPSC 2025.</p>
                 <button className="w-full sm:w-auto px-12 py-5 bg-white text-black rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-[1.02] transition-transform">
                    Upgrade to Premium 👑
                 </button>
               </div>
               <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none">
                  <LayoutGrid className="w-full h-full rotate-12 scale-150" />
               </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )

  async function handleStartPracticeWithDefault(subj: Subject) {
    setSelectedSubject(subj)
    setStartLoading(true)
    try {
      const result = await getQuestions({ subjectId: subj.$id, limit: 20 })
      if (!result.documents?.length) { toast.error('No questions found.'); setStartLoading(false); return }
      setQuestions(result.documents as unknown as Question[])
      setTestMode(false)
      setPaperLabel(`${subj.Name} · Practice`)
      router.push('/quiz/session?id=' + crypto.randomUUID())
    } catch (error) {
       toast.error('Failed to start')
       setStartLoading(false)
    }
  }
}

export default function PracticePage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400 text-sm">Loading...</div>}>
      <QuizSetupContent />
    </Suspense>
  )
}
