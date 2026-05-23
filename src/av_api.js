const DEFAULT_BASE_URL = 'https://www.alphavantage.co/query'

export class AlphaVantageClient {
  constructor(apiKey = process.env.AV_KEY, { baseUrl = DEFAULT_BASE_URL, fetcher } = {}) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new TypeError('AlphaVantageClient requires a valid apiKey string')
    }

    const effectiveFetch = fetcher ?? globalThis.fetch
    if (typeof effectiveFetch !== 'function') {
      throw new Error('A fetch implementation is required for AlphaVantageClient')
    }

    this.apiKey = apiKey
    this.baseUrl = baseUrl
    this.fetcher = effectiveFetch
  }

  async request(functionName, params = {}) {
    const url = new URL(this.baseUrl)
    url.searchParams.set('apikey', this.apiKey)
    url.searchParams.set('function', functionName)

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value))
      }
    })

    const response = await this.fetcher(url.toString())
    if (!response.ok) {
      throw new Error(`Alpha Vantage request failed: ${response.status} ${response.statusText}`)
    }

    const payload = await response.json()
    if (payload['Error Message']) {
      throw new Error(`Alpha Vantage error: ${payload['Error Message']}`)
    }
    if (payload['Note']) {
      throw new Error(`Alpha Vantage rate limit or note: ${payload['Note']}`)
    }
    if (payload['Information']) {
      throw new Error(`Alpha Vantage information: ${payload['Information']}`)
    }

    return payload
  }

  async timeSeriesDaily(symbol, { outputSize = 'compact', adjusted = false } = {}) {
    const functionName = adjusted ? 'TIME_SERIES_DAILY_ADJUSTED' : 'TIME_SERIES_DAILY'
    return this.request(functionName, {
      symbol,
      outputsize: outputSize,
      datatype: 'json',
    })
  }

  async quote(symbol) {
    return this.request('GLOBAL_QUOTE', { symbol, datatype: 'json' })
  }

  async searchKeywords(keywords) {
    return this.request('SYMBOL_SEARCH', { keywords, datatype: 'json' })
  }
}
