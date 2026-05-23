const DEFAULT_BASE_URL = 'https://www.alphavantage.co/query'

export class OverviewResponse {
  constructor(payload) {
    this.symbol = payload.Symbol || null
    this.assetType = payload['Asset type'] || null
    this.name = payload.Name || null
    this.description = payload.Description || null
    this.cik = payload.CIK || null
    this.exchange = payload.Exchange || null
    this.currency = payload.Currency || null
    this.country = payload.Country || null
    this.sector = payload.Sector || null
    this.industry = payload.Industry || null
    this.marketCapitalization = payload['Market Capitalization'] ? parseInt(payload['Market Capitalization']) : null
    this.ebitda = payload.EBITDA ? parseInt(payload.EBITDA) : null
    this.peRatio = payload['P/E Ratio'] ? parseFloat(payload['P/E Ratio']) : null
    this.pegRatio = payload['PEG Ratio'] ? parseFloat(payload['PEG Ratio']) : null
    this.bookValue = payload['Book Value'] ? parseFloat(payload['Book Value']) : null
    this.dividendPerShare = payload['Dividend per Share'] ? parseFloat(payload['Dividend per Share']) : null
    this.dividendYield = payload['Dividend Yield'] ? parseFloat(payload['Dividend Yield']) : null
    this.eps = payload.EPS ? parseFloat(payload.EPS) : null
    this.revenuePerShareTTM = payload['Revenue per Share TTM'] ? parseFloat(payload['Revenue per Share TTM']) : null
    this.profitMargin = payload['Profit Margin'] ? parseFloat(payload['Profit Margin']) : null
    this.operatingMarginTTM = payload['Operating Margin TTM'] ? parseFloat(payload['Operating Margin TTM']) : null
    this.returnOnAssetsYTD = payload['Return on Assets YTD'] ? parseFloat(payload['Return on Assets YTD']) : null
    this.returnOnEquityTTM = payload['Return on Equity TTM'] ? parseFloat(payload['Return on Equity TTM']) : null
    this.revenueTTM = payload['Revenue TTM'] ? parseInt(payload['Revenue TTM']) : null
    this.grossProfitTTM = payload['Gross Profit TTM'] ? parseInt(payload['Gross Profit TTM']) : null
  }

  get hasUsefulInformation() {
    // Consider the response useful if it has a symbol and at least one other key field
    return !!(this.symbol && (this.name || this.exchange || this.currency || this.sector))
  }
}

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

  async overview(symbol) {
    const payload = await this.request('OVERVIEW', { symbol, datatype: 'json' })
    return new OverviewResponse(payload)
  }
}
