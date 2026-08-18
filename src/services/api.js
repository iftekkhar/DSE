import axios from 'axios';

const SERVER_URL = 'http://localhost:5001/api/stocks';

// generateSignals returns descriptive signals used in the expanded panel.
const generateSignals = (changeP, pe, roe, eps, debt, liquidity, volume) => {
  const signals = [];

  // 1. Valuation Signal
  if (pe !== null) {
    if (pe < 15) signals.push({ label: '✓ Undervalued', desc: 'Attractive P/E ratio relative to historical DSE averages.', usedKPIs: ['pe'] });
    else signals.push({ label: '✗ Premium Valuation', desc: 'Stock trading at a premium P/E; expectations are high.', usedKPIs: ['pe'] });
  } else {
    signals.push({ label: '• P/E data unavailable', desc: 'P/E ratio not provided by API.', usedKPIs: [] });
  }

  // 2. Efficiency Signal
  if (roe !== null) {
    if (roe > 18) signals.push({ label: '✓ High Efficiency', desc: 'Outstanding Return on Equity shows superior capital management.', usedKPIs: ['roe'] });
    else signals.push({ label: '✗ Moderate ROE', desc: 'Company is generating average returns on shareholder equity.', usedKPIs: ['roe'] });
  } else {
    signals.push({ label: '• ROE data unavailable', desc: 'ROE not provided by API.', usedKPIs: [] });
  }

  // 3. Momentum Signal
  if (changeP !== null) {
    if (changeP > 1.5) signals.push({ label: '✓ Bullish Bias', desc: 'Strong buying pressure observed in recent trading sessions.', usedKPIs: ['momentum'] });
    else if (changeP < -1.5) signals.push({ label: '✗ Bearish Trend', desc: 'Selling pressure detected; price is under significant correction.', usedKPIs: ['momentum'] });
    else signals.push({ label: '• Neutral Momentum', desc: 'Consolidation phase with low price volatility detected.', usedKPIs: ['momentum'] });
  } else {
    signals.push({ label: '• Momentum data unavailable', desc: 'Price change data not provided by API.', usedKPIs: [] });
  }

  // 4. Financial Health (Debt)
  if (debt !== null) {
    if (debt < 0.6) signals.push({ label: '✓ Healthy Balance Sheet', desc: 'Low debt levels indicate minimal financial risk for investors.', usedKPIs: ['debtToEquity'] });
    else signals.push({ label: '✗ High Leverage', desc: 'Significant debt detected which may impact future dividend capacity.', usedKPIs: ['debtToEquity'] });
  } else {
    signals.push({ label: '• Debt data unavailable', desc: 'Debt-to-equity not provided by API.', usedKPIs: [] });
  }

  // 5. Liquidity/Safety
  if (liquidity !== null) {
    if (liquidity > 1.2) signals.push({ label: '✓ Safe Liquidity', desc: 'Strong current ratio ensures company can meet all obligations.', usedKPIs: ['currentRatio'] });
    else signals.push({ label: '✗ Tight Liquidity', desc: 'Current assets barely cover liabilities; monitor cash flow.', usedKPIs: ['currentRatio'] });
  } else {
    signals.push({ label: '• Liquidity data unavailable', desc: 'Current ratio not provided by API.', usedKPIs: [] });
  }

  // 6. EPS
  if (eps !== null) {
    if (eps > 2) signals.push({ label: '✓ Healthy EPS', desc: 'Earnings per share indicate consistent profitability.', usedKPIs: ['eps'] });
    else signals.push({ label: '✗ Low EPS', desc: 'EPS is low compared to sector expectations.', usedKPIs: ['eps'] });
  } else {
    signals.push({ label: '• EPS data unavailable', desc: 'EPS not provided by API.', usedKPIs: [] });
  }

  // 7. Volume (liquidity in market)
  if (volume !== null) {
    if (volume > 1000) signals.push({ label: '✓ Active Volume', desc: 'Sufficient trading volume for liquidity and execution.', usedKPIs: ['volume'] });
    else signals.push({ label: '• Low Volume', desc: 'Low trading volume, higher slippage risk.', usedKPIs: ['volume'] });
  } else {
    signals.push({ label: '• Volume data unavailable', desc: 'Trading volume not provided by API.', usedKPIs: [] });
  }

  return signals;
};

export const fetchDSEData = async () => {
  try {
    const response = await axios.get(SERVER_URL);
    const stocksArray = Array.isArray(response.data) ? response.data : [];

    if (stocksArray.length === 0) {
      console.warn('API returned no stocks:', response.data);
      return [];
    }

    return stocksArray.map(stock => {
      // Do not synthesize KPI values. Use only values provided by the API.
      // Convert numeric-looking fields to numbers when present; otherwise keep null to indicate missing data.
      const ltp = stock.ltp !== undefined && stock.ltp !== null && stock.ltp !== '' ? parseFloat(stock.ltp) : null;
      const change = stock.change !== undefined && stock.change !== null && stock.change !== '' ? parseFloat(stock.change) : null;
      // Support multiple possible field names for previous close (ycp, previousClose, close)
      const prevClose = (stock.ycp !== undefined && stock.ycp !== null && stock.ycp !== '') ? parseFloat(stock.ycp)
        : (stock.previousClose !== undefined && stock.previousClose !== null && stock.previousClose !== '' ? parseFloat(stock.previousClose) : null);
      const prevCloseAlt = (stock.close !== undefined && stock.close !== null && stock.close !== '') ? parseFloat(stock.close) : null;
      const ycp = prevClose !== null ? prevClose : (prevCloseAlt !== null ? prevCloseAlt : null);
      const changeP = (ycp !== null && ycp !== 0 && change !== null) ? (change / ycp) * 100 : (stock.changePercent !== undefined && stock.changePercent !== null ? parseFloat(stock.changePercent) : null);

      const volume = stock.volume !== undefined && stock.volume !== null && stock.volume !== '' ? (parseInt(stock.volume, 10) || null) : null;

      const pe = stock.pe !== undefined && stock.pe !== null && stock.pe !== '' ? Number(stock.pe) : null;
      const roe = stock.roe !== undefined && stock.roe !== null && stock.roe !== '' ? Number(stock.roe) : null;
      const eps = stock.eps !== undefined && stock.eps !== null && stock.eps !== '' ? Number(stock.eps) : null;
      const debt = stock.debtToEquity !== undefined && stock.debtToEquity !== null && stock.debtToEquity !== '' ? Number(stock.debtToEquity) : null;
      const liquidity = stock.currentRatio !== undefined && stock.currentRatio !== null && stock.currentRatio !== '' ? Number(stock.currentRatio) : null;

      return {
        symbol: stock.symbol || 'N/A',
        // preserve any provided company name if present on the original API payload
        fullName: stock.name || stock.companyName || stock.longName || stock.symbol || 'N/A',
        ltp: ltp !== null ? Number(ltp.toFixed(2)) : null,
        change: change !== null ? Number(change.toFixed(2)) : null,
        changePercent: changeP !== null ? Number(changeP.toFixed(2)) : null,
        open: (stock.open !== undefined && stock.open !== null && stock.open !== '') ? Number(parseFloat(stock.open).toFixed(2)) : null,
        high: (stock.high !== undefined && stock.high !== null && stock.high !== '') ? Number(parseFloat(stock.high).toFixed(2)) : null,
        low: (stock.low !== undefined && stock.low !== null && stock.low !== '') ? Number(parseFloat(stock.low).toFixed(2)) : null,
        volume: volume,
        pe: pe !== null ? Number(pe.toFixed(2)) : null,
        roe: roe !== null ? Number(roe.toFixed(2)) : null,
        eps: eps !== null ? Number(eps.toFixed(2)) : null,
        debtToEquity: debt !== null ? Number(debt.toFixed(2)) : null,
        currentRatio: liquidity !== null ? Number(liquidity.toFixed(2)) : null,
        marketCap: stock.marketCap !== undefined && stock.marketCap !== null && stock.marketCap !== '' ? Number(stock.marketCap) : null,
        // descriptive signals for UI
        signals: generateSignals(changeP, pe, roe, eps, debt, liquidity, volume)
      };    });
  } catch (error) {
    console.error('Frontend: Error fetching DSE data from local server:', error.message);
    throw error;
  }
};
