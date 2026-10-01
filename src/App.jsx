import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useApp } from './context/AppContext'
import catLogo from './assets/cat-logo.webp'
import { MessageCircle, PawPrint, Wallet } from 'lucide-react'

import HomePage from './pages/HomePage'
import CreateGroupPage from './pages/CreateGroupPage'
import GroupPage from './pages/GroupPage'
import AddExpensePage from './pages/AddExpensePage'
import SettlePage from './pages/SettlePage'
import EditGroupPage from './pages/EditGroupPage'
import TransferPage from './pages/TransferPage'
import EditExpensePage from './pages/EditExpensePage'
import ExpenseDetailPage from './pages/ExpenseDetailPage'
import StatsPage from './pages/StatsPage'
import AuthCallbackPage from './pages/AuthCallbackPage'

const LoadingScreen = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50">
    <div className="text-center">
      <img src={catLogo} alt="貓咪分帳 CatSplit" style={{ width: 64, height: 64, marginBottom: 16 }} />
      <p className="text-gray-500">載入中...</p>
    </div>
  </div>
)

const GuestJoin = ({ onGuest }) => {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await onGuest(name)
    } catch (e) {
      console.error(e)
      setError('無法以訪客身分加入，請稍後再試')
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ marginTop: 14, background: 'none', border: 'none', color: '#b08060', fontSize: 14, textDecoration: 'underline', cursor: 'pointer' }}
      >
        不登入，以訪客身分加入
      </button>
    )
  }
  return (
    <div style={{ marginTop: 16, width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        autoFocus
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
        maxLength={20}
        placeholder="輸入你的暱稱"
        style={{ border: '0.5px solid #FF8C42', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: '#3d2b1f', outline: 'none', background: '#fff' }}
      />
      <button
        onClick={submit}
        disabled={!name.trim() || busy}
        style={{ padding: '12px 0', borderRadius: 12, border: 'none', fontSize: 15, fontWeight: 500, color: '#fff', background: !name.trim() || busy ? '#e0c4b0' : '#FF8C42', cursor: !name.trim() || busy ? 'not-allowed' : 'pointer' }}
      >
        {busy ? '處理中...' : '繼續'}
      </button>
      {error && <div style={{ fontSize: 13, color: '#c0392b', textAlign: 'center' }}>{error}</div>}
      <div style={{ fontSize: 12, color: '#c4a882', textAlign: 'center', lineHeight: 1.5 }}>
        訪客身分只存在這個瀏覽器，之後可綁定 LINE 帳號保留紀錄
      </div>
    </div>
  )
}

const LoginScreen = ({ onLogin, onGuest }) => (
  <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #fff8f4 0%, #ffe8d6 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
    <img src={catLogo} alt="貓咪分帳 CatSplit" style={{ width: 120, height: 120, marginBottom: 16 }} />
    <div style={{ fontSize: 24, fontWeight: 700, color: '#3d2b1f', marginBottom: 8 }}>貓咪分帳 CatSplit</div>
    <div style={{ fontSize: 14, color: '#b08060', marginBottom: 48, textAlign: 'center', lineHeight: 1.6 }}>
      貓咪幫你分帳，輕鬆搞定朋友借錢
    </div>

    <div style={{ background: '#fff', borderRadius: 20, border: '0.5px solid #f0d5c0', padding: '24px 20px', width: '100%', maxWidth: 320, marginBottom: 32 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: '#b08060', marginBottom: 16, textAlign: 'center' }}>如何開始使用</div>
      {[
        { Icon: MessageCircle, text: '使用 LINE 帳號登入' },
        { Icon: PawPrint, text: '建立或加入分帳群組' },
        { Icon: Wallet, text: '輕鬆記帳結算' },
      ].map(({ Icon, text }, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: i < 2 ? 14 : 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff3ec', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon size={18} color="#FF8C42" strokeWidth={2} />
          </div>
          <div style={{ fontSize: 14, color: '#3d2b1f' }}>{text}</div>
        </div>
      ))}
    </div>

    <button
      onClick={onLogin}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: '#06C755', color: '#fff', border: 'none', borderRadius: 14,
        padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
        width: '100%', maxWidth: 320, boxShadow: '0 4px 16px rgba(6,199,85,0.25)',
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
      </svg>
      使用 LINE 登入
    </button>
    {onGuest && <GuestJoin onGuest={onGuest} />}
  </div>
)

const ProtectedRoutes = () => {
  const { user, loading, loginWithLine, loginAsGuest } = useApp()
  const location = useLocation()
  if (loading) return <LoadingScreen />
  // 登入後要回到原本開啟的頁面（例如邀請連結的群組頁）
  // 只有邀請連結（群組頁）提供訪客加入；訪客不能建立群組
  const isInviteLink = /^\/group\/[^/]+\/?$/.test(location.pathname)
  if (!user) return <LoginScreen onLogin={() => loginWithLine(location.pathname + location.search)} onGuest={isInviteLink ? loginAsGuest : undefined} />

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={user.anonymous ? <Navigate to="/" /> : <CreateGroupPage />} />
      <Route path="/group/:id" element={<GroupPage />} />
      <Route path="/group/:id/add" element={<AddExpensePage />} />
      <Route path="/group/:id/settle" element={<SettlePage />} />
      <Route path="/group/:id/stats" element={<StatsPage />} />
      <Route path="/group/:id/transfer" element={<TransferPage />} />
      <Route path="/group/:id/expense/:expenseId" element={<ExpenseDetailPage />} />
      <Route path="/group/:id/expense/:expenseId/edit" element={<EditExpensePage />} />
      <Route path="/group/:id/edit" element={<EditGroupPage />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

const AppRoutes = () => {
  const location = useLocation()
  // OAuth callback 路徑直接走 callback page，跳過登入檢查
  if (location.pathname === '/auth/callback') {
    return (
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
      </Routes>
    )
  }
  return <ProtectedRoutes />
}

const App = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
)

export default App
