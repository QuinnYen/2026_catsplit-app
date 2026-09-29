import { ref, listAll, deleteObject } from 'firebase/storage'
import { storage } from '../config/firebase'

// 刪除單一檔案（以 download URL 指定）；檔案可能已不存在，失敗一律忽略
export const deleteFileByUrl = async (url) => {
  if (!url) return
  try { await deleteObject(ref(storage, url)) } catch { /* 忽略 */ }
}

const deleteFolder = async (folderRef) => {
  const { items, prefixes } = await listAll(folderRef)
  await Promise.all([
    ...items.map(item => deleteObject(item)),
    ...prefixes.map(deleteFolder),
  ])
}

// 刪除群組的所有收據與封面。需在刪除群組文件之前呼叫（Storage 規則要讀群組文件驗證成員身分）
export const deleteGroupFiles = async (groupId) => {
  await Promise.all([
    deleteFolder(ref(storage, `receipts/${groupId}`)),
    deleteFolder(ref(storage, `groups/${groupId}/cover`)),
  ])
}
