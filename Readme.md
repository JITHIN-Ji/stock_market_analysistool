# StockAI - Multi-Source Stock Analysis Platform

A modern, professional stock analysis platform that scrapes data from multiple Indian stock market sources (TradingView, Screener.in, Tickertape) and provides comprehensive financial insights.

## 🚀 Features

- **Multi-Source Data Aggregation**: Combines data from TradingView, Screener.in, and Tickertape
- **Real-Time Analysis**: Instant stock analysis with beautiful UI
- **Comprehensive Metrics**: Price, P/E Ratio, Market Cap, ROE, Book Value, and Risk Assessment
- **Indian Market Focus**: Optimized for NSE stocks
- **Modern UI**: Glass-morphic design with currency rain animation
- **Responsive Design**: Works on desktop and mobile devices

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)
- Internet connection (for scraping live data)

## 🛠️ Installation

### Step 1: Install Node.js Dependencies

```bash
npm install
```

This will install:
- `express` - Web server framework
- `axios` - HTTP client for web scraping
- `cheerio` - HTML parsing (like BeautifulSoup in Python)
- `cors` - Cross-origin resource sharing
- `nodemon` - Development tool for auto-restart (optional)

### Step 2: Start the Backend Server

```bash
npm start
```

Or for development with auto-restart:

```bash
npm run dev
```

You should see:
```
╔════════════════════════════════════════╗
║   StockAI API Server Running           ║
║   Port: 5001                           ║
║   Status: Active                       ║
╚════════════════════════════════════════╝
```

### Step 3: Open the Frontend

Open `index.html` in your web browser:

**Option 1: Direct File**
```bash
# On Windows
start index.html

# On Mac
open index.html

# On Linux
xdg-open index.html
```

**Option 2: Using a Local Server (Recommended)**
```bash
# Install http-server globally (one time)
npm install -g http-server

# Run local server
http-server -p 8080

# Then open: http://localhost:8080
```

## 📖 Usage

### Analyzing a Stock

1. Enter a stock symbol (e.g., `RELIANCE`, `TCS`, `INFY`)
2. Click "Analyze Market" or press Enter
3. Wait for the analysis (usually 3-5 seconds)
4. View the comprehensive report

### Quick Access Chips

Click on any of the popular stock chips:
- RELIANCE
- TCS
- INFY
- HDFC BANK
- ICICI BANK
- TATA MOTORS
- ITC
- OLA ELECTRIC

### Report Features

- **Copy Report**: Copy the entire analysis to clipboard
- **New Analysis**: Start a fresh analysis

## 🏗️ Architecture

### Backend (stock-api.js)

```
Node.js + Express Server (Port 5001)
│
├── POST /api/analyze
│   ├── Accepts: { symbol: "RELIANCE" }
│   └── Returns: Analysis with summary and sources
│
└── GET /api/health
    └── Server health check
```

### Frontend (index.html)

- Pure HTML/CSS/JavaScript (no frameworks needed)
- Responsive design with Tailwind-inspired utility classes
- Animated background (currency rain effect)
- Fetch API for backend communication

### Data Flow

```
User Input → Frontend → Backend API → Web Scrapers → Data Aggregation → Analysis → Frontend Display
```

## 🔧 API Endpoints

### Analyze Stock

**Request:**
```http
POST http://localhost:5001/api/analyze
Content-Type: application/json

{
  "symbol": "RELIANCE"
}
```

**Response:**
```json
{
  "success": true,
  "symbol": "RELIANCE",
  "timestamp": "2025-01-31 12:30:45 IST",
  "summary": "📊 Reliance Industries...\n💰 Current Price: ₹2,850...",
  "sources": ["TradingView", "Screener.in"],
  "raw_data": {
    "tradingview": {...},
    "screener": {...}
  }
}
```

### Health Check

```http
GET http://localhost:5001/api/health
```

## 🎨 Customization

### Adding More Stock Sources

Edit `stock-api.js` and add a new scraping method:

```javascript
async scrapeNewSource() {
    const html = await this.fetchPage(this.urls.newsource, 'NewSource');
    if (!html) return {};
    
    const $ = cheerio.load(html);
    const data = {};
    
    // Add your scraping logic here
    
    this.data.sources.newsource = data;
    return data;
}
```

### Changing Port

Edit `stock-api.js`:
```javascript
const PORT = 5001; // Change to your preferred port
```

Also update `index.html`:
```javascript
fetch('http://localhost:YOUR_PORT/api/analyze', {
```

### Styling

All styles are in the `<style>` section of `index.html`. Modify CSS custom properties:

```css
:root {
    --accent-green: #10B981;
    --accent-blue: #3B82F6;
    --accent-gold: #F59E0B;
    /* ... */
}
```

## 🐛 Troubleshooting

### "Could not connect to server"

**Solution:**
1. Make sure Node.js server is running (`npm start`)
2. Check if port 5001 is available
3. Verify no firewall blocking localhost

### "Failed to analyze stock"

**Possible causes:**
1. Invalid stock symbol (must be NSE listed)
2. Website structure changed (scraper needs update)
3. Network/internet issues
4. Rate limiting from source websites

**Solution:**
- Try a different stock symbol
- Check your internet connection
- Wait a few minutes and try again

### CORS Errors

If you see CORS errors in browser console:

**Solution:**
- Use `http-server` or similar local server instead of opening file directly
- CORS is already enabled in the backend with `app.use(cors())`

## 📊 Technical Details

### Web Scraping Strategy

1. **TradingView**: Scrapes price and change data
2. **Screener.in**: Scrapes company fundamentals (P/E, Market Cap, ROE)
3. **Tickertape**: Additional metrics (optional)

### Error Handling

- Graceful fallback if source is unavailable
- Timeout protection (15 seconds per request)
- User-friendly error messages

### Performance

- Asynchronous scraping for speed
- 1-second delay between sources to avoid rate limiting
- Typical analysis time: 3-5 seconds

## 🔒 Legal & Ethical Considerations

**Important Notes:**
- This tool is for educational purposes
- Respect robots.txt of websites
- Don't scrape excessively (implement rate limiting)
- Check terms of service of data sources
- Not financial advice - for informational purposes only

## 🚀 Future Enhancements

- [ ] Database integration for historical data
- [ ] Real-time WebSocket updates
- [ ] More data sources (MoneyControl, NSE official)
- [ ] Technical indicators (RSI, MACD, Moving Averages)
- [ ] Portfolio tracking
- [ ] Email alerts
- [ ] Export to PDF/Excel
- [ ] Authentication system
- [ ] Cloud deployment

## 📝 License

This project is for educational purposes. Please ensure compliance with data source terms of service.

## 🤝 Contributing

Feel free to:
- Report bugs
- Suggest features
- Improve scraping logic
- Enhance UI/UX

## 📞 Support

If you encounter issues:
1. Check this README
2. Verify all prerequisites are installed
3. Check browser console for errors
4. Check Node.js server logs

---

**Happy Analyzing! 📈💹**