import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp()

const LINE_CHANNEL_ID = '2010062826'
const LINE_CHANNEL_SECRET = defineSecret('LINE_CHANNEL_SECRET')

const ALLOWED_ORIGINS = new Set([
  'https://catsplit-app.web.app',
  'https://catsplit-app.firebaseapp.com',
  'http://localhost:5173',
])

const setCors = (req, res) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Vary', 'Origin')
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.set('Access-Control-Max-Age', '3600')
}

export const lineLogin = onRequest(
  { secrets: [LINE_CHANNEL_SECRET], cors: false, region: 'asia-east1', maxInstances: 5 },
  async (req, res) => {
    setCors(req, res)
    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' })
      return
    }

    const { code, redirectUri } = req.body || {}
    if (!code || !redirectUri) {
      res.status(400).json({ error: 'missing_params' })
      return
    }

    try {
      const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: LINE_CHANNEL_ID,
          client_secret: LINE_CHANNEL_SECRET.value(),
        }),
      })

      if (!tokenRes.ok) {
        const text = await tokenRes.text()
        console.error('LINE token exchange failed', tokenRes.status, text)
        res.status(401).json({ error: 'token_exchange_failed' })
        return
      }

      const tokenJson = await tokenRes.json()
      const { access_token, id_token } = tokenJson

      // 用 access_token 拿 profile（最穩定，不用解析 JWT）
      const profileRes = await fetch('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${access_token}` },
      })

      if (!profileRes.ok) {
        const text = await profileRes.text()
        console.error('LINE profile fetch failed', profileRes.status, text)
        res.status(502).json({ error: 'profile_fetch_failed' })
        return
      }

      const profile = await profileRes.json()
      const firebaseToken = await getAuth().createCustomToken(profile.userId)
      res.json({
        userId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        idToken: id_token,
        firebaseToken,
      })
    } catch (e) {
      console.error('lineLogin error', e)
      res.status(500).json({ error: 'internal_error' })
    }
  }
)

export const verifyLiffToken = onRequest(
  { cors: false, region: 'asia-east1', maxInstances: 5 },
  async (req, res) => {
    setCors(req, res)
    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' })
      return
    }

    const { idToken } = req.body || {}
    if (!idToken) {
      res.status(400).json({ error: 'missing_params' })
      return
    }

    try {
      const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          id_token: idToken,
          client_id: LINE_CHANNEL_ID,
        }),
      })

      if (!verifyRes.ok) {
        const text = await verifyRes.text()
        console.error('LINE id_token verify failed', verifyRes.status, text)
        res.status(401).json({ error: 'id_token_invalid' })
        return
      }

      const claims = await verifyRes.json()
      const firebaseToken = await getAuth().createCustomToken(claims.sub)
      res.json({
        userId: claims.sub,
        displayName: claims.name,
        pictureUrl: claims.picture,
        firebaseToken,
      })
    } catch (e) {
      console.error('verifyLiffToken error', e)
      res.status(500).json({ error: 'internal_error' })
    }
  }
)

// ---------- 身分合併：認領虛擬成員 / 匿名帳號綁定 LINE ----------

const verifyBearer = async (req) => {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '')
  if (!m) return null
  try {
    return await getAuth().verifyIdToken(m[1])
  } catch {
    return null
  }
}

const round2 = (n) => Math.round(n * 100) / 100

// 把 map 的 from 鍵併入 to 鍵（金額相加）；沒有 from 時原樣回傳 null 表示不用改
const moveKey = (map, from, to) => {
  if (!map || !(from in map)) return null
  const next = { ...map }
  next[to] = round2((next[to] || 0) + next[from])
  delete next[from]
  return next
}

const swapId = (value, from, to) => (value === from ? to : value)

/**
 * 把群組內所有 fromId 的紀錄改成 toUid。先改子集合、最後才改群組文件，
 * 中途失敗時 fromId 仍留在 members，重試即可繼續（已改過的文件不會再被動到）。
 */
const migrateMember = async (groupId, fromId, toUid, profileOverride = {}) => {
  const db = getFirestore()
  const groupRef = db.doc(`groups/${groupId}`)
  const groupSnap = await groupRef.get()
  if (!groupSnap.exists) return false
  const group = groupSnap.data()
  if (!group.members?.includes(fromId)) return false

  const writer = db.bulkWriter()
  const [expenses, settlements] = await Promise.all([
    groupRef.collection('expenses').get(),
    groupRef.collection('settlements').get(),
  ])

  expenses.docs.forEach((d) => {
    const e = d.data()
    const patch = {}
    for (const field of ['payments', 'splits', 'shares']) {
      const moved = moveKey(e[field], fromId, toUid)
      if (moved) patch[field] = moved
    }
    if (e.createdBy === fromId) patch.createdBy = toUid
    if (Object.keys(patch).length) writer.update(d.ref, patch)
  })

  settlements.docs.forEach((d) => {
    const s = d.data()
    const patch = {}
    for (const field of ['from', 'to', 'settledBy']) {
      if (s[field] === fromId) patch[field] = toUid
    }
    if (Object.keys(patch).length) writer.update(d.ref, patch)
  })

  await writer.close()

  const profiles = { ...(group.memberProfiles || {}) }
  const fromProfile = { ...profiles[fromId] }
  delete fromProfile.placeholder
  delete profiles[fromId]
  profiles[toUid] = profiles[toUid] || { ...fromProfile, ...profileOverride }

  const groupPatch = {
    members: [...new Set(group.members.map((m) => swapId(m, fromId, toUid)))],
    memberProfiles: profiles,
  }
  const balances = moveKey(group.memberBalances, fromId, toUid)
  if (balances) groupPatch.memberBalances = balances
  if (group.createdBy === fromId) groupPatch.createdBy = toUid
  await groupRef.update(groupPatch)
  return true
}

/**
 * 認領群組內的虛擬成員（id 以 p_ 開頭）。呼叫者需已登入（匿名或 LINE 皆可）且尚未是該群組成員。
 */
export const claimMember = onRequest(
  { cors: false, region: 'asia-east1', maxInstances: 5 },
  async (req, res) => {
    setCors(req, res)
    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' })
      return
    }

    const caller = await verifyBearer(req)
    if (!caller) {
      res.status(401).json({ error: 'unauthenticated' })
      return
    }

    const { groupId, placeholderId, avatar } = req.body || {}
    if (typeof groupId !== 'string' || typeof placeholderId !== 'string' || !placeholderId.startsWith('p_')) {
      res.status(400).json({ error: 'missing_params' })
      return
    }

    try {
      const snap = await getFirestore().doc(`groups/${groupId}`).get()
      const group = snap.data()
      if (!group || !group.members?.includes(placeholderId) || !group.memberProfiles?.[placeholderId]?.placeholder) {
        res.status(404).json({ error: 'placeholder_not_found' })
        return
      }
      if (group.members.includes(caller.uid)) {
        res.status(409).json({ error: 'already_member' })
        return
      }
      const safeAvatar = typeof avatar === 'string' && avatar.startsWith('https://') && avatar.length <= 500 ? avatar : null
      await migrateMember(groupId, placeholderId, caller.uid, { avatar: safeAvatar })
      res.json({ ok: true })
    } catch (e) {
      console.error('claimMember error', e)
      res.status(500).json({ error: 'internal_error' })
    }
  }
)

/**
 * 匿名帳號綁定 LINE：Authorization 帶 LINE 登入後的 ID token，body 帶登入前匿名帳號的 ID token。
 * 兩個 token 都驗證過，才把匿名 uid 的所有群組紀錄搬到 LINE uid。
 */
export const linkAnonymous = onRequest(
  { cors: false, region: 'asia-east1', maxInstances: 5, timeoutSeconds: 120 },
  async (req, res) => {
    setCors(req, res)
    if (req.method === 'OPTIONS') {
      res.status(204).send('')
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method_not_allowed' })
      return
    }

    const lineUser = await verifyBearer(req)
    if (!lineUser || lineUser.firebase?.sign_in_provider !== 'custom') {
      res.status(401).json({ error: 'unauthenticated' })
      return
    }

    const { anonIdToken } = req.body || {}
    let anonUser
    try {
      anonUser = await getAuth().verifyIdToken(anonIdToken)
    } catch {
      res.status(401).json({ error: 'anon_token_invalid' })
      return
    }
    if (anonUser.firebase?.sign_in_provider !== 'anonymous') {
      res.status(400).json({ error: 'not_anonymous' })
      return
    }

    try {
      const groups = await getFirestore().collection('groups').where('members', 'array-contains', anonUser.uid).get()
      for (const g of groups.docs) await migrateMember(g.id, anonUser.uid, lineUser.uid)
      await getAuth().deleteUser(anonUser.uid).catch(() => {})
      res.json({ ok: true, migrated: groups.size })
    } catch (e) {
      console.error('linkAnonymous error', e)
      res.status(500).json({ error: 'internal_error' })
    }
  }
)
