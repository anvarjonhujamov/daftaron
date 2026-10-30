// Backend javoblari (openapi v2.0.0 namunalari asosida). Har test o'z holatini o'zgartirishi mumkin.
const today = () => {
    const d = new Date(Date.now() + 5 * 3600 * 1000)
    return d.toISOString().slice(0, 10)
}
const addDays = (ymd, n) => {
    const [y, m, d] = ymd.split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export const fixtures = () => {
    const t = today()
    return {
        user: { id: 7, public_id: 1007, name: 'Xurshidbek', phone: '+998901234567', tenant_id: 12, auto_renew: true, referral_code: 'K7P2QX9A' },
        tenant: { id: 12, name: 'Barkamol Market', owner_id: 7 },
        settings: {
            profile: { id: 7, name: 'Xurshidbek', phone: '+998901234567', theme: 'light', language: 'uz_latn', login_method: 'otp', has_password: false },
            shop: { id: 12, name: 'Barkamol Market', category_id: 1, sms_sender_name: null, sms_name: 'Barkamol Market', address: null },
            notifications: { sms_on_debt: true, sms_on_payment: false, reminder_enabled: true, reminder_time: '09:00', reminder_interval_days: 3, reminder_max_count: 3, digest_enabled: false, digest_time: '20:00', owner_inactivity_reminder: true },
            permissions: ['debt.create', 'debt.delete', 'debt.over_limit', 'payment.create', 'payment.delete', 'customer.edit', 'reports.view', 'suppliers.manage', 'staff.manage', 'settings.manage'],
            legal: { offer: { version: '2026.10.29' }, privacy: { version: '2026.10.29' }, needs_acceptance: false },
            support: { telegram_support_url: 'https://t.me/daftaron_support', bot_url: 'https://t.me/daftaron_bot' },
            app_version: '2.0.0'
        },
        subscription: {
            balance: 10550, current_plan_id: 2,
            trial_info: { trial_ends_at: `${addDays(t, 32)}T00:00:00+05:00`, days_remaining: 32, is_expired: false, status: 1 },
            usage: { subscription_status: 'active', plan_name: 'Pro', plan_price: 59000, debt_remaining: null, sms_remaining: 50, sms_total_limit: 50, shop_used: 1, shop_total_limit: 3, worker_used: 1, worker_total_limit: 5, allowed_extra_package_types: ['sms'] },
            plans: [
                { id: 1, name: 'Oddiy', price: 29000, yearly_price: 290000, sms_limit: 20, shop_limit: 1, worker_limit: 1, debt_limit: null },
                { id: 2, name: 'Pro', price: 59000, yearly_price: 590000, sms_limit: 50, shop_limit: 3, worker_limit: 5, debt_limit: null },
                { id: 3, name: 'Premium', price: 99000, yearly_price: 990000, sms_limit: 150, shop_limit: null, worker_limit: null, debt_limit: null }
            ],
            extra_packages: [{ id: 2, type: 'sms', feature_type: 'sms', quantity: 50, price: 25000, is_active: true }]
        },
        customers: [
            { id: 31, name: 'Aziz aka', phone: '+998935551234', total_debt: 54000, overdue_debt: 0, credit_limit: 300000, last_activity_at: `${t}T10:00:00+05:00` },
            { id: 32, name: 'Ravshan aka', phone: '+998907774109', total_debt: 64000, overdue_debt: 64000, credit_limit: null, last_activity_at: null },
            { id: 33, name: 'Nigora', phone: '+998993004512', total_debt: 0, overdue_debt: 0, credit_limit: null, last_activity_at: null }
        ],
        debts: {
            31: [
                { id: 7502, customer_id: 31, customer_name: 'Aziz aka', total_amount: 30000, remaining_amount: 22000, total_paid_amount: 8000, debt_date: addDays(t, -3), return_date: addDays(t, 11), status: 'open', state: 'partially_paid', description: 'un 1 qop', payments: [] },
                { id: 7494, customer_id: 31, customer_name: 'Aziz aka', total_amount: 46000, remaining_amount: 32000, total_paid_amount: 14000, debt_date: addDays(t, -10), return_date: addDays(t, 6), status: 'open', state: 'partially_paid', payments: [] }
            ]
        },
        overdue: {
            data: [
                { customer_id: 32, name: 'Ravshan aka', phone: '+998907774109', overdue_amount: 64000, debts_count: 1, oldest_due_date: addDays(t, -5), days_overdue: 5, reminders_sent: 1, last_sms_at: `${addDays(t, -2)}T09:00:00+05:00`, sms_status: 'sent' },
                { customer_id: 34, name: 'Madina', phone: '+998901112233', overdue_amount: 38000, debts_count: 1, oldest_due_date: addDays(t, -3), days_overdue: 3, reminders_sent: 0, last_sms_at: null, sms_status: 'not_sent' }
            ],
            summary: { total_amount: 102000, count: 2, avg_days_overdue: 4, buckets: { '1-7': 2, '8-30': 0, '30+': 0 } }
        }
    }
}

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

// API'ni mock qiladi; calls — yuborilgan so'rovlar (tekshirish uchun)
export async function mockApi(page, { loggedIn = true, overrides = {} } = {}) {
    const f = fixtures()
    const t = today()
    const calls = []
    if (loggedIn) {
        await page.addInitScript(([user]) => {
            if (!localStorage.getItem('token')) {
                localStorage.setItem('token', '1|test')
                localStorage.setItem('user', JSON.stringify(user))
            }
        }, [f.user])
    }
    await page.route('http://api.test/**', async (route) => {
        const req = route.request()
        const url = new URL(req.url())
        const path = url.pathname.replace(/^\/api(\/v1)?/, '')
        const method = req.method()
        const body = req.postDataJSON?.() ?? null
        calls.push({ method, path, body, query: Object.fromEntries(url.searchParams) })
        const key = `${method} ${path}`
        if (overrides[key]) return overrides[key](route, { body, url, f })

        const c = path.match(/^\/customers\/(\d+)(\/.*)?$/)
        switch (true) {
            case key === 'GET /auth/me': return json(route, { user: f.user, active_tenant: f.tenant, available_tenants: [f.tenant] })
            case key === 'GET /settings': return json(route, f.settings)
            case key === 'GET /subscription/status': return json(route, f.subscription)
            case key === 'GET /subscription/transactions': return json(route, { data: [], meta: { current_page: 1, last_page: 1, total: 0 } })
            case key === 'GET /notifications/unread-count': return json(route, { count: 2 })
            case key === 'GET /dashboard': return json(route, { total_customers: 3, remaining_debt: 118000, today_debts: 120000, today_payments: 95000, today_supplier_payments: 0 })
            case key === 'GET /overdue': return json(route, f.overdue)
            case key === 'POST /overdue/bulk-sms':
                return json(route, body.dry_run
                    ? { dry_run: true, requested: body.customer_ids.length, will_send: body.customer_ids.length, free_count: body.customer_ids.length, paid_count: 0, estimated_cost: 0, balance: 10550, insufficient_balance: false, skipped: [] }
                    : { dry_run: false, sent: body.customer_ids.length, failed: 0, results: [] })
            case key === 'GET /debts': return json(route, { data: Object.values(f.debts).flat(), meta: { current_page: 1, last_page: 1, total: 2 } })
            case key === 'POST /debts': return json(route, { debt: { id: 9000 }, sms: { status: 'sent' }, customer_total_debt: 139000, applied_from_balance: 0 }, 201)
            case key === 'GET /customers': return json(route, { data: f.customers, meta: { current_page: 1, last_page: 1, total: f.customers.length } })
            case key === 'POST /customers': return json(route, { customer: { id: 40, ...body, total_debt: 0 } }, 201)
            case !!c && method === 'GET' && !c[2]: {
                const cu = f.customers.find((x) => x.id === Number(c[1])) || f.customers[0]
                return json(route, { ...cu, debts: f.debts[cu.id] || [], summary: { total_debt: cu.total_debt, total_given: 76000, total_paid: 22000, balance: 0, credit_limit: cu.credit_limit, nearest_due_date: f.debts[31][1].return_date, debts_count: 2 } })
            }
            case !!c && c[2] === '/summary': {
                const cu = f.customers.find((x) => x.id === Number(c[1]))
                return json(route, { total_debt: cu.total_debt, credit_limit: cu.credit_limit, balance: 0 })
            }
            case !!c && c[2] === '/payments/preview': {
                const cu = f.customers.find((x) => x.id === Number(c[1]))
                const toBalance = Math.max(0, body.amount - cu.total_debt)
                return json(route, { mode: body.mode, amount: body.amount, allocations: [{ debt_id: 7502, debt_date: f.debts[31][0].debt_date, remaining_before: 22000, amount: Math.min(body.amount, 22000), remaining_after: Math.max(0, 22000 - body.amount), closes: body.amount >= 22000 }], to_balance: toBalance, debt_before: cu.total_debt, debt_after: Math.max(0, cu.total_debt - body.amount), balance_after: toBalance })
            }
            case !!c && c[2] === '/payments': {
                const cu = f.customers.find((x) => x.id === Number(c[1]))
                const toBalance = Math.max(0, body.amount - cu.total_debt)
                return json(route, { payment: { amount: body.amount, method: body.method }, allocations: [{ debt_id: 7502, amount: 22000, closed: true }, { debt_id: 7494, amount: 32000, closed: true }], to_balance: toBalance, customer: { id: cu.id, total_debt: 0, balance: toBalance }, sms: { status: 'skipped', skipped_reason: 'disabled' } }, 201)
            }
            case !!c && c[2] === '/timeline': return json(route, { data: [], next_cursor: null })
            case key === 'GET /sms/quota': return json(route, { limit: 50, used: 12, free_remaining: 38, extra_sms_price: 190, balance: 10550, blocked: false })
            case key === 'GET /sms': return json(route, { data: [], meta: { current_page: 1, last_page: 1, total: 0 } })
            case key === 'PUT /settings/notifications': return json(route, { message: 'Saqlandi' })
            case key === 'GET /auth/devices': return json(route, { data: [{ id: 41, device: 'Android · Chrome', is_current: true, last_active_at: `${t}T10:00:00+05:00` }] })
            case key === 'GET /telegram/chats': return json(route, { bot_username: 'daftaron_bot', bot_url: 'https://t.me/daftaron_bot', chats: [], can_link_self: false })
            case key === 'GET /locations/regions': return json(route, [{ id: 1, name: 'Toshkent shahri' }, { id: 2, name: 'Samarqand viloyati' }])
            case key === 'GET /locations/districts/1': return json(route, [{ id: 11, region_id: 1, name: 'Chilonzor' }, { id: 12, region_id: 1, name: 'Yunusobod' }])
            case key === 'GET /locations/districts/2': return json(route, [{ id: 21, region_id: 2, name: 'Urgut' }])
            case key === 'GET /locations/categories': return json(route, [{ id: 1, name: 'Oziq-ovqat' }, { id: 2, name: 'Qurilish mollari' }])
            case key === 'GET /onboarding': return json(route, { step: 'done', completed: true })
            default: return json(route, {})
        }
    })
    return { calls, f }
}
