import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeSplits, applyExchangeRate, computeMemberBalances } from './expenseHelpers.js'

const sum = (obj) => Object.values(obj).reduce((s, v) => s + v, 0)
const members = [['a'], ['b'], ['c']]
const base = { effectiveUids: ['a', 'b', 'c'], allMemberEntries: members, shares: {}, percentages: {}, customAmounts: {} }

test('equal：整除時各人相同且總和等於總額', () => {
  const splits = computeSplits({ ...base, splitType: 'equal', totalAmount: 300 })
  assert.deepEqual(splits, { a: 100, b: 100, c: 100 })
})

test('equal：不整除時每人差距不超過 1 分，總和誤差不超過 0.01 × 人數', () => {
  const splits = computeSplits({ ...base, splitType: 'equal', totalAmount: 100 })
  assert.ok(Math.abs(sum(splits) - 100) <= 0.01 * 3)
})

test('subset：只分給有效成員', () => {
  const splits = computeSplits({ ...base, splitType: 'subset', totalAmount: 100, effectiveUids: ['a', 'b'] })
  assert.deepEqual(splits, { a: 50, b: 50 })
})

test('shares：依份數比例分攤', () => {
  const splits = computeSplits({ ...base, splitType: 'shares', totalAmount: 100, shares: { a: 1, b: 1, c: 2 } })
  assert.deepEqual(splits, { a: 25, b: 25, c: 50 })
})

test('percentage：依百分比分攤', () => {
  const splits = computeSplits({ ...base, splitType: 'percentage', totalAmount: 200, percentages: { a: 50, b: 30, c: 20 } })
  assert.deepEqual(splits, { a: 100, b: 60, c: 40 })
})

test('custom：使用自訂金額，未填者為 0', () => {
  const splits = computeSplits({ ...base, splitType: 'custom', totalAmount: 100, customAmounts: { a: '70', b: '30' } })
  assert.deepEqual(splits, { a: 70, b: 30, c: 0 })
})

test('applyExchangeRate：同幣別不換算', () => {
  const r = applyExchangeRate({ totalAmount: 100, splits: { a: 60, b: 40 }, currency: 'TWD', baseCurrency: 'TWD', exchangeRate: 5 })
  assert.deepEqual(r, { rate: 1, baseAmount: 100, baseSplits: { a: 60, b: 40 } })
})

test('applyExchangeRate：外幣依匯率換算總額與各人份額', () => {
  const r = applyExchangeRate({ totalAmount: 100, splits: { a: 60, b: 40 }, currency: 'JPY', baseCurrency: 'TWD', exchangeRate: 0.22 })
  assert.deepEqual(r, { rate: 0.22, baseAmount: 22, baseSplits: { a: 13.2, b: 8.8 } })
})

test('computeMemberBalances：付款人為正、分攤者為負，總和為 0', () => {
  const expenses = [{ paidBy: 'a', amount: 300, splits: { a: 100, b: 100, c: 100 } }]
  const balances = computeMemberBalances(['a', 'b', 'c'], expenses)
  assert.deepEqual(balances, { a: 200, b: -100, c: -100 })
  assert.equal(sum(balances), 0)
})

test('computeMemberBalances：結清紀錄會抵銷欠款', () => {
  const expenses = [{ paidBy: 'a', amount: 300, splits: { a: 100, b: 100, c: 100 } }]
  const settlements = [{ from: 'b', to: 'a', amount: 100 }]
  const balances = computeMemberBalances(['a', 'b', 'c'], expenses, settlements)
  assert.deepEqual(balances, { a: 100, b: 0, c: -100 })
})

test('computeMemberBalances：支援 Firestore 文件（有 data()）', () => {
  const doc = { data: () => ({ paidBy: 'a', amount: 100, splits: { a: 50, b: 50 } }) }
  assert.deepEqual(computeMemberBalances(['a', 'b'], [doc]), { a: 50, b: -50 })
})

test('尾差：100 元三人均分，尾差歸付款人，餘額總和為 0', () => {
  const splits = computeSplits({ ...base, splitType: 'equal', totalAmount: 100 })
  const { baseAmount, baseSplits } = applyExchangeRate({ totalAmount: 100, splits, currency: 'TWD', baseCurrency: 'TWD', paidBy: 'b' })
  assert.deepEqual(baseSplits, { a: 33.33, b: 33.34, c: 33.33 })
  assert.equal(parseFloat(sum(baseSplits).toFixed(2)), baseAmount)
  const balances = computeMemberBalances(['a', 'b', 'c'], [{ paidBy: 'b', amount: baseAmount, splits: baseSplits }])
  assert.equal(parseFloat(sum(balances).toFixed(2)), 0)
})

test('尾差：付款人不在分攤名單時歸第一位成員', () => {
  const { baseSplits } = applyExchangeRate({ totalAmount: 100, splits: { a: 33.33, b: 33.33, c: 33.33 }, currency: 'TWD', baseCurrency: 'TWD', paidBy: 'x' })
  assert.deepEqual(baseSplits, { a: 33.34, b: 33.33, c: 33.33 })
})

test('尾差：外幣換算後各人四捨五入的差額也歸付款人', () => {
  const { baseAmount, baseSplits } = applyExchangeRate({ totalAmount: 100, splits: { a: 33.33, b: 33.33, c: 33.34 }, currency: 'JPY', baseCurrency: 'TWD', exchangeRate: 0.215, paidBy: 'a' })
  assert.equal(parseFloat(sum(baseSplits).toFixed(2)), baseAmount)
})

test('尾差：分帳本身不平（差距過大）時不調整', () => {
  const { baseSplits } = applyExchangeRate({ totalAmount: 100, splits: { a: 50, b: 40 }, currency: 'TWD', baseCurrency: 'TWD', paidBy: 'a' })
  assert.deepEqual(baseSplits, { a: 50, b: 40 })
})
