#Base model to post comments, announcements
class CommentUpdate(BaseModel):
    ticker: str
    comments: str
    announcements: str

# 8. Endpoint to Fetch All stoks from raw and settled trades tables
@app.get("/all/tickers")
async def get_all_tickers():
    client = get_db_client()
    try:
        t_res = await client.execute("SELECT DISTINCT ticker FROM raw_trades UNION SELECT DISTINCT ticker FROM settled_trades ORDER BY ticker")
        return [row[0] for row in t_res.rows] if t_res.rows else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


# 2. Save comments and announcements for a specific stock in stock_comments table
@app.post("/comments")
async def save_comments(data: CommentUpdate):
    client = get_db_client()
    try:
        await client.execute(
            "INSERT OR REPLACE INTO stock_comments (ticker, comments) VALUES (?, ?)",
            [data.ticker, data.comments]
        )
        await client.execute(
            "INSERT OR REPLACE INTO stock_announcements (ticker, announcements) VALUES (?, ?)",
            [data.ticker, data.announcements]
        )
        return {"success": True, "message": "Comments and announcements saved successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()

