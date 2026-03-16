import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import './App.css';

/** 將後端欄位轉成前端可顯示的型別（Firestore Timestamp → 字串等） */
function normalizeDocData(raw) {
  const toStr = (v) => {
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    if (typeof v === 'object' && v !== null && 'seconds' in v && 'nanoseconds' in v) {
      const date = new Date(v.seconds * 1000 + v.nanoseconds / 1e6);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(v);
  };
  const toNum = (v) => {
    if (v == null || v === '') return undefined;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string') return Number(v);
    return undefined;
  };
  return {
    id: raw.id,
    district: toStr(raw.district),
    buildingName: toStr(raw.buildingName),
    address: toStr(raw.address),
    transactionDate: toStr(raw.transactionDate ?? raw.交易日期),
    season: toStr(raw.season),
    totalPrice: toNum(raw.totalPrice),
    unitPrice: toNum(raw.unitPrice),
    buildingArea: toNum(raw.buildingArea),
  };
}

function App() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    district: '',
    minPrice: '',
    maxPrice: '',
    dateFrom: '',
    dateTo: '',
  });
  const [appliedFilter, setAppliedFilter] = useState({
    district: '',
    minPrice: '',
    maxPrice: '',
    dateFrom: '',
    dateTo: '',
  });
  const [viewMode, setViewMode] = useState('list');
  const [filterOpen, setFilterOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const PAGE_SIZE = 20;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const colRef = collection(db, 'realEstate_preSale');
      const snapshot = await getDocs(colRef);
      const data = snapshot.docs.map(doc => normalizeDocData({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.totalPrice ?? 0) - (a.totalPrice ?? 0));
      setProperties(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError(`無法載入資料：${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    const wan = price / 10000;
    if (wan >= 1) {
      return wan.toFixed(0) + ' 萬';
    }
    return price.toLocaleString();
  };

  const formatArea = (area) => {
    if (!area) return '-';
    const ping = (area / 3.30579).toFixed(1);
    return `${ping} 坪`;
  };

  const districts = [...new Set(properties.map(p => p.district))].filter(Boolean).sort();

  const formatSeason = (season) => {
    if (!season) return '';
    const match = season.match(/^(\d+)S(\d)$/);
    if (match) {
      return `${match[1]}年 第${['一', '二', '三', '四'][match[2] - 1]}季`;
    }
    return season;
  };

  const seasons = [...new Set(properties.map(p => p.season))].filter(Boolean).sort();
  const seasonDisplay = seasons.length > 0 ? formatSeason(seasons[0]) : '';

  const filteredProperties = properties.filter(p => {
    if (appliedFilter.district && p.district !== appliedFilter.district) return false;
    const minWan = appliedFilter.minPrice ? parseInt(appliedFilter.minPrice, 10) : null;
    const maxWan = appliedFilter.maxPrice ? parseInt(appliedFilter.maxPrice, 10) : null;
    if (minWan != null && !Number.isNaN(minWan) && (p.totalPrice == null || p.totalPrice < minWan * 10000)) return false;
    if (maxWan != null && !Number.isNaN(maxWan) && (p.totalPrice == null || p.totalPrice > maxWan * 10000)) return false;
    if (appliedFilter.dateFrom && p.transactionDate && p.transactionDate < appliedFilter.dateFrom) return false;
    if (appliedFilter.dateTo && p.transactionDate && p.transactionDate > appliedFilter.dateTo) return false;
    return true;
  });

  const onSearch = () => {
    setAppliedFilter({ ...filter });
    setCurrentPage(1);
  };

  const clearFilter = () => {
    const empty = { district: '', minPrice: '', maxPrice: '', dateFrom: '', dateTo: '' };
    setFilter(empty);
    setAppliedFilter(empty);
    setCurrentPage(1);
  };

  const totalFiltered = filteredProperties.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const displayedProperties = filteredProperties.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (page) => {
    const p = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(p);
  };

  useEffect(() => {
    const totalP = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
    if (currentPage > totalP) setCurrentPage(1);
  }, [totalFiltered, currentPage]);

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <a
            href="/"
            className="header-icon"
            onClick={(e) => {
              e.preventDefault();
              const url = window.location.pathname;
              if (window.location.search) {
                window.history.replaceState(null, '', url);
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            title="返回首頁"
            aria-label="返回首頁"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
          </a>
          <div className="header-text">
            <h1>葉宗鑪的桃園市預售屋實價登錄</h1>
            <p>資料來源：內政部不動產交易實價查詢服務網</p>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="filter-section">
          <div className={`filter-card ${filterOpen ? 'filter-card--open' : ''}`}>
            <button
              type="button"
              className="filter-header filter-header--tappable"
              onClick={() => setFilterOpen(prev => !prev)}
              aria-expanded={filterOpen}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
              </svg>
              <span>篩選條件</span>
              <span className="filter-header-chevron" aria-hidden>
                {filterOpen ? '▼' : '▶'}
              </span>
            </button>
            <div className="filter-controls">
              <div className="filter-controls-basic">
                <div className="filter-group">
                  <label>區域</label>
                  <select 
                    value={filter.district} 
                    onChange={e => setFilter({...filter, district: e.target.value})}
                  >
                    <option value="">全部區域</option>
                    {districts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="filter-group filter-group--date">
                  <label>起始日期（交易日期）</label>
                  <input
                    type="date"
                    value={filter.dateFrom}
                    onChange={e => setFilter({...filter, dateFrom: e.target.value})}
                  />
                </div>
                <div className="filter-group filter-group--date">
                  <label>結束日期（交易日期）</label>
                  <input
                    type="date"
                    value={filter.dateTo}
                    onChange={e => setFilter({...filter, dateTo: e.target.value})}
                  />
                </div>
                <div className="filter-group filter-group--search-btn">
                  <label>&nbsp;</label>
                  <button type="button" className="search-btn" onClick={onSearch} title="依交易日期搜尋">
                    搜尋
                  </button>
                </div>
              </div>

              <div className="filter-actions-row">
                <button
                  type="button"
                  className="filter-advanced-trigger"
                  onClick={() => setAdvancedOpen(prev => !prev)}
                  aria-expanded={advancedOpen}
                >
                  <span>進階搜尋</span>
                  <span className="filter-advanced-chevron">{advancedOpen ? '▲' : '▼'}</span>
                </button>
                <button type="button" className="clear-btn" onClick={clearFilter}>
                  清除
                </button>
              </div>

              {advancedOpen && (
                <div className="filter-controls-advanced">
                  <div className="filter-group">
                    <label>最低價格</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        placeholder="0"
                        value={filter.minPrice}
                        onChange={e => setFilter({...filter, minPrice: e.target.value})}
                      />
                      <span>萬</span>
                    </div>
                  </div>
                  <div className="filter-group">
                    <label>最高價格</label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        placeholder="不限"
                        value={filter.maxPrice}
                        onChange={e => setFilter({...filter, maxPrice: e.target.value})}
                      />
                      <span>萬</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="results-header">
          <div className="results-count">
            <span className="count-number">{filteredProperties.length}</span>
            <span className="count-text">筆結果 / 共 {properties.length} 筆</span>
            {seasonDisplay && <span className="season-tag">{seasonDisplay}</span>}
          </div>
          <div className="view-toggle">
            <button 
              className={viewMode === 'card' ? 'active' : ''} 
              onClick={() => setViewMode('card')}
              title="卡片檢視"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button 
              className={viewMode === 'list' ? 'active' : ''} 
              onClick={() => setViewMode('list')}
              title="列表檢視"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {loading && (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>載入資料中...</p>
          </div>
        )}
        
        {error && (
          <div className="error-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>{error}</p>
            <button onClick={fetchProperties}>重試</button>
          </div>
        )}

        {!loading && !error && filteredProperties.length === 0 && (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <p>沒有符合條件的資料</p>
            <span>試試調整篩選條件</span>
          </div>
        )}

        {!loading && !error && filteredProperties.length > 0 && (
          <>
          <div className={`properties-grid ${viewMode}`}>
            {displayedProperties.map((p, index) => (
              <article 
                key={p.id} 
                className="property-card"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="card-header">
                  <span className="district-tag">{p.district}</span>
                  <span className="date-tag">{p.transactionDate ? `交易日期 ${p.transactionDate}` : ''}</span>
                </div>
                <h3 className="building-name">{p.buildingName || '未提供建案名稱'}</h3>
                <p className="address">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {p.address || '地址未提供'}
                </p>
                <div className="card-stats">
                  <div className="stat">
                    <span className="stat-label">總價</span>
                    <span className="stat-value price">{formatPrice(p.totalPrice)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">單價</span>
                    <span className="stat-value">{formatPrice(p.unitPrice)}/坪</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">面積</span>
                    <span className="stat-value">{formatArea(p.buildingArea)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="pagination">
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage <= 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="上一頁"
            >
              ‹ 上一頁
            </button>
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - currentPage) <= 1) return true;
                  return false;
                })
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('…');
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === '…' ? (
                    <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={`pagination-num ${item === currentPage ? 'active' : ''}`}
                      onClick={() => goToPage(item)}
                      aria-label={`第 ${item} 頁`}
                      aria-current={item === currentPage ? 'page' : undefined}
                    >
                      {item}
                    </button>
                  )
                )}
            </div>
            <button
              type="button"
              className="pagination-btn"
              disabled={currentPage >= totalPages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="下一頁"
            >
              下一頁 ›
            </button>
            <span className="pagination-info">
              第 {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, totalFiltered)} 筆，共 {totalFiltered} 筆
            </span>
          </div>
          </>
        )}
      </main>

      <footer className="footer">
        <p>© 2026 桃園預售屋查詢系統</p>
      </footer>
    </div>
  );
}

export default App;
