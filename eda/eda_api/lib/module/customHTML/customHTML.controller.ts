import { NextFunction, Request, Response } from 'express';
import CustomHTMLModel from './model/customHTML.model';

export class CustomHTMLController {

    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            const { key } = req.params;
            const doc = await CustomHTMLModel.findOne({ key });
            if (!doc) return res.status(404).json({ message: 'Not found' });
            return res.status(200).json({ key: doc.key, value: doc.value });
        } catch (err) {
            next(err);
        }
    }

    static async upsert(req: Request, res: Response, next: NextFunction) {
        try {
            const { key } = req.params;
            const { value, updatedBy } = req.body;
            const doc = await CustomHTMLModel.findOneAndUpdate(
                { key },
                { value, updatedAt: new Date(), updatedBy },
                { upsert: true, new: true }
            );
            return res.status(200).json({ key: doc.key, value: doc.value });
        } catch (err) {
            next(err);
        }
    }
}
