// App.tsx (исправленный - метро одним блоком)
import React, { useState } from 'react';
import { Graph } from './Graph';
import { Moment } from './Moment';
import { EdgeResult } from './Graph';

const graph = new Graph();
const allVertices = graph.getAllVertices();

type DayType = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
const days: DayType[] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayNames: Record<DayType, string> = {
    monday: "Понедельник", tuesday: "Вторник", wednesday: "Среда",
    thursday: "Четверг", friday: "Пятница", saturday: "Суббота", sunday: "Воскресенье"
};

type TabType = "route" | "nearby";

const getSortedVertices = () => {
    const order: Record<string, number> = {
        "dorm": 1,
        "university": 2,
        "bus_stop": 3,
        "train_station": 4,
        "metro_station3": 5
    };
    return [...allVertices].sort((a, b) => {
        const orderDiff = (order[a.type] || 99) - (order[b.type] || 99);
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
    });
};

const sortedVertices = getSortedVertices();

const vertexGroups = {
    dorm: sortedVertices.filter(v => v.type === "dorm"),
    university: sortedVertices.filter(v => v.type === "university"),
    bus_stop: sortedVertices.filter(v => v.type === "bus_stop"),
    train_station: sortedVertices.filter(v => v.type === "train_station"),
    metro: sortedVertices.filter(v => v.type === "metro_station3")
};

const metroLineStations: string[] = [
    "Метро Крылатское",
    "Метро Молодёжная",
    "Метро Кунцевская",
    "Метро Славянский бульвар",
    "Метро Парк Победы",
    "Метро Киевская",
    "Метро Смоленская",
    "Метро Арбатская",
    "Метро Площадь Революции",
    "Метро Курская"
];

const metroTravelTimes: Record<string, number> = {
    "Метро Крылатское→Метро Молодёжная": 3,
    "Метро Молодёжная→Метро Кунцевская": 3,
    "Метро Кунцевская→Метро Славянский бульвар": 2,
    "Метро Славянский бульвар→Метро Парк Победы": 4,
    "Метро Парк Победы→Метро Киевская": 4,
    "Метро Киевская→Метро Смоленская": 2,
    "Метро Смоленская→Метро Арбатская": 3,
    "Метро Арбатская→Метро Площадь Революции": 2,
    "Метро Площадь Революции→Метро Курская": 3
};

function App() {
    const [activeTab, setActiveTab] = useState<TabType>("route");
    const [startId, setStartId] = useState("dorm1");
    const [endId, setEndId] = useState("miem_uni");
    const [useCurrentTime, setUseCurrentTime] = useState(true);
    const [selectedDay, setSelectedDay] = useState<DayType>("monday");
    const [hours, setHours] = useState(8);
    const [minutes, setMinutes] = useState(0);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [nearbyFromStop, setNearbyFromStop] = useState("gb_stop");
    const [nearbyToStop, setNearbyToStop] = useState("");
    const [nearbyResults, setNearbyResults] = useState<any[]>([]);
    const [nearbyLoading, setNearbyLoading] = useState(false);

    const formatTime = (moment: Moment): string => {
        return `${moment.hoursOfDay.toString().padStart(2, '0')}:${(moment.minuteOfDay % 60).toString().padStart(2, '0')}`;
    };

    const getDayName = (moment: Moment): string => {
        const days = ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"];
        return days[moment.dayOfWeek];
    };

    const handleFindRoute = () => {
        setLoading(true);
        setError(null);
        
        try {
            let startTime: Moment;
            if (useCurrentTime) {
                startTime = Moment.now();
            } else {
                const now = new Date();
                const currentDayOfWeek = now.getDay();
                let targetDayNumber: number;
                switch (selectedDay) {
                    case "monday": targetDayNumber = 1; break;
                    case "tuesday": targetDayNumber = 2; break;
                    case "wednesday": targetDayNumber = 3; break;
                    case "thursday": targetDayNumber = 4; break;
                    case "friday": targetDayNumber = 5; break;
                    case "saturday": targetDayNumber = 6; break;
                    case "sunday": targetDayNumber = 0; break;
                }
                let daysOffset = targetDayNumber - currentDayOfWeek;
                if (daysOffset < 0) daysOffset += 7;
                const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysOffset, hours, minutes);
                const minutesSinceEpoch = Math.floor(targetDate.getTime() / 60000);
                const offset = new Date().getTimezoneOffset();
                startTime = Moment.fromMinutes(minutesSinceEpoch - offset);
            }
            
            const pathResult = graph.findShortestPath(startId, endId, startTime);
            if (!pathResult) {
                setError("Маршрут не найден");
                setResult(null);
            } else {
                setResult(pathResult);
            }
        } catch (err) {
            setError("Ошибка: " + (err as Error).message);
            setResult(null);
        }
        setLoading(false);
    };

    const handleNearbySearch = () => {
        if (!nearbyToStop) {
            setNearbyResults([]);
            return;
        }
        
        setNearbyLoading(true);
        setNearbyResults([]);
        
        try {
            const now = Moment.now();
            const fromStop = graph.getVertex(nearbyFromStop);
            if (!fromStop) {
                setNearbyLoading(false);
                return;
            }
            
            const results: any[] = [];
            for (const edge of fromStop.getEdges()) {
                if (edge.transportType === "walk") continue;
                if (edge.transportType?.toString().startsWith("metro_")) continue;
                
                if (edge.toId === nearbyToStop && 'getTripInfo' in edge && edge.getTripInfo) {
                    let testTime = now;
                    for (let i = 0; i < 10; i++) {
                        const tripInfo = edge.getTripInfo(testTime);
                        if (tripInfo && tripInfo.wait !== Infinity) {
                            const departureTime = testTime.addMinutes(tripInfo.wait);
                            const exists = results.some(r => 
                                Math.abs(r.departureTime.minuteOfDay - departureTime.minuteOfDay) < 5
                            );
                            if (!exists) {
                                results.push({
                                    transportName: edge.transportName,
                                    waitMinutes: tripInfo.wait,
                                    travelMinutes: tripInfo.travel,
                                    departureTime: departureTime,
                                    arrivalTime: departureTime.addMinutes(tripInfo.travel)
                                });
                            }
                            testTime = departureTime.addMinutes(1);
                        } else {
                            testTime = testTime.addMinutes(1440);
                        }
                        if (results.length >= 5) break;
                    }
                }
            }
            results.sort((a, b) => a.waitMinutes - b.waitMinutes);
            setNearbyResults(results.slice(0, 5));
        } catch (err) {
            console.error(err);
        }
        setNearbyLoading(false);
    };

    const getMetroStationsList = (fromStationName: string, toStationName: string): string[] => {
        if (!fromStationName || !toStationName) return [];
        
        const startIndex = metroLineStations.findIndex(s => s === fromStationName);
        const endIndex = metroLineStations.findIndex(s => s === toStationName);
        
        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
            return [];
        }
        
        return metroLineStations.slice(startIndex + 1, endIndex + 1);
    };

    const getTotalMetroTravelTime = (fromStationName: string, toStationName: string): number => {
        if (!fromStationName || !toStationName) return 0;
        
        const startIndex = metroLineStations.findIndex(s => s === fromStationName);
        const endIndex = metroLineStations.findIndex(s => s === toStationName);
        
        if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
            return 0;
        }
        
        let total = 0;
        for (let i = startIndex; i < endIndex; i++) {
            const from = metroLineStations[i];
            const to = metroLineStations[i + 1];
            const travelKey = `${from}→${to}`;
            total += metroTravelTimes[travelKey] || 3;
        }
        return total;
    };

    const renderRoute = () => {
        if (!result) return null;
        
        // Сначала группируем все последовательные метро-рёбра
        const metroGroups: any[] = [];
        let currentGroup: any = null;
        
        for (const er of result.edges) {
            const isMetro = er.edge.transportType?.toString().startsWith("metro_");
            
            if (isMetro) {
                if (!currentGroup) {
                    // Начинаем новую группу метро
                    const fromStation = graph.getVertex(er.edge.fromId)?.name || "";
                    const toStation = graph.getVertex(er.edge.toId)?.name || "";
                    currentGroup = {
                        type: "metro",
                        transportName: er.edge.transportName,
                        fromStation: fromStation,
                        stations: [toStation],
                        waitMinutes: er.waitMinutes,
                        departureTime: er.departureTime,
                        totalTravelMinutes: er.travelMinutes,
                        arrivalTime: er.arrivalTime
                    };
                } else {
                    // Продолжаем группу — добавляем только конечную станцию
                    const toStation = graph.getVertex(er.edge.toId)?.name || "";
                    currentGroup.stations.push(toStation);
                    currentGroup.totalTravelMinutes += er.travelMinutes;
                    currentGroup.arrivalTime = er.arrivalTime;
                }
            } else {
                if (currentGroup) {
                    metroGroups.push(currentGroup);
                    currentGroup = null;
                }
                metroGroups.push({
                    type: "other",
                    edge: er.edge,
                    waitMinutes: er.waitMinutes,
                    travelMinutes: er.travelMinutes,
                    departureTime: er.departureTime,
                    arrivalTime: er.arrivalTime
                });
            }
        }
        if (currentGroup) metroGroups.push(currentGroup);
        
        return (
            <div style={{ marginTop: "24px", padding: "20px", background: "#f0f4e8", borderRadius: "24px" }}>
                <div style={{ textAlign: "center", marginBottom: "20px" }}>
                    <div style={{ fontSize: "36px", fontWeight: "700", color: "#2d5a2c" }}>{result.totalMinutes} мин</div>
                    <div style={{ fontSize: "14px", color: "#6b8c5c", marginTop: "6px" }}>
                        {formatTime(result.startTime)} → {formatTime(result.arrivalTime)} • {getDayName(result.arrivalTime)}
                    </div>
                </div>
                
                {metroGroups.map((seg, idx) => {
                    if (seg.type === "metro") {
                        const stations = seg.stations;
                        const lastStation = stations[stations.length - 1];
                        const stationsCount = stations.length;
                        
                        return (
                            <div key={idx} style={{ marginBottom: "16px", padding: "16px", background: "white", borderRadius: "20px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                                    <span style={{ fontWeight: "600", color: "#2d5a2c" }}>🚇 {seg.transportName}</span>
                                    <span style={{ fontSize: "15px", fontWeight: "600", color: "#6b8c5c" }}>{seg.totalTravelMinutes} мин</span>
                                </div>
                                
                                <div style={{ fontSize: "14px", fontWeight: "500", color: "#3a5a38", marginBottom: "8px" }}>
                                    → {lastStation}
                                </div>
                                
                                {seg.waitMinutes > 0 && (
                                    <div style={{ fontSize: "13px", color: "#c5a83a", marginBottom: "12px", padding: "8px 12px", background: "#fef8e7", borderRadius: "12px" }}>
                                        ⏰ Ожидание {seg.waitMinutes} мин • Отправление в {formatTime(seg.departureTime)}
                                    </div>
                                )}
                                
                                {stationsCount > 0 && (
                                    <details style={{ marginTop: "8px" }}>
                                        <summary style={{ fontSize: "12px", color: "#8ba87a", cursor: "pointer", padding: "6px 0" }}>
                                            📍 Маршрут ({stationsCount} перегонов)
                                        </summary>
                                        <div style={{ marginTop: "10px", paddingLeft: "12px", borderLeft: "2px solid #d4dec8" }}>
                                            {stations.map((station: string, i: number) => (
                                                <div key={i} style={{ fontSize: "13px", padding: "4px 0" }}>
                                                    {i + 1}. {station}
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                )}
                            </div>
                        );
                    } else {
                        const target = graph.getVertex(seg.edge.toId);
                        return (
                            <div key={idx} style={{ marginBottom: "12px", padding: "14px 16px", background: "white", borderRadius: "16px", borderLeft: `4px solid ${seg.edge.transportType === "walk" ? "#8ba87a" : "#c5a83a"}` }}>
                                <div style={{ fontWeight: "500", marginBottom: "6px", color: "#3a5a38" }}>{seg.edge.transportName} → {target?.name || seg.edge.toId}</div>
                                {seg.waitMinutes > 0 && (
                                    <div style={{ fontSize: "13px", color: "#c5a83a", marginBottom: "4px" }}>
                                        ⏰ Ожидание {seg.waitMinutes} мин • Отправление в {formatTime(seg.departureTime)}
                                    </div>
                                )}
                                <div style={{ fontSize: "13px", color: "#6b8c5c" }}>🚶 В пути: {seg.travelMinutes} мин • Прибытие в {formatTime(seg.arrivalTime)}</div>
                            </div>
                        );
                    }
                })}
            </div>
        );
    };

    return (
        <div style={{ 
            minHeight: "100vh", 
            background: "linear-gradient(135deg, #eef2e6 0%, #e6ede0 30%, #dfe8d6 60%, #e8efe2 85%, #f0f5ea 100%)",
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}>
            <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px 20px" }}>
                
                <div style={{ textAlign: "center", marginBottom: "32px" }}>
                    <div style={{ fontSize: "56px", marginBottom: "8px", filter: "drop-shadow(2px 4px 8px rgba(0,0,0,0.05))" }}>🌳</div>
                    <h1 style={{ 
                        fontSize: "38px", 
                        fontWeight: "800", 
                        background: "linear-gradient(135deg, #2d5a2c 0%, #4a8b3a 40%, #6aaa5a 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        marginBottom: "6px", 
                        letterSpacing: "-1px"
                    }}>
                        Дубки Go
                    </h1>
                    <p style={{ color: "#5a7e4a", fontSize: "14px", fontWeight: "500" }}>
                        Быстрый маршрут до универа
                    </p>
                </div>

                <div style={{ 
                    display: "flex", 
                    gap: "10px", 
                    marginBottom: "28px", 
                    background: "rgba(100,130,80,0.15)", 
                    borderRadius: "60px", 
                    padding: "6px"
                }}>
                    <button onClick={() => setActiveTab("route")} style={{
                        flex: 1, padding: "14px 20px", borderRadius: "60px", border: "none", fontWeight: "600", fontSize: "15px", cursor: "pointer",
                        background: activeTab === "route" ? "white" : "transparent", 
                        color: activeTab === "route" ? "#2d5a2c" : "#4a6741", 
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: activeTab === "route" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
                    }}>
                        <span>🗺️</span> Маршрут
                    </button>
                    <button onClick={() => setActiveTab("nearby")} style={{
                        flex: 1, padding: "14px 20px", borderRadius: "60px", border: "none", fontWeight: "600", fontSize: "15px", cursor: "pointer",
                        background: activeTab === "nearby" ? "white" : "transparent", 
                        color: activeTab === "nearby" ? "#2d5a2c" : "#4a6741", 
                        transition: "all 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "8px",
                        boxShadow: activeTab === "nearby" ? "0 2px 8px rgba(0,0,0,0.05)" : "none"
                    }}>
                        <span>⏰</span> Ближайшие
                    </button>
                </div>

                {activeTab === "route" && (
                    <div style={{ background: "white", borderRadius: "28px", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}>
                        
                        <div style={{ marginBottom: "28px" }}>
                            <div style={{ marginBottom: "20px" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "#4a6741", marginBottom: "8px" }}>
                                    <span>🟢</span> ОТКУДА
                                </label>
                                <select 
                                    value={startId} 
                                    onChange={(e) => setStartId(e.target.value)} 
                                    style={{ 
                                        width: "100%", 
                                        padding: "14px 16px", 
                                        borderRadius: "16px", 
                                        border: "1px solid #d4dec8", 
                                        fontSize: "15px", 
                                        background: "#fafcf8",
                                        color: "#2d5a2c",
                                        fontWeight: "500"
                                    }}
                                >
                                    <optgroup label="🏠 Общаги">
                                        {vertexGroups.dorm.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                    <optgroup label="🎓 Корпуса универа">
                                        {vertexGroups.university.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                    <optgroup label="🚏 Остановки">
                                        {vertexGroups.bus_stop.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                    <optgroup label="🚇 Метро">
                                        {vertexGroups.metro.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                    <optgroup label="🚂 Ж/Д станции">
                                        {vertexGroups.train_station.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "#4a6741", marginBottom: "8px" }}>
                                    <span>🔴</span> КУДА
                                </label>
                                <select 
                                    value={endId} 
                                    onChange={(e) => setEndId(e.target.value)} 
                                    style={{ 
                                        width: "100%", 
                                        padding: "14px 16px", 
                                        borderRadius: "16px", 
                                        border: "1px solid #d4dec8", 
                                        fontSize: "15px", 
                                        background: "#fafcf8",
                                        color: "#2d5a2c",
                                        fontWeight: "500"
                                    }}
                                >
                                    <optgroup label="🏠 Общаги">
                                        {vertexGroups.dorm.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                    <optgroup label="🎓 Корпуса универа">
                                        {vertexGroups.university.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                    <optgroup label="🚏 Остановки">
                                        {vertexGroups.bus_stop.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                    <optgroup label="🚇 Метро">
                                        {vertexGroups.metro.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                    <optgroup label="🚂 Ж/Д станции">
                                        {vertexGroups.train_station.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                        </div>

                        <div style={{ background: "#f5f7f2", borderRadius: "20px", padding: "20px", marginBottom: "28px" }}>
                            <div style={{ display: "flex", gap: "24px", marginBottom: "16px", flexWrap: "wrap" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                    <input type="radio" checked={useCurrentTime} onChange={() => setUseCurrentTime(true)} style={{ accentColor: "#2d5a2c" }} /> 
                                    <span>🕐 Сейчас</span>
                                </label>
                                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                                    <input type="radio" checked={!useCurrentTime} onChange={() => setUseCurrentTime(false)} style={{ accentColor: "#2d5a2c" }} /> 
                                    <span>📅 Другое время</span>
                                </label>
                            </div>
                            {!useCurrentTime && (
                                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
                                    <select 
                                        value={selectedDay} 
                                        onChange={(e) => setSelectedDay(e.target.value as DayType)} 
                                        style={{ flex: 1, padding: "12px", borderRadius: "14px", border: "1px solid #d4dec8", background: "white", color: "#2d5a2c" }}
                                    >
                                        {days.map(d => <option key={d} value={d}>{dayNames[d]}</option>)}
                                    </select>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", padding: "4px 12px", borderRadius: "14px", border: "1px solid #d4dec8" }}>
                                        <input type="number" value={hours} onChange={(e) => setHours(Math.min(23, Math.max(0, parseInt(e.target.value) || 0)))} style={{ width: "60px", padding: "10px", border: "none", textAlign: "center", fontSize: "16px" }} />
                                        <span>:</span>
                                        <input type="number" value={minutes} onChange={(e) => setMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} style={{ width: "60px", padding: "10px", border: "none", textAlign: "center", fontSize: "16px" }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <button onClick={handleFindRoute} disabled={loading} style={{
                            width: "100%", padding: "16px", background: "#2d5a2c", color: "white", border: "none", borderRadius: "60px", fontSize: "16px", fontWeight: "600", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, transition: "all 0.2s", marginBottom: "20px"
                        }}>
                            {loading ? "🔍 ПОИСК..." : "🌳 НАЙТИ МАРШРУТ"}
                        </button>

                        {error && <div style={{ padding: "14px", background: "#fef2f0", color: "#c75c3a", borderRadius: "16px", textAlign: "center", fontSize: "14px" }}>❌ {error}</div>}

                        {renderRoute()}
                    </div>
                )}

                {activeTab === "nearby" && (
                    <div style={{ background: "white", borderRadius: "28px", padding: "28px", boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}>
                        <div style={{ marginBottom: "24px" }}>
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#4a6741", marginBottom: "8px" }}>📍 ОТКУДА (остановка)</label>
                            <select 
                                value={nearbyFromStop} 
                                onChange={(e) => setNearbyFromStop(e.target.value)}
                                style={{ width: "100%", padding: "14px 16px", borderRadius: "16px", border: "1px solid #d4dec8", background: "#fafcf8", color: "#2d5a2c", marginBottom: "16px" }}
                            >
                                <optgroup label="🚏 Автобусные остановки">
                                    {vertexGroups.bus_stop.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </optgroup>
                                <optgroup label="🚂 Ж/Д станции">
                                    {vertexGroups.train_station.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </optgroup>
                            </select>
                            
                            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#4a6741", marginBottom: "8px" }}>📍 КУДА (остановка)</label>
                            <select 
                                value={nearbyToStop} 
                                onChange={(e) => setNearbyToStop(e.target.value)}
                                style={{ width: "100%", padding: "14px 16px", borderRadius: "16px", border: "1px solid #d4dec8", background: "#fafcf8", color: "#2d5a2c" }}
                            >
                                <option value="">-- Выберите остановку --</option>
                                <optgroup label="🚏 Автобусные остановки">
                                    {vertexGroups.bus_stop.filter(v => v.id !== nearbyFromStop).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </optgroup>
                                <optgroup label="🚂 Ж/Д станции">
                                    {vertexGroups.train_station.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                </optgroup>
                            </select>
                            
                            <button onClick={handleNearbySearch} disabled={!nearbyToStop} style={{
                                width: "100%", marginTop: "20px", padding: "14px", background: nearbyToStop ? "#2d5a2c" : "#b8c8b0", color: "white", border: "none", borderRadius: "60px", fontWeight: "600", cursor: nearbyToStop ? "pointer" : "not-allowed"
                            }}>
                                🔍 ПОКАЗАТЬ БЛИЖАЙШИЕ
                            </button>
                        </div>

                        {nearbyLoading && <div style={{ textAlign: "center", padding: "40px", color: "#6b8c5c" }}>⏳ Загрузка...</div>}

                        {nearbyResults.length > 0 && (
                            <div>
                                <div style={{ fontSize: "13px", color: "#6b8c5c", marginBottom: "16px", paddingBottom: "8px", borderBottom: "1px solid #e0e8d8" }}>
                                    🚀 Ближайшие {nearbyResults.length} отправлений
                                </div>
                                {nearbyResults.map((item, idx) => (
                                    <div key={idx} style={{ padding: "16px", marginBottom: "12px", background: "#f5f7f2", borderRadius: "18px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                                            <span style={{ fontWeight: "600", color: "#2d5a2c" }}>{item.transportName}</span>
                                            <span style={{ fontSize: "20px", fontWeight: "700", color: "#2d5a2c" }}>через {item.waitMinutes} мин</span>
                                        </div>
                                        <div style={{ fontSize: "13px", color: "#6b8c5c" }}>🚶 В пути: {item.travelMinutes} мин</div>
                                        <div style={{ fontSize: "14px", fontWeight: "500", color: "#c5a83a", marginTop: "8px", padding: "6px 10px", background: "#fef8e7", borderRadius: "12px", display: "inline-block" }}>
                                            🕐 Отправление в {formatTime(item.departureTime)}
                                        </div>
                                        <div style={{ fontSize: "13px", color: "#6b8c5c", marginTop: "8px" }}>
                                            🕐 Прибытие в {formatTime(item.arrivalTime)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {nearbyResults.length === 0 && !nearbyLoading && nearbyToStop && (
                            <div style={{ textAlign: "center", padding: "50px 20px", color: "#8ba87a" }}>
                                🌿 Нет ближайших отправлений по этому маршруту
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;