import { Edge, createEdge } from './Edge';

export class Vertex {
    private constructor(
        private _id: string,
        private _name: string,
        private _type: string,
        private edges: Edge[]
    ) {}

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get type(): string {
        return this._type;
    }

    getEdges(): Edge[] {
        return this.edges;
    }

    static fromJSON(json: {
        id: string;
        name: string;
        type: string;
        edges: any[];
    }): Vertex {
        const edges: Edge[] = [];
        
        for (const edgeData of json.edges) {
            const edge = createEdge(edgeData);
            edges.push(edge);
        }
        
        if (edges.length === 0) {
            throw new Error(`Vertex ${json.id} has no edges`);
        }
        
        return new Vertex(
            json.id,
            json.name,
            json.type,
            edges
        );
    }
}