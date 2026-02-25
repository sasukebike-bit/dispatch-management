"use client";
import { useEffect, useState, useRef } from "react";
import { getOrders, createOrder, deleteOrder, importOrdersCSV } from "@/lib/api";
import { Order } from "@/lib/types";

const today = () => new Date().toISOString().slice(0, 10);

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00",
];

export default function OrdersPage() {
  const [date, setDate] = useState(today());
  const [orders, setOrders] = useState<Order[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    address: "",
    time_start: "10:00",
    time_end: "12:00",
    notes: "",
  });

  const load = async () => {
    try {
      setOrders(await getOrders(date));
    } catch {
      setError("読み込みに失敗しました");
    }
  };

  useEffect(() => { load(); }, [date]);

  const handleAdd = async () => {
    if (!form.address.trim()) return;
    try {
      await createOrder({ ...form, delivery_date: date });
      setForm({ address: "", time_start: "10:00", time_end: "12:00", notes: "" });
      setShowForm(false);
      await load();
    } catch {
      setError("追加に失敗しました");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("このオーダーを削除しますか？")) return;
    try {
      await deleteOrder(id);
      await load();
    } catch {
      setError("削除に失敗しました");
    }
  };

  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importOrdersCSV(date, file);
      await load();
    } catch {
      setError("CSV取り込みに失敗しました");
    } finally {
      e.target.value = "";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">オーダー管理</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* アクションボタン */}
      <div className="flex gap-3 mb-5">
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + オーダーを追加
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          CSV取り込み
        </button>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
      </div>

      {/* 追加フォーム */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-600 mb-4">新規オーダー</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">配達先住所 *</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="例：東京都渋谷区○○1-2-3"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">希望時間帯（開始）</label>
              <select
                value={form.time_start}
                onChange={(e) => setForm({ ...form, time_start: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">希望時間帯（終了）</label>
              <select
                value={form.time_end}
                onChange={(e) => setForm({ ...form, time_end: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">備考</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="任意"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAdd}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              追加
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* CSV形式ヒント */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
        CSVフォーマット（1行目はヘッダー）: <code>address,time_start,time_end,notes</code>
      </div>

      {/* オーダー一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {orders.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">この日のオーダーはありません</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">No</th>
                <th className="px-4 py-3 text-left">時間帯</th>
                <th className="px-4 py-3 text-left">配達先住所</th>
                <th className="px-4 py-3 text-left">備考</th>
                <th className="px-4 py-3 text-left">担当</th>
                <th className="px-4 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o, i) => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-gray-700">
                    {o.time_start}〜{o.time_end}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{o.address}</td>
                  <td className="px-4 py-3 text-gray-500">{o.notes || "—"}</td>
                  <td className="px-4 py-3">
                    {o.driver_name ? (
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                        {o.driver_name}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">未割当</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(o.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
