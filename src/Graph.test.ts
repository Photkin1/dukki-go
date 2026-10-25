import { Graph } from './Graph';
import { Moment } from './Moment';

// 8:00 понедельника 26.10.2026 в «локальных» минутах, как их считает Moment
const at8 = Moment.fromMinutes(Date.UTC(2026, 9, 26, 8, 0) / 60000);

const metro = (toId: string, wait: number) => ({
    type: "dynamic", toId, transportType: "metro_3", transportName: "Метро",
    schedule: { wait, travel: 0, firstTrainEven: "05:30", firstTrainOdd: "05:30" }
});
const ride = (toId: string, travelMinutes: number) => ({
    type: "static", toId, transportType: "metro_3", transportName: "Метро", travelMinutes
});
const walk = (toId: string, travelMinutes: number) => ({
    type: "static", toId, transportType: "walk", transportName: "пешком", travelMinutes
});

test('пассажир в вагоне не ждёт поезд повторно (пример с Молодёжной)', () => {
    // Пешком на Молодёжную к 8:08, или пешком на Кунцевскую и на метро
    // до Молодёжной к 8:10, оставаясь в вагоне. Интервал 4 мин, перегоны по 3 мин.
    const graph = new Graph({
        vertices: [
            { id: "start", name: "Старт", type: "bus_stop", edges: [walk("molod", 8), walk("kun", 3)] },
            { id: "kun", name: "Кунцевская", type: "metro_station3", edges: [metro("kun_t", 4)] },
            { id: "molod", name: "Молодёжная", type: "metro_station3", edges: [metro("molod_t", 4)] },
            { id: "krul", name: "Крылатское", type: "metro_station3", edges: [walk("start", 99)] },
            { id: "kun_t", name: "Кунцевская", type: "metro_train", edges: [ride("molod_t", 3), ride("kun", 0)] },
            { id: "molod_t", name: "Молодёжная", type: "metro_train", edges: [ride("krul_t", 3), ride("molod", 0)] },
            { id: "krul_t", name: "Крылатское", type: "metro_train", edges: [ride("krul", 0)] },
        ]
    });

    const path = graph.findShortestPath("start", "krul", at8)!;

    // Пешком через платформу Молодёжной было бы 8:08 + 4 + 3 = 8:15
    expect(path.totalMinutes).toBe(13);
    expect(path.edges.map(e => e.edge.toId)).toEqual(["kun", "kun_t", "molod_t", "krul_t", "krul"]);
    expect(path.edges.filter(e => e.waitMinutes > 0)).toHaveLength(1);
});

test('на настоящем графе поездка по синей ветке ждёт поезд один раз', () => {
    const graph = new Graph();
    const path = graph.findShortestPath("kun_mt3", "strog_mt3", at8)!;

    // Ожидание 4 мин + перегоны 3 + 3 + 9
    expect(path.totalMinutes).toBe(19);
    expect(path.edges.filter(e => e.waitMinutes > 0)).toHaveLength(1);
    expect(path.edges[path.edges.length - 1].edge.toId).toBe("strog_mt3");
});
