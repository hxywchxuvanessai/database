
"use strict";

// =====================================
// 1. 初始化 Leaflet 地圖
// =====================================

const map = L.map("map").setView([23.7, 120.95], 7);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


// =====================================
// 2. 取得 HTML 元素
// =====================================

const form = document.getElementById("search-form");
const keywordInput = document.getElementById("keyword");
const searchButton = document.getElementById("search-btn");
const statusLine = document.getElementById("status");
const resultsContainer = document.getElementById("results");

const markerLayer = L.layerGroup().addTo(map);
const markersByAddress = new Map();

let currentRequestId = 0;
let geoBusy = false;
let lastGeoRequest = 0;


// =====================================
// 3. 基本工具
// =====================================

function setStatus(message, isError = false) {
  statusLine.textContent = message;
  statusLine.classList.toggle("error", isError);
}


function addInfo(container, label, text) {
  const row = document.createElement("div");
  row.className = "row-info";

  const k = document.createElement("span");
  k.className = "k";
  k.textContent = label;

  const v = document.createElement("span");
  v.className = "v";
  v.textContent = text ?? "未提供";

  row.append(k, v);
  container.append(row);
}


function asDate(value) {
  if (!value) return "未提供";

  return /^\d{8}$/.test(value)
    ? `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`
    : value;
}


function fineText(value) {
  if (value == null || String(value).trim() === "") {
    return "未提供";
  }

  const text = String(value).trim();

  return /[元圓]/.test(text) ? text : `${text} 元`;
}


function clearMap() {
  markerLayer.clearLayers();
  markersByAddress.clear();
}


function addPopupLine(popup, text, heading = false) {
  const elem = document.createElement("div");

  elem.className = heading
    ? "popup-line popup-heading"
    : "popup-line";

  elem.textContent = text;

  popup.append(elem);
}


// =====================================
// 4. 顯示地圖標記
// =====================================

function showMarker(record, geocode) {

  const key = record.business_address;

  const latitude = Number(geocode.lat);
  const longitude = Number(geocode.lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 21.5 ||
    latitude > 25.5 ||
    longitude < 119 ||
    longitude > 123.5
  ) {
    throw new Error("地理編碼回傳無效座標");
  }

  const popup = document.createElement("div");

  addPopupLine(popup, record.employer_name, true);

  addPopupLine(
    popup,
    `候選登記地址：${record.business_address}`
  );

  addPopupLine(
    popup,
    `處分日期：${asDate(record.decision_on)}`
  );

  addPopupLine(
    popup,
    `違反法條：${record.violated_law || "未提供"}`
  );

  addPopupLine(
    popup,
    `罰鍰：${fineText(record.fine_amount)}`
  );

  addPopupLine(
    popup,
    `座標配對結果：${geocode.display_name || "未提供"}`
  );

  if (geocode.accuracy === "approximate") {

    addPopupLine(
      popup,
      `座標來源：${geocode.source}`
    );

    addPopupLine(
      popup,
      "⚠ 此為附近參考位置，並非公司門牌精確座標"
    );

  } else {

    addPopupLine(
      popup,
      "座標來源：OpenStreetMap Nominatim"
    );
  }

  addPopupLine(
    popup,
    "⚠ 公司名稱與登記地址均尚待人工核實，非已證實違規地點"
  );

  let marker = markersByAddress.get(key);

  if (marker) {

    marker.setLatLng([latitude, longitude]);
    marker.setPopupContent(popup);

  } else {

    marker = L.marker([
      latitude,
      longitude
    ]).addTo(markerLayer);

    marker.bindPopup(popup, {
      maxWidth: 320
    });

    markersByAddress.set(key, marker);
  }

  // 附近參考座標使用較低縮放，避免誤認為精確門牌
  const zoomLevel =
    geocode.accuracy === "approximate" ? 16 : 17;

  map.setView([latitude, longitude], zoomLevel);

  marker.openPopup();
}


// =====================================
// 5. 地址快取
// =====================================

function cachedGeocode(address) {

  try {

    const value = localStorage.getItem(
      `employerRadar:geo:${address}`
    );

    return value ? JSON.parse(value) : null;

  } catch {

    return null;
  }
}


function saveGeocode(address, value) {

  try {

    localStorage.setItem(
      `employerRadar:geo:${address}`,
      JSON.stringify(value)
    );

  } catch {

    // 儲存失敗不影響本次地圖顯示
  }
}


// =====================================
// 6. 地址標準化
// =====================================

function normalizeAddress(address) {

  return String(address || "")
    .normalize("NFKC")
    .replace(/臺/g, "台")
    .replace(/\s+/g, " ")
    .trim();
}


// =====================================
// 7. 建立多組地址搜尋條件
// =====================================

function buildAddressQueries(address) {

  const normalized = normalizeAddress(address);

  // 第一組：完整地址
  const fullAddress = normalized;

  // 第二組：移除樓層
  const noFloor = normalized.replace(
    /(?:地下)?\s*\d+\s*樓(?:之?\d+)?\s*$/,
    ""
  ).trim();

  // 第三組：移除里、村名稱
  const noNeighborhood = noFloor
    .replace(/[\u4e00-\u9fff]{1,6}(?:里|村)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // 去除重複搜尋條件
  return [...new Set([
    fullAddress,
    noFloor,
    noNeighborhood
  ])]
    .filter(Boolean)
    .map(item => `${item}, 台灣`);
}


// =====================================
// 8. Nominatim 地址搜尋
// =====================================

async function searchNominatim(query) {

  // 公開服務至少間隔 1.1 秒
  const remaining = 1100 - (
    Date.now() - lastGeoRequest
  );

  if (remaining > 0) {

    await new Promise(resolve =>
      setTimeout(resolve, remaining)
    );
  }

  lastGeoRequest = Date.now();

  const url = new URL(
    "https://nominatim.openstreetmap.org/search"
  );

  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "tw");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "zh-TW");

  let response;

  try {

    response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json"
      }
    });

  } catch {

    throw new Error(
      "無法連線到 OpenStreetMap，請確認網路連線"
    );
  }

  if (response.status === 429) {

    throw new Error(
      "地址查找服務請求過於頻繁，請稍等一分鐘再試"
    );
  }

  if (!response.ok) {

    throw new Error(
      `地址查找服務錯誤（HTTP ${response.status}）`
    );
  }

  const found = await response.json();

  if (!Array.isArray(found) || found.length === 0) {
    return null;
  }

  // 只接受有效的台灣座標
  const place = found.find(item => {

    const lat = Number(item.lat);
    const lon = Number(item.lon);

    return (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= 21.5 &&
      lat <= 25.5 &&
      lon >= 119 &&
      lon <= 123.5
    );
  });

  if (!place) {
    return null;
  }

  return {
    lat: place.lat,
    lon: place.lon,
    display_name: place.display_name,
    query_used: query,
    accuracy: "geocoded"
  };
}


// =====================================
// 9. 備援座標
// =====================================

function knownAddressFallback(address) {

  const normalized = normalizeAddress(address)
    .replace(/\s+/g, "");

  // 桃園市桃園區復興路99號附近
  // 使用附近參考座標，不代表公司建物精確位置

  if (
    normalized.includes("桃園市桃園區") &&
    /復興路99號/.test(normalized)
  ) {

    return {

      lat: 24.990741,

      lon: 121.313806,

      display_name:
        "桃園市桃園區復興路99號附近（復興中正路口參考位置）",

      source:
        "復興路99號附近參考座標",

      accuracy:
        "approximate"
    };
  }

  return null;
}


// =====================================
// 10. 地址轉換成經緯度
// =====================================

async function lookupAddress(address) {

  // 先查快取
  const cached = cachedGeocode(address);

  if (cached) {
    return cached;
  }

  // 建立不同的地址搜尋方式
  const queries = buildAddressQueries(address);

  // 依序搜尋 Nominatim
  for (const query of queries) {

    const place = await searchNominatim(query);

    if (place) {

      // 精確度仍須人工核對，但保留服務回傳座標
      saveGeocode(address, place);

      return place;
    }
  }

  // Nominatim 找不到時才使用備援
  const fallback = knownAddressFallback(address);

  if (fallback) {

    // 不儲存備援座標，避免未來無法取得更精確座標

    return fallback;
  }

  throw new Error(
    "找不到此地址的座標，已嘗試完整地址、移除樓層及移除里別，請人工核對地址"
  );
}


// =====================================
// 11. 顯示公司裁罰紀錄
// =====================================

function renderRecord(record) {

  const card = document.createElement("article");
  card.className = "result-card";

  const title = document.createElement("h3");

  title.textContent =
    record.employer_name || "未提供名稱";

  card.append(title);

  addInfo(
    card,
    "處分日期",
    asDate(record.decision_on)
  );

  addInfo(
    card,
    "違反法條",
    record.violated_law || "未提供"
  );

  addInfo(
    card,
    "罰鍰金額",
    fineText(record.fine_amount)
  );

  const matchMessage = document.createElement("div");

  matchMessage.className = "match-info";

  if (
    record.match_status === "candidate" &&
    record.business_address
  ) {

    matchMessage.classList.add("ok");

    matchMessage.textContent =
      `找到同名候選營業登記地址：${record.business_address}（尚未確認是同一雇主）`;

    card.append(matchMessage);

    const locateButton = document.createElement("button");

    locateButton.type = "button";
    locateButton.className = "locate-btn";
    locateButton.textContent = "在地圖定位候選地址";

    const message = document.createElement("p");

    message.className = "locate-msg";

    card.append(locateButton, message);

    locateButton.addEventListener(
      "click",
      async () => {

        if (geoBusy) {

          message.textContent =
            "另一筆地址正在定位，請稍後再試。";

          return;
        }

        geoBusy = true;

        locateButton.disabled = true;

        message.textContent =
          "正在搜尋地址並轉換成座標…";

        const searchAtClick = currentRequestId;

        try {

          const location = await lookupAddress(
            record.business_address
          );

          if (searchAtClick !== currentRequestId) {
            return;
          }

          showMarker(record, location);

          if (location.accuracy === "approximate") {

            message.textContent =
              "已顯示附近參考位置（非公司門牌精確座標），請人工核對。";

          } else {

            message.textContent =
              "已完成地址定位，請核對地圖位置與實際地址是否一致。";
          }

        } catch (error) {

          if (searchAtClick === currentRequestId) {

            message.textContent =
              `定位失敗：${error.message}`;
          }

        } finally {

          locateButton.disabled = false;
          geoBusy = false;
        }
      }
    );

  } else {

    matchMessage.textContent =
      record.match_status === "ambiguous"
        ? "同名營業登記不只一筆，需人工確認；暫不顯示地圖位置。"
        : record.match_status === "candidate"
          ? "找到同名登記資料，但沒有可用的地址。"
          : "尚無可確認的同名營登資料；仍可查看裁罰內容。";

    card.append(matchMessage);
  }

  return card;
}


// =====================================
// 12. 公司搜尋 API
// =====================================

form.addEventListener("submit", async event => {

  event.preventDefault();

  const keyword = keywordInput.value.trim();

  if (!keyword) {
    return;
  }

  const thisRequest = ++currentRequestId;

  resultsContainer.replaceChildren();

  clearMap();

  setStatus("正在查詢 PostgreSQL 裁罰紀錄…");

  searchButton.disabled = true;

  try {

    const response = await fetch(
      `/api/penalties?q=${encodeURIComponent(keyword)}`
    );

    const body = await response.json();

    if (!response.ok) {

      throw new Error(
        body.error || `API 錯誤 ${response.status}`
      );
    }

    if (thisRequest !== currentRequestId) {
      return;
    }

    const records = Array.isArray(body.records)
      ? body.records
      : [];

    if (!records.length) {

      setStatus(
        "查無裁罰紀錄；你可以嘗試公司名稱中的關鍵字。"
      );

      return;
    }

    records.forEach(item => {

      resultsContainer.append(
        renderRecord(item)
      );
    });

    setStatus(
      `找到 ${records.length} 筆結果（最多顯示 20 筆）；可點選具候選地址的紀錄定位。`
    );

  } catch (error) {

    if (thisRequest !== currentRequestId) {
      return;
    }

    setStatus(
      `查詢失敗：${error.message}。請確認 C++ 後端及 PostgreSQL 已啟動。`,
      true
    );

  } finally {

    if (thisRequest === currentRequestId) {

      searchButton.disabled = false;
    }
  }
});


// =====================================
// 13. 地圖回到台灣全景
// =====================================

document.getElementById("reset-map").addEventListener(
  "click",
  () => {

    map.setView([23.7, 120.95], 7);

  }
);
