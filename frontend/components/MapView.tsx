"use client";
import { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  DirectionsRenderer,
  MarkerF,
  InfoWindowF,
} from "@react-google-maps/api";
import { DispatchResult, Order } from "@/lib/types";

const LIBRARIES: ("places" | "geometry")[] = [];

const DRIVER_COLORS = [
  "#2563EB", // blue
  "#16A34A", // green
  "#9333EA", // purple
  "#EA580C", // orange
  "#EC4899", // pink
  "#0D9488", // teal
];

interface GeocodedOrder extends Order {
  lat: number;
  lng: number;
}

interface Props {
  result: DispatchResult;
}

const MAP_CONTAINER = { width: "100%", height: "520px" };
const DEFAULT_CENTER = { lat: 35.6812, lng: 139.7671 }; // 東京

async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}&language=ja&region=JP`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "OK") {
    return data.results[0].geometry.location;
  }
  return null;
}

export default function MapView({ result }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey, libraries: LIBRARIES });

  const [directionsResults, setDirectionsResults] = useState<
    { directions: google.maps.DirectionsResult; color: string }[]
  >([]);
  const [soloMarkers, setSoloMarkers] = useState<
    { order: GeocodedOrder; color: string; index: number }[]
  >([]);
  const [activeOrder, setActiveOrder] = useState<GeocodedOrder | null>(null);
  const [activeDriverName, setActiveDriverName] = useState<string>("");
  const [activeOrderIndex, setActiveOrderIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [center, setCenter] = useState(DEFAULT_CENTER);

  useEffect(() => {
    if (!isLoaded) return;
    buildRoutes();
  }, [isLoaded, result]);

  const buildRoutes = async () => {
    setLoading(true);
    setDirectionsResults([]);
    setSoloMarkers([]);

    const directionsService = new google.maps.DirectionsService();
    const newDirections: typeof directionsResults = [];
    const newSoloMarkers: typeof soloMarkers = [];
    const allCoords: { lat: number; lng: number }[] = [];

    for (let di = 0; di < result.assignments.length; di++) {
      const item = result.assignments[di];
      if (item.orders.length === 0) continue;
      const color = DRIVER_COLORS[di % DRIVER_COLORS.length];

      // 座標解決（lat/lngがあればそのまま、なければジオコーディング）
      const geocoded: GeocodedOrder[] = [];
      for (const order of item.orders) {
        if (order.lat && order.lng) {
          geocoded.push({ ...order, lat: order.lat, lng: order.lng });
        } else {
          const coord = await geocodeAddress(order.address, apiKey);
          if (coord) geocoded.push({ ...order, ...coord });
        }
      }
      if (geocoded.length === 0) continue;
      geocoded.forEach((o) => allCoords.push({ lat: o.lat, lng: o.lng }));

      if (geocoded.length === 1) {
        // 1件のみの場合はマーカーのみ
        newSoloMarkers.push({ order: geocoded[0], color, index: 1 });
        continue;
      }

      // Directions API でルート取得
      const origin = { lat: geocoded[0].lat, lng: geocoded[0].lng };
      const destination = {
        lat: geocoded[geocoded.length - 1].lat,
        lng: geocoded[geocoded.length - 1].lng,
      };
      const waypoints = geocoded.slice(1, -1).map((o) => ({
        location: new google.maps.LatLng(o.lat, o.lng),
        stopover: true,
      }));

      try {
        const res = await new Promise<google.maps.DirectionsResult>(
          (resolve, reject) => {
            directionsService.route(
              {
                origin,
                destination,
                waypoints,
                optimizeWaypoints: false,
                travelMode: google.maps.TravelMode.DRIVING,
              },
              (result, status) => {
                if (status === "OK" && result) resolve(result);
                else reject(status);
              }
            );
          }
        );
        newDirections.push({ directions: res, color });
      } catch {
        // Directions失敗時はマーカーのみ表示
        geocoded.forEach((o, i) =>
          newSoloMarkers.push({ order: o, color, index: i + 1 })
        );
      }
    }

    // 未割当オーダーのマーカー
    for (const order of result.unassigned_orders) {
      if (order.lat && order.lng) {
        newSoloMarkers.push({
          order: { ...order, lat: order.lat, lng: order.lng },
          color: "#6B7280",
          index: 0,
        });
      }
    }

    // 地図の中心を全座標の平均に設定
    if (allCoords.length > 0) {
      const avgLat = allCoords.reduce((s, c) => s + c.lat, 0) / allCoords.length;
      const avgLng = allCoords.reduce((s, c) => s + c.lng, 0) / allCoords.length;
      setCenter({ lat: avgLat, lng: avgLng });
    }

    setDirectionsResults(newDirections);
    setSoloMarkers(newSoloMarkers);
    setLoading(false);
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-200">
        <div className="text-gray-400 text-sm">地図を読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      {/* 凡例 */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3">
        {result.assignments.map((item, i) =>
          item.orders.length > 0 ? (
            <div key={item.driver_id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-4 h-4 rounded-full border-2 border-white shadow"
                style={{ backgroundColor: DRIVER_COLORS[i % DRIVER_COLORS.length] }}
              />
              <span className="text-xs text-gray-700 font-medium">{item.driver_name}</span>
            </div>
          ) : null
        )}
        {result.unassigned_orders.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded-full bg-gray-400 border-2 border-white shadow" />
            <span className="text-xs text-gray-500">未割当</span>
          </div>
        )}
      </div>

      <GoogleMap
        mapContainerStyle={MAP_CONTAINER}
        center={center}
        zoom={12}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: true }}
      >
        {/* DirectionsRenderer（ルート線＋番号マーカー） */}
        {directionsResults.map(({ directions, color }, i) => (
          <DirectionsRenderer
            key={i}
            directions={directions}
            options={{
              polylineOptions: { strokeColor: color, strokeWeight: 4, strokeOpacity: 0.85 },
              suppressMarkers: true, // マーカーは自前で描画
            }}
          />
        ))}

        {/* 自前マーカー（番号付き） */}
        {directionsResults.map(({ directions, color }, di) => {
          const legs = directions.routes[0].legs;
          const stops: { lat: number; lng: number; label: string }[] = [];
          legs.forEach((leg, i) => {
            if (i === 0)
              stops.push({
                lat: leg.start_location.lat(),
                lng: leg.start_location.lng(),
                label: String(i + 1),
              });
            stops.push({
              lat: leg.end_location.lat(),
              lng: leg.end_location.lng(),
              label: String(i + 2),
            });
          });
          return stops.map((stop, si) => (
            <MarkerF
              key={`${di}-${si}`}
              position={{ lat: stop.lat, lng: stop.lng }}
              label={{
                text: stop.label,
                color: "#fff",
                fontWeight: "bold",
                fontSize: "12px",
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 14,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: 2,
              }}
            />
          ));
        })}

        {/* ソロマーカー（1件配達員・未割当） */}
        {soloMarkers.map(({ order, color, index }, i) => (
          <MarkerF
            key={`solo-${i}`}
            position={{ lat: order.lat, lng: order.lng }}
            label={
              index > 0
                ? { text: String(index), color: "#fff", fontWeight: "bold", fontSize: "12px" }
                : { text: "!", color: "#fff", fontWeight: "bold", fontSize: "12px" }
            }
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            }}
            onClick={() => {
              const driverItem = result.assignments.find((a) =>
                a.orders.some((o) => o.id === order.id)
              );
              setActiveOrder(order);
              setActiveDriverName(driverItem?.driver_name ?? "未割当");
              setActiveOrderIndex(index);
            }}
          />
        ))}

        {/* InfoWindow */}
        {activeOrder && (
          <InfoWindowF
            position={{ lat: activeOrder.lat, lng: activeOrder.lng }}
            onCloseClick={() => setActiveOrder(null)}
          >
            <div className="text-sm min-w-[180px]">
              <div className="font-bold text-gray-800 mb-1">
                {activeOrderIndex > 0 ? `第${activeOrderIndex}便` : "未割当"}
              </div>
              {activeOrder.recipient_name && (
                <div className="text-gray-700">{activeOrder.recipient_name}</div>
              )}
              <div className="text-gray-600 text-xs mt-0.5">{activeOrder.address}</div>
              <div className="text-blue-600 text-xs mt-1 font-medium">
                {activeOrder.time_start}〜{activeOrder.time_end}
              </div>
              <div className="text-gray-500 text-xs mt-0.5">担当：{activeDriverName}</div>
              {activeOrder.notes && (
                <div className="text-gray-400 text-xs mt-0.5">{activeOrder.notes}</div>
              )}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
