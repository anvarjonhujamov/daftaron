import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import DebtSheet from '../features/DebtSheet'
import PaymentSheet from '../features/PaymentSheet'
import { useSession } from './session'

// Nasiya va to'lov oynalari istalgan sahifadan ochiladi (bosh sahifa, mijoz kartasi, N/T tugmalari)
const ActionsContext = createContext(null)

export function ActionsProvider({ children }) {
    const session = useSession()
    const [debt, setDebt] = useState(null)
    const [payment, setPayment] = useState(null)

    const guard = useCallback((perm, text) => {
        if (session.readOnly) {
            toast.error("Obuna tugagan — yangi yozuv qo'shib bo'lmaydi")
            return false
        }
        if (!session.can(perm)) {
            toast.error(text)
            return false
        }
        return true
    }, [session])

    const value = useMemo(() => ({
        openDebt: ({ customer } = {}) => guard('debt.create', "Nasiya yozishga huquqingiz yo'q") && setDebt({ customer }),
        openPayment: ({ customer, debt: d } = {}) => guard('payment.create', "To'lov olishga huquqingiz yo'q") && setPayment({ customer, debt: d })
    }), [guard])

    return (
        <ActionsContext.Provider value={value}>
            {children}
            <DebtSheet open={!!debt} customer={debt?.customer} onClose={() => setDebt(null)} />
            <PaymentSheet open={!!payment} customer={payment?.customer} debt={payment?.debt} onClose={() => setPayment(null)} />
        </ActionsContext.Provider>
    )
}

export const useActions = () => useContext(ActionsContext)
