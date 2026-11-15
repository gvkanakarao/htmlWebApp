import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yfinance as yf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model for incoming MPIN check
class MPINRequest(BaseModel):
    mpin: str

@app.post("/verify-mpin")
def verify_mpin(data: MPINRequest):
    # Fetch MPIN from Render environment variables (default to "1234" for local testing if not set)
    correct_mpin = os.getenv("APP_MPIN", "1234")
    
    if data.mpin == correct_mpin:
        return {"success": True, "message": "Access granted"}
    else:
        raise HTTPException(status_code=401, detail="Invalid MPIN")

@app.get("/get-price")
def get_stock_price(ticker: str):
    try:
        stock = yf.Ticker(ticker)
        todays_data = stock.history(period="1d")
        
        if todays_data.empty:
            raise HTTPException(status_code=404, detail="Ticker not found")
            
        current_price = todays_data['Close'].iloc[-1]
        return {"ticker": ticker.upper(), "price": round(current_price, 2)}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch data")
