const BACKEND_URL = "http://127.0.0.1:8000";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Toggle buttons (safely inside DOMContentLoaded)
  const toggleHistoryBtn = document.getElementById("toggleHistoryBtn");
  if (toggleHistoryBtn) {
    toggleHistoryBtn.addEventListener("click", () => {
      const content = document.getElementById("historyContainer");
      if (content) {
        content.style.display =
          content.style.display === "none" ? "block" : "none";
      }
    });
  }

  const toggleResearchBtn = document.getElementById("toggleResearchBtn");
  if (toggleResearchBtn) {
    toggleResearchBtn.addEventListener("click", () => {
      const content = document.getElementById("researchContainer");
      if (content) {
        content.style.display =
          content.style.display === "none" ? "block" : "none";
      }
    });
  }
  // helper function to format dates!!
  const formatDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    return `${day}-${m}-${y.slice(2, 4)}`;
  };
  // 2. Main Stock & Notes Elements
  let all_tickers = [];
  const stock_select = document.getElementById("stockSelect");
  const saveBtn = document.getElementById("saveUpdatesBtn");
  const notesInput = document.getElementById("notesInput");
  const catalystsInput = document.getElementById("catalystsInput");
  //Metrics
  const metricInvested = document.getElementById("metricInvested");
  const metricRealizedPL = document.getElementById("metricRealizedPL");
  const metricUnrealizedPL = document.getElementById("metricUnrealizedPL");
  const metricTotalPL = document.getElementById("metricTotalPL");
  const metricXirr = document.getElementById("metricXirr");
  //BADges
  const badge = document.getElementById("badge_label");

  //1. Empty full page when no ticker selected
  function empty_page() {
    notesInput = "";
    catalystsInput = "";

    metricInvested = "";
    metricRealizedPL = "";
    metricUnrealizedPL = "";
    metricTotalPL = "";
    metricXirr = "";

    badge = "";
  }

  //2. Populate dropdown with fetched tickers
  function populateDropdowns() {
    if (stock_select) {
      const dataList = document.getElementById("stockOptions");

      all_tickers.forEach((stock) => {
        const option = document.createElement("option");
        option.value = stock;
        dataList.appendChild(option);
      });
    }
  }

  //3. Fetch all traded tickers from Turso
  async function load_all_tickers() {
    try {
      const response = await fetch(`${BACKEND_URL}/all/tickers`);
      if (response.ok) {
        all_tickers = await response.json();
        populateDropdowns();
      }
    } catch (error) {
      console.error("Failed to load tickers from backend:", error);
    }
  }
  //4. Get all metrics required for deep dive tab
  async function load_data_for_ticker(ticker) {
    if (!ticker) {
      empty_page();
      return;
    }
    try {
      const response = await fetch(
        `${BACKEND_URL}/all_data_for_tickersss?ticker=${encodeURIComponent(ticker)}`,
      );
      if (response.ok) {
        const {
          invested,
          tot_realized,
          unrealized,
          total_pnl,
          xirr_val,
          chart_json,
          // ff_string,
          ffpctval,
          ffdaysval,
          ffvalMethodval,

          dist_dma_50_pct,
          dma_200_pct,
          table_data,
          existing_comment,
          existing_announcement,
        } = await response.json();
        console.error(`invested value is ${invested}`);
        notesInput.value = existing_comment || "";
        catalystsInput.value = existing_announcement || "";
        if (metricInvested) metricInvested.textContent = invested || "-";
        if (metricRealizedPL)
          metricRealizedPL.textContent = tot_realized || "-";
        if (metricUnrealizedPL)
          metricUnrealizedPL.textContent = unrealized || "-";
        if (metricTotalPL) metricTotalPL.textContent = total_pnl || "-";
        if (metricXirr) metricXirr.textContent = xirr_val || "-";
        if (badge) {
          set_badge_string(
            ffpctval,
            ffdaysval,
            ffvalMethodval,
            dist_dma_50_pct,
            dma_200_pct,
          );
          add_table(table_data);
        }
      }
    } catch (error) {
      console.error(`Failed to Load All data for ${ticker}:`, error);
    }
  }
  //6. Set badge string
  function set_badge_string(
    ffpctval,
    ffdaysval,
    ffvalMethodval,
    dist_dma_50_pct,
    dma_200_pct,
  ) {
    // Badges
    let space = "&nbsp;&nbsp;&nbsp;";
    let tex = "";
    let r_st = "<span style = 'color: red'>";
    let r_end = "</span>";

    tex += ffpctval ? "⚡︎" + ffpctval + space : "";
    tex += ffdaysval ? ffdaysval + space : "";
    tex += ffvalMethodval ? "Valuation: " + ffvalMethodval + space : "";
    if (dist_dma_50_pct) {
      tex +=
        "50DMA: " +
        (dist_dma_50_pct.includes("-")
          ? r_st + dist_dma_50_pct + r_end
          : dist_dma_50_pct) +
        space;
    }
    if (dma_200_pct) {
      tex +=
        "200DMA: " +
        (dma_200_pct.includes("-") ? r_st + dma_200_pct + r_end : dma_200_pct) +
        space;
    }
    badge.innerHTML = tex;
  }

  // Load tickers on startup
  load_all_tickers();
  //7. Add table
  function add_table(x) {
    const tbody = document.getElementById("historyTableBody");
    tbody.innerHTML = x
      .map(
        (row, index) => `
          <tr>
          <td>${row.tx_no ?? index + 1}</td>
          <td>${formatDate(row["Sell Date"])}</td>
          <td>${formatDate(row["Buy Date"])}</td>
          <td>${row["Sell Price"]}</td>
          <td>${row["Buy Price"]}</td>
          <td>${row["Qty"]}</td>
          <td>${row["P&L"]}</td>
        </tr>`,
      )
      .join("");
    document.getElementById("historyTitle").innerHTML =
      `View Position History <span style = "color : red">(${x.length} Records</span>)`;
  }

  // Populate common links
  function populate_Links(ticker) {
    const dropdown = document.getElementById("linksDropdown");

    const option = document.createElement("option");
    option.textContent = "Screener";
    option.value = `https://www.screener.in/company/${ticker}/#chart`;
    dropdown.appendChild(option);

    const option2 = document.createElement("option");
    option2.textContent = "Trendlyne";
    option2.value = `https://trendlyne.com/research-reports/stock/${ticker}`;
    dropdown.appendChild(option2);
  }

  //6. Handle stock selection change
  if (stock_select) {
    stock_select.addEventListener("change", () => {
      const selectedTicker = stock_select.value;
      load_data_for_ticker(selectedTicker);
      populate_Links(selectedTicker);
    });
  }

  // Save comments and announcements for the selected stock
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const ticker = stock_select ? stock_select.value : ""; // Fixed: was tickerSelect.value
      const comments = notesInput ? notesInput.value : "";
      const announcements = catalystsInput ? catalystsInput.value : "";

      if (!ticker) {
        alert("Please select a ticker first.");
        return;
      }

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = "Saving...";

        const response = await fetch(`${BACKEND_URL}/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticker: ticker,
            comments: comments,
            announcements: announcements,
          }),
        });

        if (response.ok) {
          saveBtn.textContent = "Saved!";
          setTimeout(() => {
            saveBtn.textContent = "Save Updates";
          }, 1500);
        } else {
          alert("Failed to save comments.");
          saveBtn.textContent = "Save Updates";
        }
      } catch (error) {
        console.error("Error saving comments:", error);
        saveBtn.textContent = "Save Updates";
      } finally {
        saveBtn.disabled = false;
      }
    });
  }
});
