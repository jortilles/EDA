export class HttpException extends Error {
    status: number;
    message: string;

    constructor(status: number = 500, message: string) {
        super(message);
        this.status = status;
        this.message = message;
    }
}
