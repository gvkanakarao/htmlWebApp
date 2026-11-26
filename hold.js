const BACKEND_URL = "https://stock-tracker-api-7snp.onrender.com";
// Create Object constructors for cards
function HoldingCard({
  symbol = "",
  qty = 0.0,
  buyPrice = 0.0,
  ltp = 0.0,
  dma50 = 0.0,
  dma200 = 0.0,
  high52W = 0.0,
  low52W = 0.0,
  ff_str = "",
  comments = "",
  announcements = "",
  links = [],
}) {
  this.symbol = symbol;
  this.qty = qty;
  this.buyPrice = buyPrice;
  this.ltp = ltp;
  this.dma50 = dma50;
  this.dma200 = dma200;
  this.high52W = high52W;
  this.low52W = low52W;
  this.distTo50 = ((ltp - dma50) / dma50) * 100;
  this.ff_str = ff_str == null ? "" : ff_str;

  this.pnl_pct = ((ltp - buyPrice) / buyPrice) * 100;
  this.isPnlPositive = ltp > buyPrice;
  this.invested = buyPrice * qty;
  this.isDma50Positive = ltp > dma50;
  this.isDma200Positive = ltp > dma200;
  this.isDist50Positive = this.distTo50 > 0;

  this.comments = comments == null ? "" : comments;
  this.announcements = announcements == null ? "" : announcements;
  this.links = links;
}

// Optional helper on prototype to compute 52W range %
HoldingCard.prototype.getRangePercent = function () {
  const span = this.high52W - this.low52W;
  if (span <= 0) return "0.0";
  const pct = ((this.ltp - this.low52W) / span) * 100;
  return Math.max(0, Math.min(100, pct)).toFixed(1);
};

function createStockCard(stock) {
  const pnlClass = stock.isPnlPositive ? "text-success" : "text-danger";
  const dma50Class = stock.isDma50Positive ? "text-success" : "text-danger";
  const dma200Class = stock.isDma200Positive ? "text-success" : "text-danger";
  const dist50Class = stock.isDist50Positive ? "text-success" : "text-danger";

  const rangePercent =
    typeof stock.getRangePercent === "function"
      ? stock.getRangePercent()
      : "0.0";

  return `
    <article class="stock-card">

      <div class="card-col-info">
        <h2 class="stock-symbol">${stock.symbol}</h2>
        <p class="stat-line">
          <strong>Qty:</strong> ${stock.qty.toFixed(1)} &nbsp;|&nbsp;
          <strong>PnL:</strong> <span class="${pnlClass}">${stock.pnl_pct.toFixed(1) + "%"}</span>
        </p>
        <p class="stat-line"><strong>Buy Price:</strong> ${stock.buyPrice.toFixed(1)}</p>
        <p class="stat-line"><strong>Invested:</strong> ${stock.invested.toFixed(0)}</p>
        <p class="stat-sub">${stock.ff_str}</p>
      </div>


      <div class="card-col-notes">
        <h3 class="col-heading">Comments</h3>
        <div class="note-box">${stock.comments}</div>
      </div>


      <div class="card-col-notes">
        <h3 class="col-heading">Announcements</h3>
        <div class="note-box">${stock.announcements}</div>
      </div>



      <div class="card-col-market">
        <div class="market-top-row">
          <span class="ltp-text">LTP: ₹${stock.ltp.toFixed(2)}</span>
          <button class="btn-card">Gemini</button>
        </div>

        <div class="market-mid-row">
          <div class="ma-stats">
            <p class="stat-line">
              <strong>50D:</strong> <span class="${dma50Class}">${Number(stock.dma50).toFixed(0)}</span> &nbsp;|&nbsp;
              <strong>200D:</strong> <span class="${dma200Class}">${Number(stock.dma200).toFixed(0)}</span>
            </p>
            <p class="stat-line">
              <strong>Dist to 50:</strong> <span class="${dist50Class}">${stock.distTo50.toFixed(1) + "%"}</span>
            </p>
          </div>
          <button class="btn-card">
            <span>🔗 Links</span>
            <span class="chevron">⌄</span>
          </button>
        </div>

        <div class="range-wrapper">
          <span class="range-label">52W Range: ${Number(stock.low52W).toFixed(1)} - ${Number(stock.high52W).toFixed(1)}</span>
          <div class="range-track">
            <div class="range-fill" style="width: ${rangePercent}%"></div>
          </div>
        </div>
      </div>
    </article>
  `;
}

function appendCards(cards, card_id) {
  const container = document.getElementById(card_id);
  if (!container) return;
  const list = Array.isArray(cards) ? cards : [cards];
  container.insertAdjacentHTML("beforeend", list.map(createStockCard).join(""));
}
// ---------------------------------------------------------------
// Main Code
// -------------------------------------------------------------

//Fetch all data from holdings table
//3. Fetch all traded tickers from Turso
async function holdings_data() {
  try {
    const response = await fetch(`${BACKEND_URL}/all/holdings_data`);
    if (response.ok) {
      const { hold, top_metrics} = await response.json(); //{"hold":hold, "top_metrics" : [invested,currentVal]}

      addCards(hold);
      add_top_metrics_labels(top_metrics, "", ""); //For time being, labels under FF_refresh, Mkt_refresh tabs empty
      // console.log(top_metrics);
      // console.log(cats);
    }
  } catch (error) {
    console.error("Failed to load Holdings data:", error);
  }
}
function addCards(tick_list) {
  let no_FF = 0;
  let no_nFF = 0;
  let no_MF = 0;
  let inv_FF = 0;
  let inv_nFF = 0;
  let inv_MF = 0;

  for (const row of tick_list) {
    let cats = row[13];
    let new_card = new HoldingCard({
      symbol: row[0],
      qty: row[1],
      buyPrice: row[2],
      ltp: row[3],
      dma50: row[4],
      dma200: row[5],
      high52W: row[6],
      low52W: row[7],
      ff_str: row[10],
      comments: row[11],
      announcements: row[12],
    });
    if (cats == "EQ_FF") {
      appendCards(new_card, "cards-list_FF");
      no_FF += 1;
      inv_FF += row[2] * row[1];
    } else if (cats == "MF_ETF") {
      appendCards(new_card, "cards-list_MF");
      no_MF += 1;
      inv_MF += row[2] * row[1];
    } else {
      appendCards(new_card, "cards-list_nFF");
      no_nFF += 1;
      inv_nFF += row[2] * row[1];
    }
  }
  let invested = inv_FF + inv_MF + inv_nFF;
  document.getElementById("FF_head").innerHTML =
    `Expand for FF, ${no_FF} Invested: Rs ${(inv_FF / 1e5).toFixed(2)} Lakhs --> ${(100*inv_FF/invested).toFixed(0)}%`;
  document.getElementById("nFF_head").innerHTML =
    `Expand for non-FF, ${no_nFF} Invested: Rs ${(inv_nFF / 1e5).toFixed(2)} Lakhs  --> ${(100*inv_nFF/invested).toFixed(0)}%`;
  document.getElementById("MF_head").innerHTML =
    `Expand for MF_ETF, ${no_MF} Invested: Rs ${(inv_MF / 1e5).toFixed(2)} Lakhs  --> ${(100*inv_MF/invested).toFixed(0)}%`;
}

function add_top_metrics_labels(metrics, mkt, ff) {
  const pnl = (metrics[1] - metrics[0]).toFixed(0);
  const pnl_percent =
    (((metrics[1] - metrics[0]) / metrics[0]) * 100).toFixed(1) + "%";
  document.getElementById("hold_invested").innerHTML =
    `${metrics[0].toFixed(0)}`;
  document.getElementById("hold_currentVal").innerHTML =
    `${metrics[1].toFixed(0)}`;
  document.getElementById("hold_PnL").innerHTML = pnl;
  document.getElementById("hold_PnL_percent").innerHTML = pnl_percent;
  document.getElementById("mkt_stamp").innerHTML = mkt[1];
  document.getElementById("FF_stamp").innerHTML = ff[1];
}

holdings_data();
