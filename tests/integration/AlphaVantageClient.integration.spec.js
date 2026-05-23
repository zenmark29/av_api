import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { AlphaVantageClient } from '../../src/av_api.js'

const apiKey = process.env.AV_KEY
const testFn = apiKey ? it : it.skip

describe('AlphaVantageClient integration', () => {
  beforeEach(async () => {
    if (!apiKey) return
    await new Promise((res) => setTimeout(res, 2000))
  })
  testFn('fetches a global quote for IBM', async () => {
    const client = new AlphaVantageClient(apiKey)
    const payload = await client.quote('IBM')

    assert.ok(payload['Global Quote'])
    assert.strictEqual(payload['Global Quote']['01. symbol'], 'IBM')
  })

  testFn('fetches daily time series data for IBM', async () => {
    const client = new AlphaVantageClient(apiKey)
    const payload = await client.timeSeriesDaily('IBM')

    assert.ok(payload['Meta Data'])
    assert.ok(payload['Time Series (Daily)'])
  })
})
