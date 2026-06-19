import { useState, useEffect } from 'react'
import { ArrowLeft, Save, Loader } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { updateLegalDocument, getLegalDocument } from '../api/legal.api'
import LoadingSpinner from '../components/LoadingSpinner'

export default function LegalManagementPage() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('privacy_policy')
    const [content, setContent] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [originalContent, setOriginalContent] = useState('')

    const tabs = [
        { id: 'privacy_policy', label: 'Maxfiylik Siyosati (Privacy Policy)' },
        { id: 'public_offer', label: 'Ommaviy Oferta (Public Offer)' }
    ]

    useEffect(() => {
        fetchContent()
    }, [activeTab])

    const fetchContent = async () => {
        try {
            setLoading(true)
            const response = await getLegalDocument(activeTab)
            const documentContent = response.data?.content || response.content || ''
            setContent(documentContent)
            setOriginalContent(documentContent)
        } catch (error) {
            toast.error(`Hujjatni yuklashda xato: ${error.message}`)
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!content.trim()) {
            toast.error('Tarkibni to\'ldiring')
            return
        }

        try {
            setSaving(true)
            await updateLegalDocument(activeTab, content)
            setOriginalContent(content)
            toast.success('Hujjat muvaffaqiyatli yangilandi')
        } catch (error) {
            toast.error(`Saqlashda xato: ${error.message}`)
            console.error(error)
        } finally {
            setSaving(false)
        }
    }

    const handleBack = () => {
        if (content !== originalContent) {
            const confirmed = window.confirm('O\'zgarishlar saqlanmadi. Davom etasizmi?')
            if (!confirmed) return
        }
        navigate('/profile')
    }

    const hasChanges = content !== originalContent

    if (loading) {
        return <LoadingSpinner />
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={handleBack}
                    className="flex items-center gap-2 mb-6 text-blue-500 font-medium active:opacity-60 transition-opacity"
                >
                    <ArrowLeft size={18} />
                    <span className="text-[16px] font-semibold">Orqaga</span>
                </button>

                <div className="card dark:bg-gray-800 shadow-sm">
                    <div className="border-b border-gray-200 dark:border-gray-700">
                        <div className="flex flex-wrap">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 ${
                                        activeTab === tab.id
                                            ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                            : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Hujjat Tarkibi (HTML yoki oddiy tekst)
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="Hujjat tarkibini kiritingiz..."
                                className="w-full h-96 p-4 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                            />
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                {hasChanges && <span className="text-orange-500 font-medium">● O'zgarishlar saqlanmadi</span>}
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges || saving}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? (
                                    <>
                                        <Loader size={18} className="animate-spin" />
                                        Saqlanmoqda...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Saqlash
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Maslahat:</strong> HTML tagi ishlatishingiz mumkin. Masalan: &lt;h2&gt;, &lt;p&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;strong&gt;, &lt;hr&gt; va boshqalar.
                    </p>
                </div>
            </div>
        </div>
    )
}
