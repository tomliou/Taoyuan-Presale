import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';
import './App.css';

function App() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    district: '',
    minPrice: '',
    maxPrice: '',
  });
  const [viewMode, setViewMode] = useState('list');

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const colRef = collection(db, 'realEstate_preSale');
      const snapshot = await getDocs(colRef);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      data.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
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
    if (filter.district && p.district !== filter.district) return false;
    if (filter.minPrice && p.totalPrice < parseInt(filter.minPrice) * 10000) return false;
    if (filter.maxPrice && p.totalPrice > parseInt(filter.maxPrice) * 10000) return false;
    return true;
  });

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <polyline points="9,22 9,12 15,12 15,22" />
            </svg>
          </div>
          <div className="header-text">
            <h1>葉宗鑪的桃園市預售屋實價登錄</h1>
            <p>資料來源：內政部不動產交易實價查詢服務網</p>
          </div>
        </div>
      </header>

      <main className="main">
        <div className="filter-section">
          <div className="filter-card">
            <div className="filter-header">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
              </svg>
              <span>篩選條件</span>
            </div>
            <div className="filter-controls">
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

              <button 
                className="clear-btn"
                onClick={() => setFilter({ district: '', minPrice: '', maxPrice: '' })}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
                清除
              </button>
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
          <div className={`properties-grid ${viewMode}`}>
            {filteredProperties.map((p, index) => (
              <article 
                key={p.id} 
                className="property-card"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="card-header">
                  <span className="district-tag">{p.district}</span>
                  <span className="date-tag">{p.transactionDate}</span>
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
        )}
      </main>

      <footer className="footer">
        <p>© 2026 桃園預售屋查詢系統</p>
      </footer>
    </div>
  );
}

export default App;
