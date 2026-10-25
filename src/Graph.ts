// Graph.ts
import { Moment } from './Moment';
import { Edge, StaticEdge } from './Edge';
import { Vertex } from './Vertex';
import { TripInfo } from './Schedule';
import graphData from './graph_merged.json';

export interface EdgeResult {
    edge: Edge;
    waitMinutes: number;
    travelMinutes: number;
    departureTime: Moment;
    arrivalTime: Moment;
}

export interface PathResult {
    edges: EdgeResult[];
    totalMinutes: number;
    startTime: Moment;
    arrivalTime: Moment;
}

export class Graph {
    private vertices: Map<string, Vertex> = new Map();

    constructor(data: { vertices: any[] } = graphData) {
        for (const vertexData of data.vertices) {
            const vertex = Vertex.fromJSON(vertexData);
            this.vertices.set(vertex.id, vertex);
        }
    }

    getVertex(id: string): Vertex | undefined {
        return this.vertices.get(id);
    }

    getAllVertices(): Vertex[] {
        return Array.from(this.vertices.values());
    }

    findShortestPath(startId: string, endId: string, startTime: Moment): PathResult | null {
        // Проверка существования вершин
        if (!this.vertices.has(startId) || !this.vertices.has(endId)) {
            throw new Error(`Vertex not found: ${!this.vertices.has(startId) ? startId : endId}`);
        }
        
        interface VertexState {
            totalMinutes: number;
            arrivalTime: Moment | null;
            prevVertexId: string | null;
            prevEdge: Edge | null;
            waitMinutes: number;
            travelMinutes: number;
        }
        
        const state = new Map<string, VertexState>();
        
        for (const id of this.vertices.keys()) {
            state.set(id, {
                totalMinutes: Infinity,
                arrivalTime: null,
                prevVertexId: null,
                prevEdge: null,
                waitMinutes: 0,
                travelMinutes: 0
            });
        }
        
        const startState = state.get(startId)!;
        startState.totalMinutes = 0;
        startState.arrivalTime = startTime;
        
        const visited = new Set<string>();
        
        while (true) {
            let currentId: string | null = null;
            let currentTotal = Infinity;
            
            for (const [id, s] of state) {
                if (!visited.has(id) && s.totalMinutes < currentTotal) {
                    currentTotal = s.totalMinutes;
                    currentId = id;
                }
            }
            
            if (currentId === null || currentId === endId) break;
            
            visited.add(currentId);
            const currentState = state.get(currentId)!;
            const currentVertex = this.vertices.get(currentId)!;
            
            // Вес ребра зависит только от времени прибытия в вершину.
            // Ожидание метро стоит на ребре «платформа → поезд», а перегоны
            // идут между вершинами «в поезде», поэтому предыдущее ребро не важно.
            for (const edge of currentVertex.getEdges()) {
                const weight = edge.getWeight(currentState.arrivalTime!);
                if (weight === Infinity) continue;

                let waitMinutes: number;
                let travelMinutes: number;
                const tripInfo = edge.getTripInfo?.(currentState.arrivalTime!);
                if (tripInfo) {
                    waitMinutes = tripInfo.wait;
                    travelMinutes = tripInfo.travel;
                } else {
                    waitMinutes = 0;
                    travelMinutes = weight;
                }
                
                const newTotal = currentState.totalMinutes + weight;
                const targetState = state.get(edge.toId)!;
                
                if (newTotal < targetState.totalMinutes) {
                    targetState.totalMinutes = newTotal;
                    targetState.arrivalTime = currentState.arrivalTime!.addMinutes(weight);
                    targetState.prevVertexId = currentId;
                    targetState.prevEdge = edge;
                    targetState.waitMinutes = waitMinutes;
                    targetState.travelMinutes = travelMinutes;
                }
            }
        }
        
        const endState = state.get(endId)!;
        if (endState.totalMinutes === Infinity) return null;
        
        // Восстановление пути
        const edgesResult: EdgeResult[] = [];
        let current = endId;
        
        while (current !== startId) {
            const currentState = state.get(current)!;
            const prevState = state.get(currentState.prevVertexId!)!;
            
            const departureTime = prevState.arrivalTime!.addMinutes(currentState.waitMinutes);
            
            edgesResult.unshift({
                edge: currentState.prevEdge!,
                waitMinutes: currentState.waitMinutes,
                travelMinutes: currentState.travelMinutes,
                departureTime,
                arrivalTime: currentState.arrivalTime!
            });
            
            current = currentState.prevVertexId!;
        }
        
        return {
            edges: edgesResult,
            totalMinutes: endState.totalMinutes,
            startTime,
            arrivalTime: endState.arrivalTime!
        };
    }
}