#1. Fetch all data from current holdings table
@app.get("/all/holdings_data")
async def holdings_data():
    client = get_db_client()
    try:
        t_res = await client.execute("""
            SELECT h.*, c.comments, a.announcements, cat.category, cat.y_symbol
            FROM current_holdings as h
            LEFT JOIN stock_comments as c ON h.ticker = c.ticker
            LEFT JOIN stock_announcements as a ON h.ticker = a.ticker
            LEFT JOIN stock_cat as cat ON h.ticker = cat.ticker
            ORDER BY h.ticker""")
        hold = [list(row) for row in t_res.rows] if t_res.rows else []
        invested = 0
        currentVal = 0
        for row in hold:
            invested += row[1]*row[2]
            currentVal += row[1]*row[3]
        return {"hold":hold, "top_metrics" : [invested,currentVal]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()
