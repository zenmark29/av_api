import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AlphaVantageClient, OverviewResponse, GlobalQuoteResponse } from '../../src/av_api.js'

const apiKey = 'demo-key'

describe('AlphaVantageClient', () => {
  let originalFetch
  let originalKey
  let fetchMock

  beforeEach(() => {
    originalFetch = globalThis.fetch
    originalKey = process.env.AV_KEY
    fetchMock = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ 'Global Quote': { '01. symbol': 'IBM' } }),
    })
    fetchMock.calls = 0
    globalThis.fetch = async (...args) => {
      fetchMock.calls += 1
      return fetchMock(...args)
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (originalKey === undefined) {
      delete process.env.AV_KEY
    } else {
      process.env.AV_KEY = originalKey
    }
  })

  it('requires an apiKey', () => {
    delete process.env.AV_KEY
    assert.throws(() => new AlphaVantageClient(), TypeError)
  })

  it('builds a request and returns a GlobalQuoteResponse', async () => {
    const client = new AlphaVantageClient(apiKey)
    const result = await client.quote('IBM')

    assert.strictEqual(fetchMock.calls, 1)
    assert.ok(result instanceof GlobalQuoteResponse)
    assert.strictEqual(result.symbol, 'IBM')
  })

  it('ignores a custom baseUrl and uses the fixed Alpha Vantage endpoint', async () => {
    const client = new AlphaVantageClient(apiKey, { baseUrl: 'https://example.com', fetcher: globalThis.fetch })
    const result = await client.quote('IBM')

    assert.strictEqual(fetchMock.calls, 1)
    assert.ok(result instanceof GlobalQuoteResponse)
    assert.strictEqual(result.symbol, 'IBM')
  })

  it('calculates trailing annual dividend from 12 months of adjusted data', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        'Monthly Adjusted Time Series': {
          '2024-05-31': { '7. dividend amount': '0.25' },
          '2024-04-30': { '7. dividend amount': '0.00' },
          '2024-03-29': { '7. dividend amount': '0.25' },
          '2024-02-29': { '7. dividend amount': '0.00' },
          '2024-01-31': { '7. dividend amount': '0.25' },
          '2023-12-29': { '7. dividend amount': '0.00' },
          '2023-11-30': { '7. dividend amount': '0.25' },
          '2023-10-31': { '7. dividend amount': '0.00' },
          '2023-09-29': { '7. dividend amount': '0.25' },
          '2023-08-31': { '7. dividend amount': '0.00' },
          '2023-07-31': { '7. dividend amount': '0.25' },
          '2023-06-30': { '7. dividend amount': '0.00' },
          '2023-05-31': { '7. dividend amount': '0.25' },
        },
      }),
    })

    const client = new AlphaVantageClient(apiKey)
    const result = await client.trailingAnnualDividend('IBM')

    assert.strictEqual(result, 1.5)
  })

  it('trailingAnnualDividend handles missing dividend amounts as zero', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        'Monthly Adjusted Time Series': {
          '2024-05-31': { '7. dividend amount': '0.50' },
          '2024-04-30': {},
          '2024-03-29': { '7. dividend amount': '0.50' },
          '2024-02-29': {},
          '2024-01-31': { '7. dividend amount': '0.50' },
          '2023-12-29': {},
          '2023-11-30': { '7. dividend amount': '0.50' },
          '2023-10-31': {},
          '2023-09-29': { '7. dividend amount': '0.50' },
          '2023-08-31': {},
          '2023-07-31': { '7. dividend amount': '0.50' },
          '2023-06-30': {},
        },
      }),
    })

    const client = new AlphaVantageClient(apiKey)
    const result = await client.trailingAnnualDividend('IBM')

    assert.strictEqual(result, 3.0)
  })

  it('trailingAnnualDividend returns 0 when no data available', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({}),
    })

    const client = new AlphaVantageClient(apiKey)
    const result = await client.trailingAnnualDividend('IBM')

    assert.strictEqual(result, 0)
  })

  it('GlobalQuoteResponse parses numeric fields correctly', () => {
    const payload = {
      '01. symbol': 'IBM',
      '02. open': '130.24',
      '03. high': '132.50',
      '04. low': '129.50',
      '05. price': '130.60',
      '06. volume': '3041581',
      '07. latest trading day': '2024-05-23',
      '08. previous close': '130.86',
      '09. change': '-0.26',
      '10. change percent': '-0.1989%',
    }

    const quote = new GlobalQuoteResponse(payload)
    assert.strictEqual(quote.symbol, 'IBM')
    assert.strictEqual(quote.open, 130.24)
    assert.strictEqual(quote.high, 132.5)
    assert.strictEqual(quote.low, 129.5)
    assert.strictEqual(quote.price, 130.6)
    assert.strictEqual(quote.volume, 3041581)
    assert.strictEqual(quote.latestTradingDay, '2024-05-23')
    assert.strictEqual(quote.previousClose, 130.86)
    assert.strictEqual(quote.change, -0.26)
    assert.strictEqual(quote.changePercent, -0.1989)
  })

  it('GlobalQuoteResponse sets null for missing change percent', () => {
    const payload = {
      '01. symbol': 'IBM',
      '02. open': '130.24',
      '03. high': '132.50',
      '04. low': '129.50',
      '05. price': '130.60',
      '06. volume': '3041581',
      '07. latest trading day': '2024-05-23',
      '08. previous close': '130.86',
      '09. change': '-0.26',
    }

    const quote = new GlobalQuoteResponse(payload)
    assert.strictEqual(quote.changePercent, null)
  })

  it('GlobalQuoteResponse hasUsefulInformation is false when price and volume are missing', () => {
    const payload = {
      '01. symbol': 'IBM',
      '07. latest trading day': '2024-05-23',
    }

    const quote = new GlobalQuoteResponse(payload)
    assert.strictEqual(quote.symbol, 'IBM')
    assert.strictEqual(quote.price, null)
    assert.strictEqual(quote.volume, null)
    assert.strictEqual(quote.hasUsefulInformation, false)
  })

  it('GlobalQuoteResponse sets null when symbol is missing', () => {
    const payload = {
      '05. price': '130.60',
      '06. volume': '3041581',
    }

    const quote = new GlobalQuoteResponse(payload)
    assert.strictEqual(quote.symbol, null)
    assert.strictEqual(quote.hasUsefulInformation, false)
  })

  it('quote returns an empty GlobalQuoteResponse when Global Quote is missing', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({}),
    })

    const client = new AlphaVantageClient(apiKey)
    const quote = await client.quote('IBM')

    assert.ok(quote instanceof GlobalQuoteResponse)
    assert.strictEqual(quote.symbol, null)
    assert.strictEqual(quote.price, null)
    assert.strictEqual(quote.volume, null)
    assert.strictEqual(quote.hasUsefulInformation, false)
  })

  it('throws on a non-OK response', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 500, statusText: 'Internal Server Error' })
    const client = new AlphaVantageClient(apiKey)

    await assert.rejects(async () => {
      await client.quote('IBM')
    }, {
      message: 'Alpha Vantage request failed: 500 Internal Server Error',
    })
  })

  it('throws when the API returns an error payload', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ 'Error Message': 'Invalid API call.' }),
    })
    const client = new AlphaVantageClient(apiKey)

    await assert.rejects(async () => {
      await client.quote('IBM')
    }, {
      message: 'Alpha Vantage error: Invalid API call.',
    })
  })

  it('throws when the API returns a note payload', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ Note: 'Rate limit reached.' }),
    })
    const client = new AlphaVantageClient(apiKey)

    await assert.rejects(async () => {
      await client.quote('IBM')
    }, {
      message: 'Alpha Vantage rate limit or note: Rate limit reached.',
    })
  })

  it('throws when the API returns an information payload', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ Information: 'Request limit reached.' }),
    })
    const client = new AlphaVantageClient(apiKey)

    await assert.rejects(async () => {
      await client.quote('IBM')
    }, {
      message: 'Alpha Vantage information: Request limit reached.',
    })
  })

  it('supports searchKeywords helper', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ bestMatches: [{ '1. symbol': 'IBM' }] }),
    })
    const client = new AlphaVantageClient(apiKey)
    const result = await client.searchKeywords('IBM')

    assert.strictEqual(result.bestMatches[0]['1. symbol'], 'IBM')
  })

  it('supports timeSeriesDaily helper with adjusted flag', async () => {
    globalThis.fetch = async (url) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        'Meta Data': { '2. Symbol': 'IBM' },
        'Time Series (Daily)': { '2024-01-01': { '1. open': '100' } },
      }),
    })

    const client = new AlphaVantageClient(apiKey)
    const result = await client.timeSeriesDaily('IBM', { adjusted: true })

    assert.ok(result['Meta Data'])
    assert.strictEqual(result['Time Series (Daily)']['2024-01-01']['1. open'], '100')
  })

  it('supports timeSeriesDaily helper default (not adjusted)', async () => {
    globalThis.fetch = async (url) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        'Meta Data': { '2. Symbol': 'IBM' },
        'Time Series (Daily)': { '2024-01-02': { '1. open': '101' } },
      }),
    })

    const client = new AlphaVantageClient(apiKey)
    const result = await client.timeSeriesDaily('IBM')

    assert.ok(result['Meta Data'])
    assert.strictEqual(result['Time Series (Daily)']['2024-01-02']['1. open'], '101')
  })

  it('throws when no fetch implementation is available', () => {
    globalThis.fetch = undefined
    assert.throws(() => new AlphaVantageClient(apiKey, { fetcher: undefined }), {
      message: 'A fetch implementation is required for AlphaVantageClient',
    })
  })

  it('supports overview helper and returns OverviewResponse', async () => {
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({
        Symbol: 'IBM',
        Name: 'International Business Machines Corporation',
        Exchange: 'NYSE',
        Currency: 'USD',
        Sector: 'Technology',
        'P/E Ratio': '23.5',
        EPS: '9.33',
        'Market Capitalization': '180000000000',
      }),
    })

    const client = new AlphaVantageClient(apiKey)
    const result = await client.overview('IBM')

    assert.ok(result instanceof OverviewResponse)
    assert.strictEqual(result.symbol, 'IBM')
    assert.strictEqual(result.name, 'International Business Machines Corporation')
    assert.strictEqual(result.exchange, 'NYSE')
    assert.strictEqual(result.currency, 'USD')
    assert.strictEqual(result.sector, 'Technology')
    assert.strictEqual(result.peRatio, 23.5)
    assert.strictEqual(result.eps, 9.33)
    assert.strictEqual(result.marketCapitalization, 180000000000)
  })

  it('OverviewResponse hasUsefulInformation is true when data is present', () => {
    const payload = {
      Symbol: 'IBM',
      Name: 'International Business Machines Corporation',
      Exchange: 'NYSE',
      Currency: 'USD',
    }

    const overview = new OverviewResponse(payload)
    assert.strictEqual(overview.hasUsefulInformation, true)
  })

  it('OverviewResponse hasUsefulInformation is false when symbol is missing', () => {
    const payload = {
      Name: 'International Business Machines Corporation',
      Exchange: 'NYSE',
    }

    const overview = new OverviewResponse(payload)
    assert.strictEqual(overview.hasUsefulInformation, false)
  })

  it('OverviewResponse hasUsefulInformation is false when only symbol is present', () => {
    const payload = {
      Symbol: 'IBM',
    }

    const overview = new OverviewResponse(payload)
    assert.strictEqual(overview.hasUsefulInformation, false)
  })

  it('OverviewResponse parses numeric fields correctly', () => {
    const payload = {
      Symbol: 'IBM',
      Name: 'IBM',
      'Market Capitalization': '180000000000',
      'P/E Ratio': '23.5',
      EPS: '9.33',
      'Dividend Yield': '0.025',
    }

    const overview = new OverviewResponse(payload)
    assert.strictEqual(typeof overview.marketCapitalization, 'number')
    assert.strictEqual(typeof overview.peRatio, 'number')
    assert.strictEqual(typeof overview.eps, 'number')
    assert.strictEqual(typeof overview.dividendYield, 'number')
    assert.strictEqual(overview.marketCapitalization, 180000000000)
    assert.strictEqual(overview.peRatio, 23.5)
    assert.strictEqual(overview.eps, 9.33)
    assert.strictEqual(overview.dividendYield, 0.025)
  })

  it('OverviewResponse sets null for missing numeric fields', () => {
    const payload = {
      Symbol: 'IBM',
      Name: 'IBM',
    }

    const overview = new OverviewResponse(payload)
    assert.strictEqual(overview.peRatio, null)
    assert.strictEqual(overview.eps, null)
    assert.strictEqual(overview.marketCapitalization, null)
  })

  it('OverviewResponse parses all optional string fields', () => {
    const payload = {
      Symbol: 'MSFT',
      'Asset type': 'Common Stock',
      Name: 'Microsoft Corporation',
      Description: 'A technology company',
      CIK: '0000000789',
      Exchange: 'NASDAQ',
      Currency: 'USD',
      Country: 'United States',
      Sector: 'Technology',
      Industry: 'Software',
    }

    const overview = new OverviewResponse(payload)
    assert.strictEqual(overview.assetType, 'Common Stock')
    assert.strictEqual(overview.description, 'A technology company')
    assert.strictEqual(overview.cik, '0000000789')
    assert.strictEqual(overview.country, 'United States')
    assert.strictEqual(overview.industry, 'Software')
  })

  it('OverviewResponse sets null for missing string fields', () => {
    const payload = {
      Symbol: 'IBM',
      Name: 'IBM',
    }

    const overview = new OverviewResponse(payload)
    assert.strictEqual(overview.assetType, null)
    assert.strictEqual(overview.description, null)
    assert.strictEqual(overview.cik, null)
    assert.strictEqual(overview.country, null)
    assert.strictEqual(overview.industry, null)
  })

  it('OverviewResponse parses all financial metrics', () => {
    const payload = {
      Symbol: 'AAPL',
      Name: 'Apple Inc.',
      EBITDA: '119000000000',
      'PEG Ratio': '2.5',
      'Book Value': '3.85',
      'Dividend per Share': '0.24',
      'Dividend Yield': '0.0045',
      'Revenue per Share TTM': '28.50',
      'Profit Margin': '0.25',
      'Operating Margin TTM': '0.30',
      'Return on Assets YTD': '0.15',
      'Return on Equity TTM': '0.85',
      'Revenue TTM': '394000000000',
      'Gross Profit TTM': '170000000000',
    }

    const overview = new OverviewResponse(payload)
    assert.strictEqual(overview.ebitda, 119000000000)
    assert.strictEqual(overview.pegRatio, 2.5)
    assert.strictEqual(overview.bookValue, 3.85)
    assert.strictEqual(overview.dividendPerShare, 0.24)
    assert.strictEqual(overview.dividendYield, 0.0045)
    assert.strictEqual(overview.revenuePerShareTTM, 28.50)
    assert.strictEqual(overview.profitMargin, 0.25)
    assert.strictEqual(overview.operatingMarginTTM, 0.30)
    assert.strictEqual(overview.returnOnAssetsYTD, 0.15)
    assert.strictEqual(overview.returnOnEquityTTM, 0.85)
    assert.strictEqual(overview.revenueTTM, 394000000000)
    assert.strictEqual(overview.grossProfitTTM, 170000000000)
  })

  it('OverviewResponse sets null for missing financial metrics', () => {
    const payload = {
      Symbol: 'TEST',
      Name: 'Test Company',
    }

    const overview = new OverviewResponse(payload)
    assert.strictEqual(overview.ebitda, null)
    assert.strictEqual(overview.pegRatio, null)
    assert.strictEqual(overview.bookValue, null)
    assert.strictEqual(overview.dividendPerShare, null)
    assert.strictEqual(overview.dividendYield, null)
    assert.strictEqual(overview.revenuePerShareTTM, null)
    assert.strictEqual(overview.profitMargin, null)
    assert.strictEqual(overview.operatingMarginTTM, null)
    assert.strictEqual(overview.returnOnAssetsYTD, null)
    assert.strictEqual(overview.returnOnEquityTTM, null)
    assert.strictEqual(overview.revenueTTM, null)
    assert.strictEqual(overview.grossProfitTTM, null)
  })
})
