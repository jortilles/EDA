import { Pool, PoolOptions, createPool } from "mysql2";

class PoolManagerConnection {
    private pools: { [key: string]: Pool } = {};

    // Crear un pool para una base de datos específica
    createPool(databaseName: string, config: PoolOptions): void {
        this.pools[databaseName] = createPool(config);
    }

    // Obtener el pool para una base de datos específica
    getPool(databaseName: string): Pool | undefined {
        return this.pools[databaseName];
    }
}

// Singleton para la gestión de pools de conexiones
export class PoolManagerConnectionSingleton {
    private static instance: PoolManagerConnection;

    static getInstance(): PoolManagerConnection {
        if (!PoolManagerConnectionSingleton.instance) {
            PoolManagerConnectionSingleton.instance = new PoolManagerConnection();
        }
        return PoolManagerConnectionSingleton.instance;
    }
}