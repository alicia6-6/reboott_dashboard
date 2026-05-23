import { useState, useEffect } from 'react';

type ShipmentStatus = '선적' | '운항중' | '도착' | '통관 완료';

interface Shipment {
  id: string;        
  shipper: string;   
  origin: string;    
  destination: string; 
  status: ShipmentStatus;
  eta: string;       
}

interface InAppNotification {
  id: string;
  bl_id: string;
  message: string;
  created_at: string;
}

const BACKEND_URL = import.meta.env.DEV 
  ? 'http://127.0.0.1:8000' 
  : 'https://reboott-backend.onrender.com';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [shipperName, setShipperName] = useState<string | null>(localStorage.getItem('shipperName'));

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);

  // 새 화물 등록용 폼 상태
  const [newId, setNewId] = useState('');
  const [newShipper, setNewShipper] = useState('삼성전자');
  const [newOrigin, setNewOrigin] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newStatus, setNewStatus] = useState<ShipmentStatus>('선적');
  const [newEta, setNewEta] = useState('');

  // API: 화물 조회 (권한별 필터 주입)
  const fetchShipments = async (currentRole: string, currentShipper: string | null) => {
    try {
      setLoading(true);
      let url = `${BACKEND_URL}/api/shipments`;
      // 화주일 경우 자사 데이터만 가져오도록 백엔드 안전 가드 요청
      if (currentRole === 'shipper' && currentShipper) {
        url += `?shipper_filter=${encodeURIComponent(currentShipper)}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('서버 데이터 조회 실패');
      const data = await response.json();
      setShipments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // API: 인앱 웹 알림 내역 가져오기
  const fetchNotifications = async (currentShipper: string | null) => {
    if (!currentShipper) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/notifications/${encodeURIComponent(currentShipper)}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || '인증 실패');
      }

      const result = await response.json();
      localStorage.setItem('token', result.token);
      localStorage.setItem('role', result.role);
      if (result.shipper_name) localStorage.setItem('shipperName', result.shipper_name);

      setToken(result.token);
      setRole(result.role);
      setShipperName(result.shipper_name || null);

      fetchShipments(result.role, result.shipper_name);
      if (result.role === 'shipper') fetchNotifications(result.shipper_name);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setShipperName(null);
    setShipments([]);
    setNotifications([]);
    setShowNotiDropdown(false);
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newOrigin || !newDestination || !newEta) {
      alert('모든 필드를 입력해 주세요.');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: newId, shipper: newShipper, origin: newOrigin,
          destination: newDestination, status: newStatus, eta: newEta
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || '생성 실패');
      }

      const addedItem = await response.json();
      setShipments(prev => [...prev, addedItem]);
      
      setNewId('');
      setNewOrigin('');
      setNewDestination('');
      setNewStatus('선적');
      setNewEta('');
      alert('📦 DB 레코드가 영구적으로 정상 추가되었습니다.');
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUpdateShipment = async (id: string, updatedStatus: ShipmentStatus, updatedEta: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/shipments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: updatedStatus, eta: updatedEta }),
      });

      if (!response.ok) throw new Error('업데이트 실패');
      
      const updatedItem = await response.json();
      setShipments(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (error) {
      alert('데이터 수정 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteShipment = async (id: string) => {
    if (!confirm(`B/L 번호 ${id} 화물을 영구 삭제하시겠습니까?`)) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/shipments/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('삭제 실패');
      setShipments(prev => prev.filter(item => item.id !== id));
      alert('영구 파기되었습니다.');
    } catch (error) {
      alert('삭제 중 에러가 발생했습니다.');
    }
  };

  useEffect(() => {
    if (token && role) {
      fetchShipments(role, shipperName);
      if (role === 'shipper') fetchNotifications(shipperName);
    }
  }, [token, role, shipperName]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Forwarding Visibility MVP</h2>
          <p className="text-xs text-gray-500 text-center mb-6">로그인 가드 (어드민 / 화주사 분리 관제)</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">아이디</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin, samsung, hyundai" className="w-full border rounded-lg p-2.5 text-sm bg-white text-gray-900" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">비밀번호</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="password123" className="w-full border rounded-lg p-2.5 text-sm bg-white text-gray-900" required />
            </div>
            {authError && <p className="text-xs text-red-600 font-medium">{authError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors">보안 엔트리 로그인</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="mb-8 flex flex-col justify-between items-start sm:flex-row sm:items-center border-b pb-4 relative">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forwarding Visibility Dashboard <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">MVP v1.2</span></h1>
          <p className="text-sm text-gray-500 mt-1">인증 권한: <span className="font-semibold text-gray-800">{role === 'admin' ? '🏢 포워더 마스터 관리자' : `📦 관제 배정 화주 [${shipperName}]`}</span></p>
        </div>
        
        <div className="flex items-center space-x-4 mt-4 sm:mt-0">
          {/* 🔔 역제안했던 웹 인앱 알림창 모듈 UI 탑재 */}
          {role === 'shipper' && (
            <div className="relative">
              <button onClick={() => setShowNotiDropdown(!showNotiDropdown)} className="relative p-2 bg-white border rounded-full hover:bg-gray-100 transition shadow-sm text-gray-700">
                🔔 {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{notifications.length}</span>}
              </button>
              {showNotiDropdown && (
                <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-lg p-4 z-50 max-h-60 overflow-y-auto">
                  <h4 className="font-bold text-xs text-gray-800 border-b pb-2 mb-2">🔔 실시간 포워딩 인앱 변동 알림</h4>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">새로운 스케줄 변동 사항이 없습니다.</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map(n => (
                        <div key={n.id} className="text-xs border-b pb-2 text-gray-700">
                          <p className="font-medium text-gray-900">{n.message}</p>
                          <span className="text-[10px] text-gray-400">{new Date(n.created_at).toLocaleString('ko-KR')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <button onClick={handleLogout} className="text-xs bg-white border text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-100 transition shadow-sm">안전 로그아웃</button>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-12"><p className="text-gray-500 text-sm animate-pulse">원격 백엔드 데이터베이스 동기화 동적 로딩 중...</p></div>
      ) : (
        <>
          {role === 'shipper' && (
            <main className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">🔒 데이터 보안 격리 활성화: <strong>[{shipperName}]</strong>의 화물 데이터만 클라이언트 브라우저 단에 인가 노출됩니다.</p>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {shipments.map(shipment => (
                  <div key={shipment.id} className="bg-white border rounded-xl shadow-sm p-5 hover:border-blue-300 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-xs font-semibold text-gray-400">B/L No. {shipment.id}</span>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${shipment.status === '운항중' ? 'bg-blue-100 text-blue-800' : shipment.status === '선적' ? 'bg-yellow-100 text-yellow-800' : shipment.status === '도착' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>{shipment.status}</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b pb-2"><span className="text-sm font-bold text-gray-800">{shipment.origin}</span><span className="text-xs text-gray-400 self-center">➔</span><span className="text-sm font-bold text-gray-800">{shipment.destination}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-500">도착 예정일 (ETA)</span><span className="font-semibold text-gray-900">{shipment.eta}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </main>
          )}

          {role === 'admin' && (
            <main className="space-y-8">
              <section className="bg-white border rounded-xl shadow-sm p-5">
                <h3 className="font-bold text-gray-800 mb-3 text-sm">➕ 신규 포워딩 화물 마스터 등록 (DB 생성)</h3>
                <form onSubmit={handleCreateShipment} className="grid gap-4 md:grid-cols-3 lg:grid-cols-7 items-end">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">B/L 번호</label>
                    <input type="text" value={newId} onChange={e => setNewId(e.target.value)} placeholder="BL-2026-XXX" className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">배정 화주사</label>
                    <select value={newShipper} onChange={e => setNewShipper(e.target.value)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900">
                      <option value="삼성전자">삼성전자</option>
                      <option value="현대모비스">현대모비스</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">출발지 (Origin)</label>
                    <input type="text" value={newOrigin} onChange={e => setNewOrigin(e.target.value)} placeholder="예: 부산 (PUS)" className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">목적지 (Destination)</label>
                    <input type="text" value={newDestination} onChange={e => setNewDestination(e.target.value)} placeholder="예: 뉴욕 (JFK)" className="w-full border rounded p-1.5 text-xs bg-white text-gray-900" required />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">초기 상태</label>
                    <select value={newStatus} onChange={e => setNewStatus(e.target.value as ShipmentStatus)} className="w-full border rounded p-1.5 text-xs bg-white text-gray-900">
                      <option value="선적">선적</option>
                      <option value="운항중">운항중</option>
                      <option value="도착">도착</option>
                      <option value="통관 완료">통관 완료</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">ETA (도착일)</label>
                    <input type="date" value={newEta} onChange={e => setNewEta(e.target.value)} className="w-full border rounded p-1 text-xs bg-white text-gray-900" required />
                  </div>
                  <button type="submit" className="bg-blue-600 text-white text-xs font-semibold py-2 rounded hover:bg-blue-700 transition-colors shadow-sm">DB 영구 저장</button>
                </form>
              </section>

              <section className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <div className="p-5 border-b bg-gray-50">
                  <h2 className="font-bold text-gray-800">전체 포워딩 마스터 제어판</h2>
                  <p className="text-xs text-gray-500 mt-1">실시간 상태 및 ETA 변경 시 화주 전용 인앱 웹 알림 로그가 즉시 자동 적재됩니다.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b text-xs font-semibold text-gray-600">
                        <th className="p-4">B/L 번호</th>
                        <th className="p-4">배정 화주</th>
                        <th className="p-4">구간 정보</th>
                        <th className="p-4">현재 화물 상태 변경</th>
                        <th className="p-4">ETA 도착일 수정</th>
                        <th className="p-4">액션</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm text-gray-700">
                      {shipments.map(shipment => (
                        <tr key={shipment.id} className="hover:bg-gray-50">
                          <td className="p-4 font-mono font-medium text-gray-900">{shipment.id}</td>
                          <td className="p-4 font-semibold">{shipment.shipper}</td>
                          <td className="p-4 text-xs">{shipment.origin} → {shipment.destination}</td>
                          <td className="p-4">
                            <select value={shipment.status} onChange={(e) => handleUpdateShipment(shipment.id, e.target.value as ShipmentStatus, shipment.eta)} className="border rounded p-1 bg-white text-xs text-gray-900">
                              <option value="선적">선적</option>
                              <option value="운항중">운항중</option>
                              <option value="도착">도착</option>
                              <option value="통관 완료">통관 완료</option>
                            </select>
                          </td>
                          <td className="p-4">
                            <input type="date" value={shipment.eta} onChange={(e) => handleUpdateShipment(shipment.id, shipment.status, e.target.value)} className="border rounded p-1 bg-white text-xs text-gray-900" />
                          </td>
                          <td className="p-4">
                            <button onClick={() => handleDeleteShipment(shipment.id)} className="text-xs text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 px-2 py-1 rounded transition-colors">삭제</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          )}
        </>
      )}
    </div>
  );
}