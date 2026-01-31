/**
 * Multi-Source Stock Market Data Scraper - Node.js Version
 * Combines data from TradingView, Screener.in, and Tickertape
 * Provides comprehensive analysis with source attribution
 */

const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();
const PORT = 5001;

// Middleware
app.use(cors());
app.use(express.json());

class MultiSourceStockScraper {
    constructor(stockSymbol) {
        this.stockSymbol = stockSymbol.toUpperCase();
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        };
        
        this.urls = {
            tradingview: `https://in.tradingview.com/symbols/NSE-${stockSymbol}/`,
            screener: `https://www.screener.in/company/${stockSymbol}/consolidated/`,
            tickertape: `https://www.tickertape.in/stocks/${stockSymbol.toLowerCase()}`
        };
        
        this.data = {
            stock_symbol: stockSymbol,
            scraped_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            sources: {},
            combined_data: {},
            summary: {}
        };
    }
    
    async fetchPage(url, sourceName) {
        try {
            const response = await axios.get(url, {
                headers: this.headers,
                timeout: 15000
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching ${sourceName}:`, error.message);
            return null;
        }
    }
    
    async scrapeTradingView() {
        const html = await this.fetchPage(this.urls.tradingview, 'TradingView');
        if (!html) return {};
        
        const $ = cheerio.load(html);
        const data = { price_data: {} };
        
        // Try to find price elements
        $('[class*="price"], [class*="last"], [class*="quote"]').each((i, elem) => {
            const text = $(elem).text().trim();
            const match = text.match(/₹?\s*([\d,]+\.?\d*)/);
            if (match && !data.price_data.current_price) {
                data.price_data.current_price = `₹${match[1]}`;
                return false; // Break the loop
            }
        });
        
        // Look for change percentage
        $('[class*="change"], [class*="percent"]').each((i, elem) => {
            const text = $(elem).text().trim();
            const match = text.match(/([-+]?\d+\.?\d*%)/);
            if (match && !data.price_data.change_percent) {
                data.price_data.change_percent = match[1];
                return false;
            }
        });
        
        this.data.sources.tradingview = data;
        return data;
    }
    
    async scrapeScreener() {
        const html = await this.fetchPage(this.urls.screener, 'Screener');
        if (!html) return {};
        
        const $ = cheerio.load(html);
        const data = {
            company_info: {},
            financials: {},
            ratios: {}
        };
        
        // Get company name
        const nameElem = $('h1.h3').first();
        if (nameElem.length) {
            data.company_info.name = nameElem.text().trim();
        }
        
        // Get current price from Screener
        $('.number').each((i, elem) => {
            const text = $(elem).text().trim();
            if (text.includes('₹') || /^\d+\.?\d*$/.test(text)) {
                if (!data.company_info.price && parseFloat(text.replace(/[₹,]/g, '')) > 0) {
                    data.company_info.price = text;
                }
            }
        });
        
        // Get key ratios
        $('li').each((i, elem) => {
            const text = $(elem).text().trim();
            
            // Market Cap
            if (text.includes('Market Cap')) {
                const match = text.match(/₹\s*([\d,]+\.?\d*)\s*Cr/);
                if (match) data.ratios.market_cap = `₹${match[1]} Cr`;
            }
            
            // P/E Ratio
            if (text.includes('Stock P/E')) {
                const match = text.match(/Stock P\/E\s*([\d.]+)/);
                if (match) data.ratios.pe_ratio = match[1];
            }
            
            // Book Value
            if (text.includes('Book Value')) {
                const match = text.match(/₹\s*([\d,]+\.?\d*)/);
                if (match) data.ratios.book_value = `₹${match[1]}`;
            }
            
            // ROE
            if (text.includes('ROE')) {
                const match = text.match(/([\d.]+)%/);
                if (match) data.ratios.roe = `${match[1]}%`;
            }
        });
        
        this.data.sources.screener = data;
        return data;
    }
    
    async scrapeTickertape() {
        const html = await this.fetchPage(this.urls.tickertape, 'Tickertape');
        if (!html) return {};
        
        const $ = cheerio.load(html);
        const data = { metrics: {} };
        
        // Tickertape scraping logic (similar pattern as above)
        // You can add more specific selectors based on Tickertape's structure
        
        this.data.sources.tickertape = data;
        return data;
    }
    
    async scrapeAllSources() {
        await this.scrapeTradingView();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.scrapeScreener();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.scrapeTickertape();
    }
    
    generateSummary() {
        const sources = this.data.sources;
        let summary = [];
        
        // Stock name
        const name = sources.screener?.company_info?.name || this.stockSymbol;
        summary.push(`📊 ${name}`);
        
        // Current Price
        const price = sources.tradingview?.price_data?.current_price || 
                     sources.screener?.company_info?.price || 
                     'N/A';
        summary.push(`💰 Current Price: ${price}`);
        
        // Change Percentage
        const change = sources.tradingview?.price_data?.change_percent;
        if (change) {
            const direction = change.includes('-') ? 'DOWN' : 'UP';
            summary.push(`📈 Today's Change: ${change} ${direction}`);
        }
        
        // Market Cap
        const marketCap = sources.screener?.ratios?.market_cap;
        if (marketCap) {
            summary.push(`🏢 Market Cap: ${marketCap}`);
        }
        
        // P/E Ratio
        const pe = sources.screener?.ratios?.pe_ratio;
        if (pe) {
            const peValue = parseFloat(pe);
            let valuation = 'Fair';
            if (peValue < 15) valuation = 'Cheap';
            else if (peValue > 30) valuation = 'Expensive';
            else if (peValue > 50) valuation = 'Very Expensive';
            
            summary.push(`📊 P/E Ratio: ${pe} (${valuation})`);
        }
        
        // ROE
        const roe = sources.screener?.ratios?.roe;
        if (roe) {
            summary.push(`💹 Return on Equity: ${roe}`);
        }
        
        // Book Value
        const bookValue = sources.screener?.ratios?.book_value;
        if (bookValue) {
            summary.push(`📖 Book Value: ${bookValue}`);
        }
        
        // Risk Assessment (simple heuristic)
        let risk = 'Medium Risk';
        if (pe) {
            const peValue = parseFloat(pe);
            if (peValue < 20 && roe && parseFloat(roe) > 15) {
                risk = 'Low Risk';
            } else if (peValue > 50) {
                risk = 'High Risk';
            }
        }
        summary.push(`⚠️ Risk Level: ${risk}`);
        
        this.data.summary = summary.join('\n');
        return this.data.summary;
    }
    
    getSourcesList() {
        const sourcesList = [];
        if (this.data.sources.tradingview && Object.keys(this.data.sources.tradingview).length > 0) {
            sourcesList.push('TradingView');
        }
        if (this.data.sources.screener && Object.keys(this.data.sources.screener).length > 0) {
            sourcesList.push('Screener.in');
        }
        if (this.data.sources.tickertape && Object.keys(this.data.sources.tickertape).length > 0) {
            sourcesList.push('Tickertape');
        }
        return sourcesList;
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
        
        console.log(`Analyzing stock: ${symbol}`);
        
        const scraper = new MultiSourceStockScraper(symbol);
        await scraper.scrapeAllSources();
        scraper.generateSummary();
        
        const response = {
            success: true,
            symbol: symbol.toUpperCase(),
            timestamp: scraper.data.scraped_at,
            summary: scraper.data.summary,
            sources: scraper.getSourcesList(),
            raw_data: scraper.data.sources
        };
        
        res.json(response);
        
    } catch (error) {
        console.error('Error analyzing stock:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error while analyzing stock',
            details: error.message
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'running',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   StockAI API Server Running           ║
║   Port: ${PORT}                           ║
║   Status: Active                       ║
╚════════════════════════════════════════╝
    `);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(`Analysis endpoint: POST http://localhost:${PORT}/api/analyze`);
});

module.exports = app;