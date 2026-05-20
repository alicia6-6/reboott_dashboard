import React, { useState } from 'react';

type ShipmentStatus = '선적' | '운항중' | '도착' | '통관 완료';

interface Shipment {
  id: string;        
  shipper: string;   
  origin: string;    
  destination: string; 
  status: ShipmentStatus;
  eta: string;       
}

const MOCK_SHIPMENTS: Shipment[] = [
  { id: 'BL-2026-001', shipper: '삼성전자', origin: '부산 (PUS)', destination: '로스앤젤레스 (LAX)', status: '운항중', eta: '2026-05-25' },
  { id: 'BL-2026-002', shipper: '삼성전자', origin: '상하이 (SHA)', destination: '부산 (PUS)', status: '선적', eta: '2026-05-28' },
  { id: 'BL-2026-003', shipper: '현대모비스', origin: '부산 (PUS)', destination: '로테르담 (RTM)', status: '도착', eta: '2026-05-19' },
];

export default function App() {
  const [shipments, setShipments] = useState<Shipment[]>(MOCK_SHIPMENTS);
  const [currentShipper] = useState<string>('삼성전자');
  const [activeTab, setActiveTab] = useState<'shipper' | 'admin'>('shipper');

  const handleUpdateShipment = (id: string, newStatus: ShipmentStatus, newEta: string) => {
    setShipments(prev => 
      prev.map(item => {
        if (item.id === id) {
          if (item.eta !== newEta) {
            alert(`[알림] ${id} 화물의 도착 예정일이 변경되어 화주에게 알림을 발송합니다.`);
          }
          return { ...item, status: newStatus, eta: newEta };
        }
        return item;
      })
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <header className="mb-8 flex flex-col justify-between items-start sm:flex-row sm:items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forwarding Visibility Dashboard <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded">MVP</span></h1>
        </div>
        
        <div className="mt-4 sm:mt-0 bg-gray-200 p-1 rounded-lg border flex space-x-1">
          <button 
            onClick={() => setActiveTab('shipper')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'shipper' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            화주용 화면 ({currentShipper})
          </button>
          <button 
            onClick={() => setActiveTab('admin')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'admin' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            운영팀 화면 (Admin)
          </button>
        </div>
      </header>

      {activeTab === 'shipper' && (
        <main className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-md">
            <p className="text-sm text-amber-800 font-medium">🔒 권한 분리 적용 중: 현재 <strong>[{currentShipper}]</strong>의 화물만 노출됩니다. (타사 데이터 노출 차단)</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shipments
              .filter(s => s.shipper === currentShipper)
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

      {activeTab === 'admin' && (
        <main className="bg-white border rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b bg-gray-50">
            <h2 className="font-bold text-gray-800">전체 화물 상태 관리 (운영팀 전용 메뉴)</h2>
            <p className="text-xs text-gray-500 mt-1">부산 본사 운영팀 6명을 위한 통합 업데이트 그리드</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b text-sm font-semibold text-gray-600">
                  <th className="p-4">B/L 번호</th>
                  <th className="p-4">화주</th>
                  <th className="p-4">구간</th>
                  <th className="p-4">현재 상태</th>
                  <th className="p-4">ETA (도착 예정일)</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm text-gray-700">
                {shipments.map(shipment => (
                  <tr key={shipment.id} className="hover:bg-gray-50">
                    <td className="p-4 font-mono font-medium text-gray-900">{shipment.id}</td>
                    <td className="p-4">{shipment.shipper}</td>
                    <td className="p-4 text-xs font-semibold">{shipment.origin} → {shipment.destination}</td>
                    <td className="p-4">
                      <select 
                        value={shipment.status}
                        onChange={(e) => handleUpdateShipment(shipment.id, e.target.value as ShipmentStatus, shipment.eta)}
                        className="border rounded p-1.5 bg-white text-sm focus:ring-2 focus:ring-blue-500"
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
                        className="border rounded p-1 bg-white text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      )}
    </div>
  );
}