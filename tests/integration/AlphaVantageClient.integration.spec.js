import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { AlphaVantageClient, OverviewResponse, GlobalQuoteResponse } from '../../src/av_api.js'

const apiKey = process.env.AV_KEY
const testFn = apiKey ? it : it.skip

describe('AlphaVantageClient integration', () => {
  beforeEach(async () => {
    if (!apiKey) return
    await new Promise((res) => setTimeout(res, 2000))
  })
  testFn('fetches a global quote for IBM', async () => {
    const client = new AlphaVantageClient(apiKey)
    const quote = await client.quote('IBM')

    assert.ok(quote instanceof GlobalQuoteResponse)
    assert.strictEqual(quote.symbol, 'IBM')
    assert.ok(quote.hasUsefulInformation)
  })

  testFn('fetches daily time series data for IBM', async () => {
    const client = new AlphaVantageClient(apiKey)
    const payload = await client.timeSeriesDaily('IBM')

    assert.ok(payload['Meta Data'])
    assert.ok(payload['Time Series (Daily)'])
  })

  testFn('fetches overview data for IBM', async () => {
    const client = new AlphaVantageClient(apiKey)
    const overview = await client.overview('IBM')

    assert.ok(overview instanceof OverviewResponse)
    assert.ok(overview.hasUsefulInformation)
    assert.strictEqual(overview.symbol, 'IBM')
    assert.ok(overview.name)
    assert.ok(overview.exchange)
    assert.ok(overview.currency)
  })

  testFn('calculates trailing annual dividend for IBM', async () => {
    const client = new AlphaVantageClient(apiKey)
    const result = await client.trailingAnnualDividend('IBM')

    assert.strictEqual(typeof result, 'number')
    assert.ok(result >= 0)
  })

  testFn('calculates trailing annual dividend for VTI', async () => {
    const client = new AlphaVantageClient(apiKey)
    const result = await client.trailingAnnualDividend('VTI')

    assert.strictEqual(typeof result, 'number')
    assert.ok(result >= 0)
  })

   testFn('fetches a global quote for VTI', async () => {
    const client = new AlphaVantageClient(apiKey)
    const quote = await client.quote('VTI')

    assert.ok(quote instanceof GlobalQuoteResponse)
    assert.strictEqual(quote.symbol, 'VTI')
    assert.ok(quote.hasUsefulInformation)
  })
})
