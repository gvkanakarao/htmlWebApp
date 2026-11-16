from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os
import libsql_client
from datetime import datetime
import pandas as pd

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
        print("Database initialized and Dairy_db table verified.")
    finally:
        await client.close()

# Pydantic models for request validation
class DairyEntry(BaseModel, extra="allow"):
    main: str
    sub: str
    text_input: str

class CategoryCreate(BaseModel):
    main: str
    sub: str

# 1. Endpoint to Handle New Entry (with appending logic & date formatting)
@app.post("/dairy/entry")
async def add_dairy_entry(entry: DairyEntry):
    client = get_db_client()
    try:
        current_date = datetime.now().strftime("%d-%m-%Y")
        new_line = f"{current_date};{entry.main};{entry.sub};{entry.text_input}"

        result = await client.execute("SELECT Data FROM Dairy_db WHERE Main = ? AND Sub = ?", [entry.main, entry.sub])
        rows = result.rows

        if rows and rows[0][0]:
            existing_data = rows[0][0]
            updated_data = existing_data + "\n" + new_line
            await client.execute("UPDATE Dairy_db SET Data = ? WHERE Main = ? AND Sub = ?", [updated_data, entry.main, entry.sub])
        else:
            await client.execute(
                "INSERT INTO Dairy_db (Main, Sub, Data) VALUES (?, ?, ?) ON CONFLICT(Main, Sub) DO UPDATE SET Data = ?",
                [entry.main, entry.sub, new_line, new_line]
            )

        return {"success": True, "message": "Entry added and appended successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()

# 2. Endpoint to Fetch Categories for Dropdowns
@app.get("/dairy/categories")
async def get_categories():
    client = get_db_client()
    try:
        result = await client.execute("SELECT DISTINCT Main, Sub FROM Dairy_db")
        categories = {}
        for row in result.rows:
            main, sub = row[0], row[1]
            if main:
                if main not in categories:
                    categories[main] = []
                if sub and sub not in categories[main]:
                    categories[main].append(sub)
        
        # Fallback if empty so dropdowns aren't blank
        if not categories:
            categories = {"Market": ["EQ", "MF"], "Health": ["General", "Specific"]}
            
        return categories
    except Exception as e:
        return {"Market": ["EQ", "MF"], "Health": ["General", "Specific"]}
    finally:
        await client.close()

# 3. Endpoint to Add New Category
@app.post("/dairy/category")
async def add_category(cat: CategoryCreate):
    client = get_db_client()
    try:
        await client.execute(
            "INSERT OR IGNORE INTO Dairy_db (Main, Sub, Data) VALUES (?, ?, ?)",
            [cat.main, cat.sub, ""]
        )
        return {"success": True, "message": "Category added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()

# 4. Endpoint to Fetch Records for Workspace Textarea
@app.get("/dairy/records")
async def get_records(main: str, sub: str):
    client = get_db_client()
    try:
        result = await client.execute("SELECT Data FROM Dairy_db WHERE Main = ? AND Sub = ?", [main, sub])
        rows = result.rows
        data = rows[0][0] if rows and rows[0][0] else ""
        return {"data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()


# 5. Endpoint to Download Entire Database as a Clean CSV Table with exact parsing
@app.get("/dairy/export-csv")
async def export_csv():
    client = get_db_client()
    df = pd.DataFrame(columns=['Date', 'Main', 'Sub', 'Data'])  # Initialize an empty DataFrame with the desired columns

    try:
        result = await client.execute("SELECT  Data FROM Dairy_db")
        
        if not result.rows:
            return Response(
                content="No data available for export.",
                media_type="text/plain",
                headers={"Content-Disposition": "attachment; filename=Dairy_db_export.txt"}
            )

             
        for row in result.rows:
            raw_data = row[0]  
            if not raw_data:
                continue  # Skip empty Data fields
            #split the raw_data new lines
            for line in raw_data.splitlines():
                ls = line.split(sep=";", maxsplit=3)
                if len(ls) == 4:  # Ensure that the line has exactly 4 parts
                    df.loc[len(df)] = ls
                else:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Invalid data format found in line: '{line}'"
                    )


        # Convert DataFrame to CSV
        #df.to_csv('output.csv', index=False)
        csv_content = df.to_csv(index=False)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=Dairy_db_export.csv"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()
from pydantic import BaseModel

# 6. Endpoint to update edited records for a specific Main/Sub category
@app.put("/dairy/records")
async def update_records(record: DairyEntry):
    client = get_db_client()
    try:
        await client.execute(
            "UPDATE Dairy_db SET Data = ? WHERE Main = ? AND Sub = ?",
            [record.text_input, record.main, record.sub]
        )
        return {"success": True, "message": "Records updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        await client.close()
