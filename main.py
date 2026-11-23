from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import libsql_client
from datetime import datetime
import pandas as pd
from pyxirr import xirr

# Load local environment variables
load_dotenv()

TURSO_DATABASE_URL = os.getenv("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

app = FastAPI()

# Allow frontend to communicate with backend locally
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#Function to format numbers in Indian Rupee format
def format_inr(number,decimals=0):
    s, *d = str(number).partition(".")
    # Group last 3 digits, then group remaining digits in pairs of 2
    r = ",".join([s[max(i - 2, 0):i] for i in range(len(s) - 3, 0, -2)][::-1] + [s[-3:]])
    if decimals:
      return f"₹{r}" if not d[1] else f"₹{r}.{d[1][:decimals]}"
    return f"₹{r}"

# Helper function to get database client
def get_db_client():
    return libsql_client.create_client(
        url=TURSO_DATABASE_URL,
        auth_token=TURSO_AUTH_TOKEN
    )

# Initialize Database Table on Startup (Async)
@app.on_event("startup")
async def startup_event():
    client = get_db_client()
    try:
        await client.execute("""
            CREATE TABLE IF NOT EXISTS Dairy_db (
                Main TEXT,
                Sub TEXT,
                Data TEXT,
                PRIMARY KEY (Main, Sub)
            );
        """)
    finally:
        await client.close()

#Import complete file dairy.py
with open("dairy.py") as f:
    exec(f.read())

#Import complete file deep.py
with open("deep.py") as f:
    exec(f.read())
with open("deep_2.py") as f:
    exec(f.read())

with open("hold.py") as f:
    exec(f.read())

# 12. Endpoint to Fetch All settled trades
@app.get("/settled_trades")
async def settled_trades(ticker: str):
    client = get_db_client()
    try:
        settled = await client.execute(
            "SELECT buy_date, sell_date, buy_price, sell_price,quantity, realized_pnl FROM settled_trades WHERE ticker = ?", 
            [ticker]
        )
        settle = settled.rows[0][0] if settled.rows else ""
        return [list(row) for row in settled.rows]

    except Exception as e:  
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()

#get all metrics from holdings table.
@app.get("/all_tx_xirr")
async def all_tx_xirr(ticker: str):
    client = get_db_client()
    try:
    # 1. BATCH QUERY: Fetch all required data in a single network trip
        batch_stmts = [
            libsql_client.Statement("SELECT buy_date, sell_date, quantity, buy_price, sell_price, realized_pnl FROM settled_trades WHERE ticker = ? ORDER BY sell_date DESC", [sel_tick]),
            libsql_client.Statement("SELECT trade_date, quantity, price FROM raw_trades WHERE ticker = ? AND action = 'BUY'", [sel_tick]),
            libsql_client.Statement("SELECT last_traded_price, history_252d_json,ff_string,dist_dma_50_pct,dma_200,average_price,quantity FROM current_holdings WHERE ticker = ?", [sel_tick]),
            libsql_client.Statement("SELECT comments FROM stock_comments WHERE ticker = ?", [sel_tick]),
            libsql_client.Statement("SELECT announcements FROM stock_announcements WHERE ticker = ?", [sel_tick]),
            libsql_client.Statement("SELECT link_id, label, url FROM stock_links WHERE ticker = ?", [sel_tick])
        ]
        results = client.batch(batch_stmts)

        if results.rows:
            pass
        else:
            pass
        

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()