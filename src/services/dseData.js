// Comprehensive DSE Equities Metadata & Realistic Market Baseline Reference

export const DSE_SECTORS = [
  "All",
  "Bank",
  "Pharmaceuticals",
  "Fuel & Power",
  "Telecommunication",
  "Engineering",
  "Food & Allied",
  "Textile",
  "Financial Institutions",
  "Insurance",
  "Cement",
  "IT Sector",
  "Mutual Funds",
  "Ceramics",
  "Paper & Printing",
  "Miscellaneous"
];

// Rich Symbol Metadata Directory
export const STOCK_DIRECTORY = {
  // Top Tier Banks
  "BRACBANK": { name: "BRAC Bank PLC", sector: "Bank", ltp: 49.80, change: 1.20, pe: 9.4, roe: 16.8, eps: 5.30, debtToEquity: 0.35, currentRatio: 1.45, volume: 2450000 },
  "EBL": { name: "Eastern Bank PLC", sector: "Bank", ltp: 32.50, change: 0.60, pe: 7.2, roe: 15.4, eps: 4.51, debtToEquity: 0.40, currentRatio: 1.38, volume: 1120000 },
  "CITYBANK": { name: "The City Bank PLC", sector: "Bank", ltp: 24.10, change: -0.30, pe: 6.8, roe: 14.1, eps: 3.55, debtToEquity: 0.45, currentRatio: 1.30, volume: 1890000 },
  "ISLAMIBANK": { name: "Islami Bank Bangladesh PLC", sector: "Bank", ltp: 38.60, change: 0.00, pe: 10.5, roe: 11.2, eps: 3.67, debtToEquity: 0.52, currentRatio: 1.25, volume: 780000 },
  "DUTCHBANGL": { name: "Dutch-Bangla Bank PLC", sector: "Bank", ltp: 58.20, change: 0.80, pe: 8.9, roe: 17.2, eps: 6.54, debtToEquity: 0.38, currentRatio: 1.42, volume: 850000 },
  "PRIMEBANK": { name: "Prime Bank PLC", sector: "Bank", ltp: 22.80, change: 0.40, pe: 6.2, roe: 13.9, eps: 3.68, debtToEquity: 0.42, currentRatio: 1.33, volume: 920000 },
  "UCB": { name: "United Commercial Bank PLC", sector: "Bank", ltp: 14.30, change: -0.20, pe: 7.8, roe: 10.5, eps: 1.83, debtToEquity: 0.55, currentRatio: 1.22, volume: 1450000 },
  "PUBALIBANK": { name: "Pubali Bank PLC", sector: "Bank", ltp: 31.20, change: 0.50, pe: 6.1, roe: 15.8, eps: 5.12, debtToEquity: 0.36, currentRatio: 1.40, volume: 980000 },
  "ABBANK": { name: "AB Bank PLC", sector: "Bank", ltp: 9.80, change: -0.10, pe: 14.2, roe: 5.8, eps: 0.69, debtToEquity: 0.78, currentRatio: 1.12, volume: 650000 },
  "PREMIERBAN": { name: "Premier Bank PLC", sector: "Bank", ltp: 14.60, change: 0.10, pe: 5.9, roe: 13.4, eps: 2.47, debtToEquity: 0.44, currentRatio: 1.31, volume: 820000 },

  // Pharmaceuticals & Chemicals
  "SQURPHARMA": { name: "Square Pharmaceuticals PLC", sector: "Pharmaceuticals", ltp: 228.50, change: 3.20, pe: 11.8, roe: 21.4, eps: 19.36, debtToEquity: 0.12, currentRatio: 2.85, volume: 1650000 },
  "RENATA": { name: "Renata Limited", sector: "Pharmaceuticals", ltp: 742.00, change: -4.50, pe: 19.5, roe: 16.5, eps: 38.05, debtToEquity: 0.48, currentRatio: 1.62, volume: 120000 },
  "BEXIMCO": { name: "Beximco Limited", sector: "Pharmaceuticals", ltp: 115.60, change: 0.00, pe: 12.4, roe: 12.8, eps: 9.32, debtToEquity: 0.68, currentRatio: 1.28, volume: 450000 },
  "BXPHARMA": { name: "Beximco Pharmaceuticals Ltd.", sector: "Pharmaceuticals", ltp: 148.20, change: 1.90, pe: 12.1, roe: 17.8, eps: 12.25, debtToEquity: 0.32, currentRatio: 1.95, volume: 740000 },
  "ACMELAB": { name: "The ACME Laboratories Ltd.", sector: "Pharmaceuticals", ltp: 89.40, change: 1.10, pe: 10.2, roe: 14.6, eps: 8.76, debtToEquity: 0.45, currentRatio: 1.58, volume: 420000 },
  "IBNSINA": { name: "The IBN SINA Pharmaceutical Industry PLC", sector: "Pharmaceuticals", ltp: 312.00, change: 4.80, pe: 14.2, roe: 22.1, eps: 21.97, debtToEquity: 0.22, currentRatio: 2.10, volume: 210000 },
  "ORIONPHARM": { name: "Orion Pharma Ltd.", sector: "Pharmaceuticals", ltp: 78.50, change: -1.20, pe: 18.6, roe: 8.4, eps: 4.22, debtToEquity: 0.72, currentRatio: 1.15, volume: 890000 },
  "MARICO": { name: "Marico Bangladesh Limited", sector: "Pharmaceuticals", ltp: 2450.00, change: 15.00, pe: 24.5, roe: 64.2, eps: 100.00, debtToEquity: 0.15, currentRatio: 1.80, volume: 35000 },
  "ACI": { name: "Advanced Chemical Industries Ltd.", sector: "Pharmaceuticals", ltp: 215.00, change: -2.30, pe: 28.5, roe: 6.2, eps: 7.54, debtToEquity: 0.95, currentRatio: 1.05, volume: 180000 },
  "KOHINOOR": { name: "Kohinoor Chemical Company (BD) Ltd.", sector: "Pharmaceuticals", ltp: 580.00, change: 8.50, pe: 16.4, roe: 28.5, eps: 35.37, debtToEquity: 0.35, currentRatio: 1.74, volume: 140000 },

  // Telecommunication & IT
  "GP": { name: "Grameenphone Ltd.", sector: "Telecommunication", ltp: 286.40, change: 3.60, pe: 11.2, roe: 48.6, eps: 25.57, debtToEquity: 0.42, currentRatio: 1.35, volume: 1980000 },
  "ROBI": { name: "Robi Axiata Limited", sector: "Telecommunication", ltp: 26.80, change: 0.40, pe: 22.4, roe: 7.5, eps: 1.20, debtToEquity: 0.65, currentRatio: 1.18, volume: 3200000 },
  "BSCCL": { name: "Bangladesh Submarine Cables PLC", sector: "Telecommunication", ltp: 165.20, change: 2.10, pe: 12.8, roe: 23.4, eps: 12.91, debtToEquity: 0.18, currentRatio: 2.45, volume: 490000 },
  "AAMRANET": { name: "aamra networks limited", sector: "IT Sector", ltp: 46.20, change: 0.80, pe: 12.5, roe: 14.2, eps: 3.70, debtToEquity: 0.32, currentRatio: 1.65, volume: 560000 },
  "GENEXIL": { name: "Genex Infosys Limited", sector: "IT Sector", ltp: 54.30, change: -0.70, pe: 16.8, roe: 11.5, eps: 3.23, debtToEquity: 0.58, currentRatio: 1.28, volume: 740000 },
  "ADNTEL": { name: "ADN Telecom Limited", sector: "IT Sector", ltp: 112.50, change: 1.50, pe: 18.2, roe: 15.8, eps: 6.18, debtToEquity: 0.28, currentRatio: 1.82, volume: 310000 },
  "EGEN": { name: "eGeneration Limited", sector: "IT Sector", ltp: 32.40, change: 0.20, pe: 21.0, roe: 9.8, eps: 1.54, debtToEquity: 0.40, currentRatio: 1.50, volume: 290000 },

  // Fuel & Power
  "TITASGAS": { name: "Titas Gas Transmission & Dist. Co. Ltd.", sector: "Fuel & Power", ltp: 37.80, change: 0.30, pe: 10.8, roe: 8.5, eps: 3.50, debtToEquity: 0.25, currentRatio: 1.95, volume: 620000 },
  "POWERGRID": { name: "Power Grid Company of Bangladesh Ltd.", sector: "Fuel & Power", ltp: 48.50, change: -0.50, pe: 13.5, roe: 7.2, eps: 3.59, debtToEquity: 0.85, currentRatio: 1.10, volume: 430000 },
  "UPGDCL": { name: "United Power Generation & Distribution Co. Ltd.", sector: "Fuel & Power", ltp: 218.00, change: 2.20, pe: 14.5, roe: 28.4, eps: 15.03, debtToEquity: 0.20, currentRatio: 2.15, volume: 380000 },
  "MJLBD": { name: "MJL Bangladesh PLC", sector: "Fuel & Power", ltp: 92.40, change: 1.10, pe: 9.8, roe: 18.6, eps: 9.43, debtToEquity: 0.30, currentRatio: 1.75, volume: 510000 },
  "JAMUNAOIL": { name: "Jamuna Oil Company Limited", sector: "Fuel & Power", ltp: 184.20, change: 1.80, pe: 7.5, roe: 24.2, eps: 24.56, debtToEquity: 0.15, currentRatio: 2.30, volume: 260000 },
  "MPETROLEUM": { name: "Meghna Petroleum Limited", sector: "Fuel & Power", ltp: 208.50, change: 2.40, pe: 6.9, roe: 26.5, eps: 30.22, debtToEquity: 0.12, currentRatio: 2.40, volume: 310000 },
  "PADMAOIL": { name: "Padma Oil Company Limited", sector: "Fuel & Power", ltp: 212.00, change: 1.60, pe: 7.8, roe: 22.8, eps: 27.18, debtToEquity: 0.14, currentRatio: 2.25, volume: 280000 },
  "SUMITPOWER": { name: "Summit Power Limited", sector: "Fuel & Power", ltp: 28.50, change: 0.00, pe: 8.5, roe: 14.2, eps: 3.35, debtToEquity: 0.55, currentRatio: 1.40, volume: 550000 },

  // Food & Allied / Multinational
  "BATBC": { name: "British American Tobacco Bangladesh Co.", sector: "Food & Allied", ltp: 412.50, change: 4.20, pe: 11.5, roe: 42.8, eps: 35.87, debtToEquity: 0.28, currentRatio: 1.65, volume: 1420000 },
  "UNILEVERCL": { name: "Unilever Consumer Care Limited", sector: "Food & Allied", ltp: 1980.00, change: -12.00, pe: 32.4, roe: 38.5, eps: 61.11, debtToEquity: 0.18, currentRatio: 1.70, volume: 28000 },
  "OLYMPIC": { name: "Olympic Industries Ltd.", sector: "Food & Allied", ltp: 154.20, change: 2.10, pe: 16.8, roe: 24.6, eps: 9.18, debtToEquity: 0.15, currentRatio: 2.50, volume: 460000 },
  "APEXFOODS": { name: "Apex Foods Limited", sector: "Food & Allied", ltp: 285.00, change: 3.50, pe: 24.2, roe: 8.9, eps: 11.78, debtToEquity: 0.75, currentRatio: 1.15, volume: 110000 },

  // Engineering & Manufacturing
  "WALTONHIL": { name: "Walton Hi-Tech Industries PLC", sector: "Engineering", ltp: 685.00, change: 6.00, pe: 16.2, roe: 18.9, eps: 42.28, debtToEquity: 0.38, currentRatio: 1.85, volume: 220000 },
  "BSRMSTEEL": { name: "BSRM Steels Limited", sector: "Engineering", ltp: 64.80, change: 0.90, pe: 8.6, roe: 14.5, eps: 7.53, debtToEquity: 0.62, currentRatio: 1.30, volume: 680000 },
  "BSRMLTD": { name: "Bangladesh Steel Re-Rolling Mills Ltd.", sector: "Engineering", ltp: 96.20, change: 1.40, pe: 9.1, roe: 15.2, eps: 10.57, debtToEquity: 0.58, currentRatio: 1.35, volume: 520000 },
  "SINGERBD": { name: "Singer Bangladesh Limited", sector: "Engineering", ltp: 142.00, change: -1.50, pe: 26.5, roe: 9.4, eps: 5.36, debtToEquity: 0.70, currentRatio: 1.20, volume: 310000 },
  "RUNNERAUTO": { name: "Runner Automobiles PLC", sector: "Engineering", ltp: 36.50, change: 0.30, pe: 35.0, roe: 3.5, eps: 1.04, debtToEquity: 0.82, currentRatio: 1.08, volume: 240000 },

  // Cement & Building
  "LHBL": { name: "LafargeHolcim Bangladesh PLC", sector: "Cement", ltp: 67.50, change: 1.10, pe: 13.8, roe: 26.4, eps: 4.89, debtToEquity: 0.15, currentRatio: 2.10, volume: 1850000 },
  "HEIDELBCEM": { name: "Heidelberg Materials Bangladesh PLC", sector: "Cement", ltp: 242.00, change: -2.00, pe: 18.5, roe: 12.1, eps: 13.08, debtToEquity: 0.45, currentRatio: 1.40, volume: 95000 },
  "PREMIERCEM": { name: "Premier Cement Mills PLC", sector: "Cement", ltp: 52.30, change: 0.40, pe: 15.4, roe: 11.8, eps: 3.40, debtToEquity: 0.68, currentRatio: 1.22, volume: 340000 },
  "BERGERPBL": { name: "Berger Paints Bangladesh Ltd.", sector: "Miscellaneous", ltp: 1820.00, change: 12.00, pe: 26.8, roe: 31.5, eps: 67.91, debtToEquity: 0.22, currentRatio: 1.90, volume: 45000 },

  // Non-Bank Financial Institutions
  "IDLC": { name: "IDLC Finance PLC", sector: "Financial Institutions", ltp: 42.40, change: 0.70, pe: 10.2, roe: 13.8, eps: 4.16, debtToEquity: 0.50, currentRatio: 1.35, volume: 760000 },
  "IPDC": { name: "IPDC Finance Limited", sector: "Financial Institutions", ltp: 23.50, change: -0.20, pe: 18.4, roe: 7.2, eps: 1.28, debtToEquity: 0.75, currentRatio: 1.18, volume: 640000 },
  "LANKABAFIN": { name: "LankaBangla Finance PLC", sector: "Financial Institutions", ltp: 19.80, change: 0.10, pe: 16.5, roe: 8.5, eps: 1.20, debtToEquity: 0.68, currentRatio: 1.22, volume: 1100000 },
  "DBH": { name: "DBH Finance PLC", sector: "Financial Institutions", ltp: 51.00, change: 0.50, pe: 9.8, roe: 14.5, eps: 5.20, debtToEquity: 0.38, currentRatio: 1.45, volume: 380000 },

  // Textile & Garments
  "ENVOYTEX": { name: "Envoy Textiles Limited", sector: "Textile", ltp: 46.80, change: 1.20, pe: 12.4, roe: 14.8, eps: 3.77, debtToEquity: 0.52, currentRatio: 1.42, volume: 540000 },
  "SQUARETEXT": { name: "Square Textiles PLC", sector: "Textile", ltp: 62.40, change: 0.80, pe: 10.8, roe: 15.6, eps: 5.78, debtToEquity: 0.28, currentRatio: 1.80, volume: 410000 },
  "MATINSPINN": { name: "Matin Spinning Mills PLC", sector: "Textile", ltp: 68.50, change: -0.40, pe: 11.2, roe: 16.2, eps: 6.12, debtToEquity: 0.34, currentRatio: 1.68, volume: 290000 },
  "SHEPHERD": { name: "Shepherd Industries PLC", sector: "Textile", ltp: 18.20, change: 0.10, pe: 24.5, roe: 6.5, eps: 0.74, debtToEquity: 0.68, currentRatio: 1.15, volume: 480000 },

  // Mutual Funds
  "1JANATAMF": { name: "First Janata Bank Mutual Fund", sector: "Mutual Funds", ltp: 6.20, change: 0.10, pe: 8.5, roe: 12.4, eps: 0.73, debtToEquity: 0.05, currentRatio: 2.90, volume: 850000 },
  "1STPRIMFMF": { name: "Prime Finance First Mutual Fund", sector: "Mutual Funds", ltp: 14.50, change: 0.00, pe: 9.2, roe: 11.8, eps: 1.58, debtToEquity: 0.04, currentRatio: 3.10, volume: 340000 },
  "ABB1STMF": { name: "AB Bank 1st Mutual Fund", sector: "Mutual Funds", ltp: 5.40, change: -0.10, pe: 11.0, roe: 8.2, eps: 0.49, debtToEquity: 0.06, currentRatio: 2.80, volume: 420000 },
  "AIBL1STIMF": { name: "AIBL 1st Islamic Mutual Fund", sector: "Mutual Funds", ltp: 8.10, change: 0.10, pe: 8.9, roe: 13.1, eps: 0.91, debtToEquity: 0.03, currentRatio: 3.40, volume: 560000 }
};

// Enriches stock record with known company directory metadata and preserves actual/historical values
export function getEnrichedStock(stock) {
  const sym = String(stock.symbol || "").toUpperCase();
  const known = STOCK_DIRECTORY[sym];

  // Derive sector based on symbol naming patterns if unmapped
  let sector = stock.sector || known?.sector || "Miscellaneous";
  if (!stock.sector && !known) {
    if (sym.includes("BANK")) sector = "Bank";
    else if (sym.includes("MF") || sym.includes("FMF") || sym.includes("MUTUAL")) sector = "Mutual Funds";
    else if (sym.includes("INS") || sym.includes("GENINS") || sym.includes("LIFE")) sector = "Insurance";
    else if (sym.includes("PHARM") || sym.includes("LAB") || sym.includes("CHEM")) sector = "Pharmaceuticals";
    else if (sym.includes("TEX") || sym.includes("SPIN") || sym.includes("SYNTH") || sym.includes("DYE")) sector = "Textile";
    else if (sym.includes("POWER") || sym.includes("GAS") || sym.includes("OIL") || sym.includes("PETRO")) sector = "Fuel & Power";
    else if (sym.includes("STEEL") || sym.includes("AUTO") || sym.includes("ENG") || sym.includes("CABLE")) sector = "Engineering";
    else if (sym.includes("CEM") || sym.includes("CEMENT")) sector = "Cement";
    else if (sym.includes("NET") || sym.includes("TEL") || sym.includes("TECH") || sym.includes("SYS") || sym.includes("INFO")) sector = "IT Sector";
    else if (sym.includes("FOOD") || sym.includes("SUGAR") || sym.includes("FEED") || sym.includes("TEA")) sector = "Food & Allied";
    else if (sym.includes("FIN") || sym.includes("LEASE") || sym.includes("CAP")) sector = "Financial Institutions";
  }

  const fallbackFlags = { ...(stock._historyFallback || {}) };

  // Use actual values from backend (which includes live + history fallback) or known directory baseline
  const ltp = stock.ltp != null ? Number(stock.ltp) : (known?.ltp != null ? known.ltp : null);
  const change = stock.change != null ? Number(stock.change) : (known?.change != null ? known.change : null);
  const changePercent = stock.changePercent != null ? Number(stock.changePercent) : (known?.change != null && known?.ltp != null ? Number(((known.change / (known.ltp - known.change)) * 100).toFixed(2)) : null);
  const pe = stock.pe != null ? Number(stock.pe) : (known?.pe != null ? known.pe : null);
  const roe = stock.roe != null ? Number(stock.roe) : (known?.roe != null ? known.roe : null);
  const eps = stock.eps != null ? Number(stock.eps) : (known?.eps != null ? known.eps : null);
  const debtToEquity = stock.debtToEquity != null ? Number(stock.debtToEquity) : (known?.debtToEquity != null ? known.debtToEquity : null);
  const currentRatio = stock.currentRatio != null ? Number(stock.currentRatio) : (known?.currentRatio != null ? known.currentRatio : null);
  const volume = stock.volume != null ? Number(stock.volume) : (known?.volume != null ? known.volume : null);

  const fullName = stock.fullName && stock.fullName !== "N/A" && stock.fullName !== sym
    ? stock.fullName
    : (known?.name || `${sym} Bangladesh Limited`);

  return {
    symbol: sym,
    fullName,
    sector,
    ltp,
    change,
    changePercent,
    pe,
    roe,
    eps,
    debtToEquity,
    currentRatio,
    volume,
    marketCap: stock.marketCap || (ltp && volume ? ltp * volume : null),
    _historyFallback: fallbackFlags
  };
}

// Helper to extract human-readable history tag: History (Date) for daily KPIs, History (Year) for annual KPIs
export function getFallbackTag(stock, field) {
  const fb = stock?._historyFallback?.[field];
  if (!fb) return null;
  if (typeof fb === 'string') {
    if (fb.startsWith('History')) return fb;
    const isDaily = ['ltp', 'change', 'changePercent', 'volume', 'pe', 'momentum'].includes(field);
    return isDaily ? 'History (Date)' : 'History (Year)';
  }
  return fb.tag || (fb.type === 'daily' ? `History (${fb.date})` : `History (${fb.year})`);
}
