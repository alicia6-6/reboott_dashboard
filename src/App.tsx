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

// 🌐 실배포된 Render 백엔드 주소 허브
const BACKEND_URL = 'https://reboott-backend.onrender.com';

export default function App() {
  // 브라우저 캐시(LocalStorage)에서 기존 인증 상태 복원
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<string | null>(localStorage.getItem('role'));
  const [shipperName, setShipperName] = useState<string | null>(localStorage.getItem('shipperName'));

  // 인풋 및 오류 제어 상태
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // 비즈니스 데이터 및 UI 피드백 상태
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // API 1: 화물 목록 원격 조회
  const fetchShipments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/shipments`);
      if (!response.ok) throw new Error('서버 데이터 수신에 실패했습니다.');
      const data = await response.json();
      setShipments(data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  // API 2: 백엔드 인증 요청 처리
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
        throw new Error(errData.detail || '인증 정보가 올바르지 않습니다.');
      }

      const result = await response.json();
      
      // 기기에 토큰 및 상태 정보 세이브
      localStorage.setItem('token', result.token);
      localStorage.setItem('role', result.role);
      if (result.shipper_name) localStorage.setItem('shipperName', result.shipper_name);

      setToken(result.token);
      setRole(result.role);
      setShipperName(result.shipper_name || null);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  // 정적 로그아웃 처리
  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setShipperName(null);
    setShipments([]);
  };

  // API 3: 운영팀 전용 실시간 상태 패치 수정
  const handleUpdateShipment = async (id: string, newStatus: ShipmentStatus, newEta: string) => {
    try {
      const currentItem = shipments.find(item => item.id === id);
      if (currentItem && currentItem.eta !== newEta) {
        alert(`[알림] ${id} 화물의 도착 예정일이 변경되어 화주에게 알림을 발송합니다.`);
      }

      const response = await fetch(`${BACKEND_URL}/api/shipments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, eta: newEta }),
      });

      if (!response.ok) throw new Error('서버 업데이트 실패');
      
      const updatedItem = await response.json();
      // 가공 완료된 최신 응답 한 줄을 클라이언트 앱 상태에 결합
      setShipments(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (error) {
      alert('데이터 조작 중에 에러가 발생했습니다.');
    }
  };

  // 인증 성공 트리거 시에만 API 로딩 ( initState 대용 )
  useEffect(() => {
    if (token) {
      fetchShipments();
    }
  }, [token]);

  // -----------------------------------------------------------------
  // [보호 분기 1] 토큰이 유실되었거나 인증되지 않은 방문객에게 노출할 로그인 가드 뷰
  // -----------------------------------------------------------------
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md p-8 border">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Forwarding Visibility MVP</h2>
          <p className="text-xs text-gray-500 text-center mb-6">로그인 후 실시간 물류 가시성 플랫폼을 이용하세요.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">아이디</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="shipper 또는 admin"
                className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 text-gray-900" 
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">비밀번호</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="password123"
                className="w-full border rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500 text-gray-900" 
                required
              />
            </div>

            {authError && <p className="text-xs text-red-600 font-medium">{authError}</p>}

            <button type="submit" className="w-full bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              보안 로그인
            </button>
          </form>
          
          <div className="mt-6 bg-gray-50 p-3 rounded-lg border text-[11px] text-gray-500 space-y-1">
            <p>💡 <strong>화주 테스트 계정:</strong> shipper / password123</p>
            <p>💡 <strong>운영팀 테스트 계정:</strong> admin / password123</p>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // [보호 분기 2] 대시보드 메인 워크스페이스 라이브 인스턴스
  // -----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="mb-8 flex flex-col justify-between items-start sm:flex-row sm:items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forwarding Visibility Dashboard <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">MVP</span></h1>
          <p className="text-sm text-gray-500 mt-1">
            인증 권한 등급: <span className="font-semibold text-gray-800">{role === 'admin' ? '🏢 포워더 통합 운영팀 계정' : `📦 배정 화주 명 [${shipperName}]`}</span>
          </p>
        </div>
        
        <button 
          onClick={handleLogout}
          className="mt-4 sm:mt-0 text-xs bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors shadow-sm"
        >
          안전 로그아웃
        </button>
      </header>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-500 mt-2 text-sm">Render 원격 클라우드와 통신 동기화 중...</p>
        </div>
      ) : (
        <>
          {/* [RBAC UI 1] 화주용 그리드 레이아웃 */}
          {role === 'shipper' && (
            <main className="space-y-6">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
                <p className="text-sm text-amber-800 font-medium">🔒 데이터 보안 가드 작동 중: 현재 로그인된 <strong>[{shipperName}]</strong>의 선적 도큐먼트만 조회가 인가됩니다.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {shipments
                  .filter(s => s.shipper === shipperName)
                  .map(shipment => (
                    <div key={shipment.id} className="bg-white border rounded-xl shadow-sm p-5 hover:border-blue-300 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-semibold text-gray-400">B/L No. {shipment.id}</span>
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          shipment.status === '운항중' ? 'bg-blue-100 text-blue-800' :
                          shipment.status === '선적' ? 'bg-yellow-100 text-yellow-800' :
                          shipment.status === '도착' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {shipment.status}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-sm font-bold text-gray-800">{shipment.origin}</span>
                          <span className="text-xs text-gray-400 self-center">➔</span>
                          <span className="text-sm font-bold text-gray-800">{shipment.destination}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">도착 예정일 (ETA)</span>
                          <span className="font-semibold text-gray-900">{shipment.eta}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </main>
          )}

          {/* [RBAC UI 2] 물류 본사 운영팀 마스터 테이블 레코드 그리드 */}
          {role === 'admin' && (
            <main className="bg-white border rounded-xl shadow-sm overflow-hidden">
              <div className="p-5 border-b bg-gray-50">
                <h2 className="font-bold text-gray-800">전체 포워딩 화물 마스터 제어판</h2>
                <p className="text-xs text-gray-500 mt-1">부산 본사 운영 담당자용 전체 제어 및 실시간 갱신 모듈</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b text-sm font-semibold text-gray-600">
                      <th className="p-4">B/L 번호</th>
                      <th className="p-4">배정 화주</th>
                      <th className="p-4">구간 정보</th>
                      <th className="p-4">현재 화물 상태</th>
                      <th className="p-4">ETA (도착 예정 타이밍)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm text-gray-700">
                    {shipments.map(shipment => (
                      <tr key={shipment.id} className="hover:bg-gray-50">
                        <td className="p-4 font-mono font-medium text-gray-900">{shipment.id}</td>
                        <td className="p-4 font-semibold">{shipment.shipper}</td>
                        <td className="p-4 text-xs">{shipment.origin} → {shipment.destination}</td>
                        <td className="p-4">
                          <select 
                            value={shipment.status}
                            onChange={(e) => handleUpdateShipment(shipment.id, e.target.value as ShipmentStatus, shipment.eta)}
                            className="border rounded p-1.5 bg-white text-sm focus:ring-2 focus:ring-blue-500 text-gray-900"
                          >
                            <option value="선적">선적</option>
                            <option value="운항중">운항중</option>
                            <option value="도착">도착</option>
                            <option value="통관 완료">통관 완료</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <input 
                            type="date" 
                            value={shipment.eta}
                            onChange={(e) => handleUpdateShipment(shipment.id, shipment.status, e.target.value)}
                            className="border rounded p-1 bg-white text-sm focus:ring-2 focus:ring-blue-500 text-gray-900"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </main>
          )}
        </>
      )}
    </div>
  );
}