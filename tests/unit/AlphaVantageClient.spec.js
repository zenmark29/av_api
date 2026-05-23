import { afterEach, beforeEach, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { AlphaVantageClient } from '../../src/av_api.js'

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

  it('builds a request and returns parsed JSON', async () => {
    const client = new AlphaVantageClient(apiKey)
    const result = await client.quote('IBM')

    assert.strictEqual(fetchMock.calls, 1)
    assert.strictEqual(result['Global Quote']['01. symbol'], 'IBM')
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
})
