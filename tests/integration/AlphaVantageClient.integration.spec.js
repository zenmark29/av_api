import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { AlphaVantageClient, OverviewResponse } from '../../src/av_api.js'

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
   testFn('fetches a global quote for VTI', async () => {
    const client = new AlphaVantageClient(apiKey)
    const quote = await client.quote('VTI')

    assert.strictEqual(quote.symbol, 'VTI')
    assert.ok(quote.hasUsefulInformation)
  })
})
