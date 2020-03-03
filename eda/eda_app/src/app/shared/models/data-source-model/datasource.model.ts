
export class DataSource {
    constructor(
        public connection: {
            host: string,
            port: number,
            type: string,
            user: string,
            password: string
        },
        public metadata: {
            model_name: string,
            model_id: string
        },
        public model: {
            tables: any[]
        }
    ) { }
}