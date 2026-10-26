import { NextFunction, Request, Response } from 'express';
import * as crypto from 'crypto';
import { HttpException } from '../../module/global/model/index';
import User, { IUser } from '../../module/admin/users/model/user.model';
import Group from '../../module/admin/groups/model/group.model';
import { MailController } from '../../module/mail/mail.controller';
import { SampleWorkspaceService } from './sample-workspace.service';

const bcrypt = require('bcryptjs');
const SIGNUP_CONFIG = require('../../../config/signup.config');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Sign up attempts per IP: ip -> timestamps (ms)
const attempts = new Map<string, number[]>();

export class SignupController {

    /** Lets the login page know whether to show the "Create account" tab. */
    static status(_req: Request, res: Response) {
        return res.status(200).json({ ok: true, enabled: !!SIGNUP_CONFIG.enabled });
    }

    /**
     * Creates a free account: random password sent by email, default groups and, when configured,
     * a sample database + data model + dashboard.
     */
    static async signup(req: Request, res: Response, next: NextFunction) {
        try {
            if (!SIGNUP_CONFIG.enabled) return next(new HttpException(403, 'Sign up is disabled'));
            if (SignupController.rateLimited(req)) return next(new HttpException(429, 'Too many sign up attempts'));

            const name = String(req.body?.name ?? '').trim();
            const email = String(req.body?.email ?? '').trim().toLowerCase();
            if (!name || name.length > 100 || !EMAIL_REGEX.test(email) || email.length > 254) {
                return next(new HttpException(400, 'Invalid name or email'));
            }
            if (req.body?.acceptTerms !== true) return next(new HttpException(400, 'Terms and conditions not accepted'));

            const existing = await User.findOne({ email: { $regex: `^${escapeRegex(email)}$`, $options: 'i' } });
            if (existing) return next(new HttpException(409, 'User already exists'));

            // Without mail the user would never get the password: check it before creating anything
            let mail: { transporter: any; senderEmail: string };
            try {
                mail = await MailController.openTransporter();
            } catch (err) {
                console.error('[signup] mail server unavailable:', (err as any)?.message || err);
                return next(new HttpException(503, 'Mail server unavailable'));
            }

            const password = crypto.randomBytes(9).toString('base64url');
            const user: IUser = await new User({
                name,
                email,
                password: bcrypt.hashSync(password, 10),
                img: '',
                role: [SIGNUP_CONFIG.defaultGroupId],
                creation_date: new Date()
            }).save();

            try {
                await mail.transporter.sendMail({
                    from: mail.senderEmail,
                    to: email,
                    subject: 'Edalitics registration information',
                    text: SignupController.welcomeText(name, email, password)
                });
            } catch (err) {
                console.error('[signup] welcome email failed:', (err as any)?.message || err);
                await User.deleteOne({ _id: user._id });
                return next(new HttpException(503, 'Mail server unavailable'));
            }

            await SignupController.joinGroups(user);

            if (SIGNUP_CONFIG.sampleDatabase?.enabled) {
                // The account is already usable: a failure here only costs the sample content
                SampleWorkspaceService.create(user, SIGNUP_CONFIG.sampleDatabase)
                    .catch(err => console.error('[signup] sample workspace failed for', email, err?.message || err));
            }

            return res.status(201).json({ ok: true, email });

        } catch (err) {
            next(err instanceof HttpException ? err : new HttpException(500, 'Error creating the account'));
        }
    }

    private static async joinGroups(user: IUser): Promise<void> {
        await Group.updateOne({ _id: SIGNUP_CONFIG.defaultGroupId }, { $addToSet: { users: user._id } });

        const extraGroups: string[] = SIGNUP_CONFIG.extraGroups || [];
        if (extraGroups.length) {
            const groups = await Group.find({ name: { $in: extraGroups } });
            await Group.updateMany({ name: { $in: extraGroups } }, { $addToSet: { users: user._id } });
            await User.updateOne({ _id: user._id }, { $addToSet: { role: { $each: groups.map(g => g._id) } } });
        }
    }

    private static rateLimited(req: Request): boolean {
        const { windowMinutes = 60, max = 5 } = SIGNUP_CONFIG.rateLimit || {};
        const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
        const now = Date.now();
        const recent = (attempts.get(ip) || []).filter(t => now - t < windowMinutes * 60000);
        recent.push(now);
        attempts.set(ip, recent);
        return recent.length > max;
    }

    private static welcomeText(name: string, email: string, password: string): string {
        return `Hello ${name}.\n\n` +
            `Thank you for registering at Edalitics.\n` +
            `Your login credentials are:\n` +
            `Server: ${SIGNUP_CONFIG.appUrl}\n` +
            `Username: ${email}\n` +
            `Password: ${password}\n\n` +
            `Hope you enjoy Edalitics. You can follow some tutorials in our YouTube channel.\n` +
            `How to create a new datasource with Edalitics: https://youtu.be/Px709s0ftiI\n` +
            `How to create a new report with Edalitics: https://youtu.be/RFznLe9kxHU\n` +
            `You can always check the "first steps" guide at https://www.edalitics.com/en/firststeps/\n` +
            `Also you can ask in the forum if you have any question: https://github.com/jortilles/EDA/discussions\n\n` +
            `Edalitics is the cloud service over Enterprise Data Analytics (EDA) provided by Jortilles www.jortilles.com`;
    }
}

function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
