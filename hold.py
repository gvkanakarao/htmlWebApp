#1. Fetch all data from current holdings table
@app.get("/all/holdings_data")
async def holdings_data():
    client = get_db_client()
    try:
        t_res = await client.execute("""
            SELECT h.*, c.comments, a.announcements
            FROM current_holdings as h
            LEFT JOIN stock_comments as c ON h.ticker = c.ticker
            LEFT JOIN stock_announcements as a ON h.ticker = a.ticker
            ORDER BY h.ticker""")
        cat_res = await client.execute("""
            SELECT key,value FROM app_metadata
            WHERE key != 'diary'""")
        hold = [list(row) for row in t_res.rows] if t_res.rows else []
        cat = [list(row) for row in cat_res.rows] if cat_res.rows else []
        invested = 0
        currentVal = 0
        for row in hold:
            invested += row[1]*row[2]
            currentVal += row[1]*row[3]
        return {"hold":hold, "top_metrics" : [invested,currentVal], "cats":cat}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()