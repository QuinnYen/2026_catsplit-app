import { useState, useEffect } from 'react'
import { fetchExchangeRate } from '../config/currencies'

// savedRate: { currency, rate }，編輯既有消費時傳入；幣別相同就沿用，不重新抓取
const useExchangeRate = (currency, baseCurrency, savedRate) => {
  const [exchangeRate, setExchangeRate] = useState(1)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateError, setRateError] = useState(false)
  const [rateManual, setRateManual] = useState(false)

  useEffect(() => {
    if (!baseCurrency) return
    setRateManual(false)
    setRateError(false)
    if (currency === baseCurrency) { setExchangeRate(1); return }
    if (savedRate?.currency === currency) { setExchangeRate(savedRate.rate); setRateLoading(false); return }
    let cancelled = false
    setRateLoading(true)
    fetchExchangeRate(currency, baseCurrency)
      .then(rate => { if (!cancelled) setExchangeRate(rate) })
      .catch(() => { if (!cancelled) { setExchangeRate(null); setRateError(true) } })
      .finally(() => { if (!cancelled) setRateLoading(false) })
    return () => { cancelled = true }
  }, [currency, baseCurrency, savedRate])

  const setManualRate = (rate) => {
    setExchangeRate(rate)
    setRateManual(true)
  }

  return { exchangeRate, setExchangeRate, setManualRate, rateLoading, rateError, rateManual }
}

export default useExchangeRate
