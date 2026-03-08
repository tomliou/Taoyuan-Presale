import { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
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

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'realEstate_preSale'),
        orderBy('totalPrice', 'desc'),
        limit(100)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProperties(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError('無法載入資料，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    if (price >= 10000) {
      return (price / 10000).toFixed(0) + ' 萬';
    }
    return price.toLocaleString();
  };

  const formatArea = (area) => {
    if (!area) return '-';
    const ping = (area / 3.30579).toFixed(2);
    return `${ping} 坪`;
  };

  const districts = [...new Set(properties.map(p => p.district))].filter(Boolean).sort();

  const filteredProperties = properties.filter(p => {
    if (filter.district && p.district !== filter.district) return false;
    if (filter.minPrice && p.totalPrice < parseInt(filter.minPrice) * 10000) return false;
    if (filter.maxPrice && p.totalPrice > parseInt(filter.maxPrice) * 10000) return false;
    return true;
  });

  return (
    <div className="app">
      <header className="header">
        <h1>🏠 桃園市預售屋實價登錄</h1>
        <p>資料來源：內政部不動產交易實價查詢服務網</p>
      </header>

      <div className="filters">
        <select 
          value={filter.district} 
          onChange={e => setFilter({...filter, district: e.target.value})}
        >
          <option value="">全部區域</option>
          {districts.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <input
          type="number"
          placeholder="最低價格（萬）"
          value={filter.minPrice}
          onChange={e => setFilter({...filter, minPrice: e.target.value})}
        />

        <input
          type="number"
          placeholder="最高價格（萬）"
          value={filter.maxPrice}
          onChange={e => setFilter({...filter, maxPrice: e.target.value})}
        />

        <button onClick={() => setFilter({ district: '', minPrice: '', maxPrice: '' })}>
          清除篩選
        </button>
      </div>

      <div className="stats">
        顯示 {filteredProperties.length} / {properties.length} 筆資料
      </div>

      {loading && <div className="loading">載入中...</div>}
      
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>區域</th>
                <th>建案名稱</th>
                <th>地址</th>
                <th>總價</th>
                <th>單價</th>
                <th>建物面積</th>
                <th>交易日期</th>
              </tr>
            </thead>
            <tbody>
              {filteredProperties.map(p => (
                <tr key={p.id}>
                  <td>{p.district}</td>
                  <td className="building-name">{p.buildingName}</td>
                  <td className="address">{p.address}</td>
                  <td className="price">{formatPrice(p.totalPrice)}</td>
                  <td className="unit-price">{formatPrice(p.unitPrice)}/坪</td>
                  <td>{formatArea(p.buildingArea)}</td>
                  <td>{p.transactionDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && filteredProperties.length === 0 && (
        <div className="no-data">沒有符合條件的資料</div>
      )}

      <footer className="footer">
        <p>© 2026 桃園預售屋查詢系統</p>
      </footer>
    </div>
  );
}

export default App;
