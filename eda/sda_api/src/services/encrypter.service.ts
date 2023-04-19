const SEED = require('../config/seed').SEED;

export class EnCrypterService {

    private static newValues: any[] = [];

    static encrypt(value: string) {
        this.newValues = [];

        for (let i = 0; i < value.length; i++) {
            this.newValues.push(String.fromCharCode(value.charCodeAt(i) + SEED.charCodeAt(i)));
        }

        return Buffer.from(this.newValues.join('')).toString('base64');
    }

    static decode(value: string) {
        this.newValues = [];
        const dec = Buffer.from(value, 'base64').toString();

        for (let i = 0;  i < dec.length; i++) {
            this.newValues.push(String.fromCharCode(dec.charCodeAt(i) - SEED.charCodeAt(i)));
        }

        return this.newValues.join('');
    }

}
