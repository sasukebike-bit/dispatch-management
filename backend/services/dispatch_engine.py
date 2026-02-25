from __future__ import annotations
"""
自動配車エンジン

優先順位：
  1. 配達時間の考慮（希望時間帯のブッキングなし）
  2. 仕事数の平均化
  3. 距離の平均化
"""
from datetime import date
from models import Order, Driver
from services.distance_service import calculate_distance_km


def time_to_minutes(t: str) -> int:
    """'HH:MM' → 分（0:00 = 0）"""
    h, m = map(int, t.split(":"))
    return h * 60 + m


def has_time_conflict(existing_orders: list[Order], new_order: Order) -> bool:
    """
    new_order を追加したとき時間ブッキングが発生するか判定。
    各オーダーは [time_start, time_end] の時間枠を占有する。
    """
    new_start = time_to_minutes(new_order.time_start)
    new_end = time_to_minutes(new_order.time_end)

    for order in existing_orders:
        existing_start = time_to_minutes(order.time_start)
        existing_end = time_to_minutes(order.time_end)
        # 区間の重なり判定
        if new_start < existing_end and existing_start < new_end:
            return True
    return False


def total_distance(orders: list[Order]) -> float:
    """オーダーリストの総移動距離（km）を計算"""
    if len(orders) <= 1:
        return 0.0
    dist = 0.0
    for i in range(len(orders) - 1):
        dist += calculate_distance_km(
            orders[i].lat, orders[i].lng,
            orders[i + 1].lat, orders[i + 1].lng
        )
    return dist


def run_dispatch(orders: list[Order], drivers: list[Driver]) -> dict:
    """
    自動配車を実行し、配達員ごとの割り当てと未割り当てオーダーを返す。

    Returns:
        {
            "assigned": {driver_id: [Order, ...]},
            "unassigned": [Order, ...]
        }
    """
    if not drivers:
        return {"assigned": {}, "unassigned": orders}

    # 配達員ごとの割り当て初期化
    assigned: dict[int, list[Order]] = {d.id: [] for d in drivers}
    unassigned: list[Order] = []

    # 第1優先：時間帯の早い順にソート
    sorted_orders = sorted(orders, key=lambda o: time_to_minutes(o.time_start))

    for order in sorted_orders:
        # 時間ブッキングなしで割り当て可能な配達員を絞る
        candidates = [
            d for d in drivers
            if not has_time_conflict(assigned[d.id], order)
        ]

        if not candidates:
            unassigned.append(order)
            continue

        # 第2優先：仕事数が少ない順、第3優先：総移動距離が短い順
        best_driver = min(
            candidates,
            key=lambda d: (
                len(assigned[d.id]),
                total_distance(assigned[d.id]) + calculate_distance_km(
                    (assigned[d.id][-1].lat if assigned[d.id] else None),
                    (assigned[d.id][-1].lng if assigned[d.id] else None),
                    order.lat,
                    order.lng
                )
            )
        )

        assigned[best_driver.id].append(order)

    return {"assigned": assigned, "unassigned": unassigned}
