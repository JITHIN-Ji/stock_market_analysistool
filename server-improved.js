/**
 * Improved Multi-Source Stock Market Data Scraper
 * Uses APIs where possible and improved scraping techniques
 */

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Better headers to avoid detection
const getBrowserHeaders = () => ({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0'
});

class ImprovedStockScraper {
    constructor(stockSymbol) {
        this.stockSymbol = stockSymbol.toUpperCase();
        this.data = {
            stock_symbol: stockSymbol,
            scraped_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            sources: {},
            combined_data: {},
            summary: {}
        };
    }
    
    // Method 1: Try Yahoo Finance API (more reliable)
    async fetchYahooFinanceData() {
        try {
            const symbol = `${this.stockSymbol}.NS`; // NSE stocks
            
            // Yahoo Finance query API
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
            
            const response = await axios.get(url, {
                headers: getBrowserHeaders(),
                timeout: 10000
            });
            
            const result = response.data.chart.result[0];
            const meta = result.meta;
            const quote = result.indicators.quote[0];
            
            const data = {
                current_price: meta.regularMarketPrice,
                previous_close: meta.previousClose,
                change: meta.regularMarketPrice - meta.previousClose,
                change_percent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose * 100).toFixed(2),
                volume: meta.regularMarketVolume,
                currency: meta.currency,
                exchange: meta.exchangeName
            };
            
            this.data.sources.yahoo_finance = data;
            return data;
            
        } catch (error) {
            console.error('Yahoo Finance API Error:', error.message);
            return null;
        }
    }
    
    // Method 2: Try NSE India API
    async fetchNSEData() {
        try {
            const url = `https://www.nseindia.com/api/quote-equity?symbol=${this.stockSymbol}`;
            
            const response = await axios.get(url, {
                headers: {
                    ...getBrowserHeaders(),
                    'Referer': 'https://www.nseindia.com/',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                timeout: 10000
            });
            
            const data = response.data;
            
            const parsed = {
                current_price: data.priceInfo?.lastPrice,
                change: data.priceInfo?.change,
                change_percent: data.priceInfo?.pChange,
                open: data.priceInfo?.open,
                high: data.priceInfo?.intraDayHighLow?.max,
                low: data.priceInfo?.intraDayHighLow?.min,
                volume: data.preOpenMarket?.totalTradedVolume,
                market_cap: data.metadata?.pdSectorInd,
                pe_ratio: data.metadata?.pdSectorPe,
                company_name: data.info?.companyName
            };
            
            this.data.sources.nse = parsed;
            return parsed;
            
        } catch (error) {
            console.error('NSE API Error:', error.message);
            return null;
        }
    }
    
    // Method 3: Improved Screener.in scraping
    async scrapeScreener() {
        try {
            const url = `https://www.screener.in/company/${this.stockSymbol}/consolidated/`;
            
            const response = await axios.get(url, {
                headers: getBrowserHeaders(),
                timeout: 15000
            });
            
            const $ = cheerio.load(response.data);
            const data = {
                company_info: {},
                financials: {},
                ratios: {}
            };
            
            // Company name
            const nameElem = $('h1').first().text().trim();
            if (nameElem) {
                data.company_info.name = nameElem;
            }
            
            // Extract data from top ratios list
            $('#top-ratios li').each((i, elem) => {
                const text = $(elem).text().trim();
                
                // Market Cap
                if (text.includes('Market Cap')) {
                    const match = text.match(/₹\s*([\d,]+\.?\d*)\s*Cr/);
                    if (match) data.ratios.market_cap = parseFloat(match[1].replace(/,/g, ''));
                }
                
                // Current Price
                if (text.includes('Current Price')) {
                    const match = text.match(/₹\s*([\d,]+\.?\d*)/);
                    if (match) data.company_info.price = parseFloat(match[1].replace(/,/g, ''));
                }
                
                // P/E Ratio
                if (text.includes('Stock P/E')) {
                    const match = text.match(/Stock P\/E\s*([\d.]+)/);
                    if (match) data.ratios.pe_ratio = parseFloat(match[1]);
                }
                
                // Book Value
                if (text.includes('Book Value')) {
                    const match = text.match(/₹\s*([\d,]+\.?\d*)/);
                    if (match) data.ratios.book_value = parseFloat(match[1].replace(/,/g, ''));
                }
                
                // ROE
                if (text.includes('ROE')) {
                    const match = text.match(/([\d.]+)%/);
                    if (match) data.ratios.roe = parseFloat(match[1]);
                }
                
                // ROCE
                if (text.includes('ROCE')) {
                    const match = text.match(/([\d.]+)%/);
                    if (match) data.ratios.roce = parseFloat(match[1]);
                }
            });
            
            // Extract data from company info section
            $('li[class*="flex"]').each((i, elem) => {
                const text = $(elem).text().trim();
                
                if (text.includes('Market Cap')) {
                    const match = text.match(/₹\s*([\d,]+\.?\d*)\s*Cr/);
                    if (match) data.ratios.market_cap = parseFloat(match[1].replace(/,/g, ''));
                }
            });
            
            this.data.sources.screener = data;
            return data;
            
        } catch (error) {
            console.error('Screener.in Error:', error.message);
            return null;
        }
    }
    
    // Method 4: Alternative - Money Control scraping
    async scrapeMoneyControl() {
        try {
            const searchUrl = `https://www.moneycontrol.com/stocks/cptmarket/compsearchnew.php?search_data=&cid=&mbsearch_str=${this.stockSymbol}&topsearch_type=1`;
            
            const response = await axios.get(searchUrl, {
                headers: getBrowserHeaders(),
                timeout: 10000
            });
            
            const $ = cheerio.load(response.data);
            // Parse MoneyControl data structure
            // This is a fallback method
            
            this.data.sources.moneycontrol = {};
            return {};
            
        } catch (error) {
            console.error('MoneyControl Error:', error.message);
            return null;
        }
    }
    
    async scrapeAllSources() {
        // Try multiple sources in parallel for speed
        const results = await Promise.allSettled([
            this.fetchYahooFinanceData(),
            this.fetchNSEData(),
            this.scrapeScreener()
        ]);
        
        console.log('Data fetch results:', results.map(r => r.status));
        
        // If all failed, return error
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
        
        if (successCount === 0) {
            throw new Error('Unable to fetch data from any source. Stock symbol might be invalid or services are unavailable.');
        }
    }
    
    // Combine data from multiple sources
    getCombinedData() {
        const sources = this.data.sources;
        const combined = {};
        
        // Current Price (prioritize Yahoo > NSE > Screener)
        combined.current_price = 
            sources.yahoo_finance?.current_price ||
            sources.nse?.current_price ||
            sources.screener?.company_info?.price;
        
        // Change Percentage
        combined.change_percent = 
            sources.yahoo_finance?.change_percent ||
            sources.nse?.change_percent;
        
        // Company Name
        combined.company_name = 
            sources.nse?.company_name ||
            sources.screener?.company_info?.name ||
            this.stockSymbol;
        
        // Market Cap
        combined.market_cap = sources.screener?.ratios?.market_cap;
        
        // P/E Ratio
        combined.pe_ratio = 
            sources.screener?.ratios?.pe_ratio ||
            sources.nse?.pe_ratio;
        
        // ROE
        combined.roe = sources.screener?.ratios?.roe;
        
        // Book Value
        combined.book_value = sources.screener?.ratios?.book_value;
        
        this.data.combined_data = combined;
        return combined;
    }
    
    generateSummary() {
        const data = this.getCombinedData();
        let summary = [];
        
        // Company name
        summary.push(`📊 ${data.company_name || this.stockSymbol}`);
        
        // Current Price
        if (data.current_price && typeof data.current_price === 'number') {
            summary.push(`💰 Current Price: ₹${data.current_price.toFixed(2)}`);
        } else {
            summary.push(`💰 Current Price: N/A`);
        }
        
        // Change Percentage
        if (data.change_percent) {
            const direction = parseFloat(data.change_percent) >= 0 ? 'UP' : 'DOWN';
            summary.push(`📈 Today's Change: ${data.change_percent}% ${direction}`);
        }
        
        // Market Cap
        if (data.market_cap && typeof data.market_cap === 'number') {
            summary.push(`🏢 Market Cap: ₹${data.market_cap.toLocaleString('en-IN')} Cr`);
        }
        
        // P/E Ratio
        if (data.pe_ratio && typeof data.pe_ratio === 'number') {
            let valuation = 'Fair';
            if (data.pe_ratio < 15) valuation = 'Cheap';
            else if (data.pe_ratio > 30 && data.pe_ratio <= 50) valuation = 'Expensive';
            else if (data.pe_ratio > 50) valuation = 'Very Expensive';
            
            summary.push(`📊 P/E Ratio: ${data.pe_ratio.toFixed(2)} (${valuation})`);
        }
        
        // ROE
        if (data.roe && typeof data.roe === 'number') {
            summary.push(`💹 Return on Equity: ${data.roe.toFixed(2)}%`);
        }
        
        // Book Value
        if (data.book_value && typeof data.book_value === 'number') {
            summary.push(`📖 Book Value: ₹${data.book_value.toFixed(2)}`);
        }
        
        // Risk Assessment
        let risk = 'Medium Risk';
        if (data.pe_ratio && data.roe && typeof data.pe_ratio === 'number' && typeof data.roe === 'number') {
            if (data.pe_ratio < 20 && data.roe > 15) {
                risk = 'Low Risk';
            } else if (data.pe_ratio > 50) {
                risk = 'High Risk';
            }
        }
        summary.push(`⚠️ Risk Level: ${risk}`);
        
        this.data.summary = summary.join('\n');
        return this.data.summary;
    }
    
    async generateFinalSummary() {
        const data = this.getCombinedData();
        
        const prompt = `You are a professional stock analyst. Analyze the following stock data and provide a concise summary in this EXACT format:

Stock: ${data.company_name} (${this.stockSymbol})
Current Price: ₹${data.current_price || 'N/A'}  |  Change: ${data.change_percent || 'N/A'}%
Valuation: [Cheap/Fair/Expensive] (explain briefly)
Risk Level: [Low/Moderate/High]
Strengths:
* [strength 1]
* [strength 2]
Concerns:
* [concern 1]
* [concern 2]
Data Reliability: [Good/Fair/Limited] ([X] Sources Verified)

Stock Data:
- Stock Symbol: ${this.stockSymbol}
- Company Name: ${data.company_name || 'N/A'}
- Current Price: ₹${data.current_price || 'N/A'}
- Price Change: ${data.change_percent || 'N/A'}%
- P/E Ratio: ${data.pe_ratio || 'N/A'}
- Return on Equity (ROE): ${data.roe || 'N/A'}%
- Market Cap: ₹${data.market_cap || 'N/A'} Cr
- Book Value: ₹${data.book_value || 'N/A'}

Instructions:
1. Keep the response concise and professional
2. Valuation should be based on P/E ratio: <15 = Cheap, 15-30 = Fair, >30 = Expensive
3. Risk level should consider P/E, market cap, and volatility
4. List 2-3 strengths and 2-3 concerns based on the metrics
5. Data reliability based on how many metrics are available
6. Use the exact format shown above`;

        try {
            const openaiApiKey = process.env.OPENAI_API_KEY;
            
            if (!openaiApiKey) {
                return {
                    summary: this.generateBasicSummary(data),
                    prompt: prompt,
                    error: 'OpenAI API key not configured'
                };
            }

            const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a professional stock market analyst.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            }, {
                headers: {
                    'Authorization': `Bearer ${openaiApiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const aiSummary = response.data.choices[0].message.content;

            return {
                summary: aiSummary,
                prompt: prompt,
                model: 'gpt-3.5-turbo'
            };

        } catch (error) {
            console.error('OpenAI API Error:', error.message);
            return {
                summary: this.generateBasicSummary(data),
                prompt: prompt,
                error: error.message
            };
        }
    }

    generateBasicSummary(data) {
        let valuation = 'Fair';
        let riskLevel = 'Moderate';
        
        if (data.pe_ratio && typeof data.pe_ratio === 'number') {
            if (data.pe_ratio < 15) valuation = 'Cheap (Low P/E)';
            else if (data.pe_ratio > 30) valuation = 'Expensive (High P/E)';
            
            if (data.pe_ratio > 50) riskLevel = 'High';
            else if (data.pe_ratio < 20) riskLevel = 'Low-Moderate';
        }

        let strengths = [];
        let concerns = [];

        if (data.roe && typeof data.roe === 'number') {
            if (data.roe > 15) strengths.push('Good ROE indicating profitability');
            else concerns.push('Low ROE, profitability concerns');
        }

        if (data.market_cap && typeof data.market_cap === 'number' && data.market_cap > 100000) {
            strengths.push('Large-cap stock, stable');
        }
        
        if (data.change_percent) {
            if (parseFloat(data.change_percent) > 0) {
                strengths.push('Positive price momentum');
            } else {
                concerns.push('Recent price decline');
            }
        }

        if (strengths.length === 0) strengths.push('Data limited for full analysis');
        if (concerns.length === 0) concerns.push('Limited historical data available');

        const sourcesCount = Object.keys(this.data.sources).length;

        const priceStr = (data.current_price && typeof data.current_price === 'number') 
            ? `₹${data.current_price.toFixed(2)}` 
            : 'N/A';

        return `Stock: ${data.company_name} (${this.stockSymbol})
Current Price: ${priceStr}  |  Change: ${data.change_percent || 'N/A'}%
Valuation: ${valuation}
Risk Level: ${riskLevel}
Strengths:
${strengths.map(s => `* ${s}`).join('\n')}
Concerns:
${concerns.map(c => `* ${c}`).join('\n')}
Data Reliability: ${sourcesCount >= 2 ? 'Good' : 'Fair'} (${sourcesCount} Sources Verified)`;
    }
    
    getSourcesList() {
        return Object.keys(this.data.sources).map(key => {
            const sourceNames = {
                'yahoo_finance': 'Yahoo Finance',
                'nse': 'NSE India',
                'screener': 'Screener.in',
                'moneycontrol': 'MoneyControl'
            };
            return sourceNames[key] || key;
        });
    }
}

// API Endpoint
app.post('/api/analyze', async (req, res) => {
    try {
        const { symbol } = req.body;
        
        if (!symbol) {
            return res.status(400).json({
                success: false,
                error: 'Stock symbol is required'
            });
        }
        
        console.log(`[${new Date().toISOString()}] Analyzing stock: ${symbol}`);
        
        const scraper = new ImprovedStockScraper(symbol);
        await scraper.scrapeAllSources();
        scraper.generateSummary();
        const finalSummary = await scraper.generateFinalSummary();
        
        const response = {
            success: true,
            symbol: symbol.toUpperCase(),
            timestamp: scraper.data.scraped_at,
            summary: scraper.data.summary,
            final_summary: finalSummary.summary,
            ai_prompt: finalSummary.prompt,
            ai_model: finalSummary.model || 'basic',
            ai_error: finalSummary.error || null,
            sources: scraper.getSourcesList(),
            raw_data: scraper.data.sources,
            combined_data: scraper.data.combined_data
        };
        
        console.log(`[${new Date().toISOString()}] Successfully analyzed ${symbol}`);
        console.log(`Sources used: ${response.sources.join(', ')}`);
        
        res.json(response);
        
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error analyzing stock:`, error.message);
        res.status(500).json({
            success: false,
            error: error.message || 'Internal server error while analyzing stock',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'StockAI API',
        status: 'active',
        endpoints: {
            analyze: 'POST /api/analyze',
            health: 'GET /api/health'
        }
    });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════╗
║   StockAI API Server Running           ║
║   Port: ${PORT}                        ║
║   Status: Active                       ║
║   Environment: ${process.env.NODE_ENV || 'production'}          ║
╚════════════════════════════════════════╝
    `);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Analysis endpoint: POST http://localhost:${PORT}/api/analyze`);
});

// Error handling
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});

module.exports = app;