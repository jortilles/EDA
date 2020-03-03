export class ResponseModel {
    protected response: string;
    affected: number;
    identity: any;

    constructor(affected?: number, identity?: any) {
        this.response = 'OK';

        if(affected) {
            this.affected = affected;
        }

        if (identity) {
            this.identity = identity;
        }
    }
}
