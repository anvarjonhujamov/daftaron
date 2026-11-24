// AI yordamchi oynasini istalgan joydan ochish (Yordam sahifasi, Sozlamalar). Tinglovchi — AiAssistant (Layout'da)
export const AI_OPEN_EVENT = 'daftaron:ai-open'

export const openAiAssistant = () => window.dispatchEvent(new Event(AI_OPEN_EVENT))
