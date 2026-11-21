#Get all metrics for a given ticker
@app.get("/all_data_for_tickersss")
async def all_data_for_tickersss(ticker: str):
    client = get_db_client()  
    batch_stmts = [
        libsql_client.Statement("SELECT buy_date, sell_date, quantity, buy_price, sell_price, realized_pnl FROM settled_trades WHERE ticker = ? ORDER BY sell_date DESC", [ticker]),
        libsql_client.Statement("SELECT trade_date, quantity, price FROM raw_trades WHERE ticker = ? AND action = 'BUY'", [ticker]),
        libsql_client.Statement("SELECT last_traded_price, history_252d_json,ff_string,dist_dma_50_pct,dma_200 FROM current_holdings WHERE ticker = ?", [ticker]),
        libsql_client.Statement("SELECT comments FROM stock_comments WHERE ticker = ?", [ticker]),
        libsql_client.Statement("SELECT announcements FROM stock_announcements WHERE ticker = ?", [ticker]),
        libsql_client.Statement("SELECT label, url FROM stock_links WHERE ticker = ?", [ticker])
    ]

    results = await client.batch(batch_stmts)
    set_res, raw_res, hold_res, notes_res, ann_res, links_res = results

    # 2. EXTRACT VARIABLES
    tot_realized = sum(r[5] for r in set_res.rows) if set_res.rows else 0.0

    ltp = hold_res.rows[0][0] if hold_res.rows and hold_res.rows[0][0] is not None else 0
    chart_json = hold_res.rows[0][1] if hold_res.rows and hold_res.rows[0][1] is not None else ""
    ff_string = hold_res.rows[0][2] if hold_res.rows and hold_res.rows[0][2] is not None else ""
    dist_dma_50_pct = hold_res.rows[0][3] if hold_res.rows and hold_res.rows[0][3] is not None else ""
    dma_200 = hold_res.rows[0][4] if hold_res.rows and hold_res.rows[0][4] is not None else ""

    dma_200_pct = (ltp-dma_200)/dma_200*100 if dma_200 else ""
    

    existing_comment = notes_res.rows[0][0] if notes_res.rows else ""
    existing_announcement = ann_res.rows[0][0] if ann_res.rows else ""

    ff = ff_string.split("|") if ff_string else []
    
    
    invested = 0.0
    unrealized = 0.0
    table_data = []
    tx_no = 1
    dates = []
    amts = []

    # Process Settled Trades
    if set_res.rows:
        for r in set_res.rows:
            b_date, s_date, qty, b_price, s_price, pnl = r[0], r[1], r[2], r[3], r[4], r[5]
            
            table_data.append({ "tx_no" : tx_no,
                "Sell Date": s_date, "Buy Date": b_date,
                "Sell Price": f"{s_price:,.2f}", "Buy Price": f"{b_price:,.2f}",
                "Qty": round(qty, 2), "P&L": f"{pnl:,.0f}"
            })
            dates.append(b_date)
            dates.append(s_date)
            amts.append(-b_price*qty) # Buy price is negative
            amts.append(s_price*qty)

            tx_no += 1

    # Process Open Trades
    if raw_res.rows:
        today_date = pd.Timestamp.now(tz='Asia/Kolkata').date()
        today_str = today_date.strftime('%Y-%m-%d')
        for r in raw_res.rows:
            b_date, qty, b_price = r[0], r[1], r[2]
            
            if ltp:
                simulated_pnl = (ltp - b_price) * qty
                unrealized += simulated_pnl
                table_data.append({ "tx_no" : tx_no,
                    "Sell Date": today_str, "Buy Date": b_date,
                    "Sell Price": f"{ltp:,.2f}", "Buy Price": f"{b_price:,.2f}",
                    "Qty": round(qty, 2), "P&L": f"{simulated_pnl:,.0f}",
                })
                dates.append(b_date)
                dates.append(today_str)
                amts.append(-b_price*qty) # Buy price is negative
                amts.append(ltp*qty)

                tx_no += 1
                invested += qty * b_price

    total_pnl = tot_realized + unrealized
    # Calculate XIRR
    xirr_val = "N/A"
    try:
        dat = [d.date() for d in pd.to_datetime(dates, dayfirst=False)]
        xirr_val = f"{xirr(dat,amts)*100:.1f}%"
    except Exception:
        pass

    return {"invested":format_inr(invested),
             "tot_realized":format_inr(tot_realized), 
             "unrealized":format_inr(unrealized), 
             "total_pnl":format_inr(total_pnl),
            "xirr_val":xirr_val, 
            "chart_json":chart_json,

            "ffpctval": ff[0] if len(ff) > 0 else None,
            "ffdaysval": ff[1] if len(ff) > 1 else None,
            "ffvalMethodval": ff[2] if len(ff) > 2 else None,

   #          "ff_string":ff_string, 
             "dist_dma_50_pct":f"{dist_dma_50_pct:.1f}%" if dist_dma_50_pct else "" ,
            "dma_200_pct":f"{dma_200_pct:.1f}%" if dma_200_pct else "" , 
            "table_data":table_data,
            "existing_comment":existing_comment,
            "existing_announcement":existing_announcement}

def format_inr(number,decimals=0):
    s, *d = str(number).partition(".")
    # Group last 3 digits, then group remaining digits in pairs of 2
    r = ",".join([s[max(i - 2, 0):i] for i in range(len(s) - 3, 0, -2)][::-1] + [s[-3:]])
    if decimals:
      return f"{r}" if not d[1] else f"₹{r}.{d[1][:decimals]}"
    return f"{r}"