# av_api

A small Alpha Vantage client library for personal use.

## Installation

```bash
npm install av_api
```

## Usage

```js
import AlphaVantageClient from 'av_api'

const client = new AlphaVantageClient(process.env.AV_KEY)
const dailyData = await client.timeSeriesDaily('IBM')
const quoteData = await client.quote('IBM')
```

## API

- `new AlphaVantageClient(apiKey)` - Create a client with your Alpha Vantage API key.
- `client.timeSeriesDaily(symbol, { outputSize, adjusted })` - Fetch daily time series data.
- `client.quote(symbol)` - Fetch the global quote for a symbol.
- `client.searchKeywords(keywords)` - Search symbols by keyword.

## Testing

This package uses Node.js built-in test runner and `c8` for coverage.

- `npm test` - run all tests with Node built-in test runner.
- `npm run test:unit` - run unit tests.
- `npm run test:integration` - run integration tests.
- `npm run coverage` - generate coverage reports with `c8`.

Integration tests require `ALPHA_VANTAGE_API_KEY` to be set in the environment.
