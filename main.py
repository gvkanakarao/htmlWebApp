from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf

app = FastAPI()

# Allow frontend to communicate with backend locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/get-price")
def get_stock_price(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        # Fetch current price using history or fast_info
        todays_data = stock.history(period="1d")
        
        if todays_data.empty:
            raise HTTPException(status_code=404, detail="Ticker not found")
            
        current_price = todays_data['Close'].iloc[-1]
        return {"ticker": ticker.upper(), "price": round(current_price, 2)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch data")