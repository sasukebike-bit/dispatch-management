"use client";
import { useEffect, useState } from "react";
import { runDispatch, getDispatchResult, manualAssign, getDrivers, getPdfUrl } from "@/lib/api";
import { DispatchResult, Driver, Order } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

const COLORS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-green-100 border-green-300 text-green-800",
  "bg-purple-100 border-purple-300 text-purple-800",
  "bg-orange-100 border-orange-300 text-orange-800",
  "bg-pink-100 border-pink-300 text-pink-800",
  "bg-teal-100 border-teal-300 text-teal-800",
];

export default function DispatchPage() {
  const [date, setDate] = useState(today());
  const [result, setResult] = useState<DispatchResult | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);

  // 手動調整用: order_id -> driver_id のマップ
  const [manualMap, setManualMap] = useState<Record<number, number>>({});

  const loadResult = async () => {
    try {
      const r = await getDispatchResult(date);
      setResult(r);
      // 現在の割り当てをmanualMapに反映
      const map: Record<number, number> = {};
      r.assignments.forEach((a) => {
        a.orders.forEach((o) => { map[o.id] = a.driver_id; });
      });
      setManualMap(map);
    } catch {
      // 未実行の場合は無視
    }
  };

  useEffect(() => {
    getDrivers().then(setDrivers).catch(() => {});
    loadResult();
  }, [date]);

  const handleRun = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await runDispatch(date);
      setResult(r);
      const map: Record<number, number> = {};
      r.assignments.forEach((a) => {
        a.orders.forEach((o) => { map[o.id] = a.driver_id; });
      });
      setManualMap(map);
      setEditMode(false);
    } catch {
      setError("自動配車の実行に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveManual = async () => {
    setLoading(true);
    try {
      const assignments = Object.entries(manualMap).map(([oid, did]) => ({
        order_id: Number(oid),
        driver_id: Number(did),
      }));
      const r = await manualAssign(date, assignments);
      setResult(r);
      setEditMode(false);
    } catch {
      setError("手動調整の保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const allOrders: Order[] = result
    ? [...result.assignments.flatMap((a) => a.orders), ...result.unassigned_orders]
    : [];

  const driverColorMap: Record<number, string> = {};
  drivers.forEach((d, i) => { driverColorMap[d.id] = COLORS[i % COLORS.length]; });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">配車結果</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleRun}
            disabled={loading}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "実行中..." : "自動配車を実行"}
          </button>
          {result && (
            <a
              href={getPdfUrl(date)}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              PDF出力
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {!result ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400 text-sm">
          「自動配車を実行」ボタンを押して配車を開始してください
        </div>
      ) : (
        <>
          {/* サマリー */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">配達員数</div>
              <div className="text-2xl font-bold text-gray-800">{result.assignments.filter(a => a.total_jobs > 0).length}</div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">総オーダー数</div>
              <div className="text-2xl font-bold text-gray-800">
                {result.assignments.reduce((s, a) => s + a.total_jobs, 0)}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">未割当</div>
              <div className={`text-2xl font-bold ${result.unassigned_orders.length > 0 ? "text-red-500" : "text-gray-800"}`}>
                {result.unassigned_orders.length}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">対象日</div>
              <div className="text-lg font-bold text-gray-800">{result.date}</div>
            </div>
          </div>

          {/* 未割当オーダー */}
          {result.unassigned_orders.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
              <h3 className="text-sm font-semibold text-red-700 mb-2">
                未割当オーダー（時間帯の競合により割り当て不可）
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.unassigned_orders.map((o) => (
                  <span key={o.id} className="bg-white border border-red-200 text-red-700 text-xs px-3 py-1 rounded-full">
                    {o.time_start}〜{o.time_end} / {o.address}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 手動調整モード切替 */}
          <div className="flex justify-end mb-4 gap-3">
            {editMode ? (
              <>
                <button
                  onClick={handleSaveManual}
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  保存
                </button>
                <button
                  onClick={() => { setEditMode(false); loadResult(); }}
                  className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditMode(true)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                手動調整
              </button>
            )}
          </div>

          {/* 配達員ごとの配車結果 */}
          <div className="space-y-4">
            {result.assignments.map((item) => {
              const color = driverColorMap[item.driver_id] || COLORS[0];
              return (
                <div key={item.driver_id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`flex items-center justify-between px-5 py-3 border-b border-gray-100`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold px-3 py-1 rounded-full border ${color}`}>
                        {item.driver_name}
                      </span>
                      <span className="text-xs text-gray-500">{item.total_jobs}件</span>
                      <span className="text-xs text-gray-400">{item.total_distance_km} km</span>
                    </div>
                  </div>
                  {item.orders.length === 0 ? (
                    <div className="px-5 py-4 text-sm text-gray-400">割り当てなし</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-500 text-xs">
                        <tr>
                          <th className="px-4 py-2 text-left">順</th>
                          <th className="px-4 py-2 text-left">時間帯</th>
                          <th className="px-4 py-2 text-left">配達先住所</th>
                          <th className="px-4 py-2 text-left">備考</th>
                          {editMode && <th className="px-4 py-2 text-left">担当変更</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {item.orders.map((o, i) => (
                          <tr key={o.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                            <td className="px-4 py-2 font-mono text-gray-700">
                              {o.time_start}〜{o.time_end}
                            </td>
                            <td className="px-4 py-2 text-gray-800">{o.address}</td>
                            <td className="px-4 py-2 text-gray-500">{o.notes || "—"}</td>
                            {editMode && (
                              <td className="px-4 py-2">
                                <select
                                  value={manualMap[o.id] ?? item.driver_id}
                                  onChange={(e) =>
                                    setManualMap({ ...manualMap, [o.id]: Number(e.target.value) })
                                  }
                                  className="border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  {drivers.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                  ))}
                                </select>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
