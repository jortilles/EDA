import { IEDAPlugin } from '../plugin.interface';
import SignupRouter from './signup.router';

/**
 * Self-service sign up (Edalitics Free): public /signup endpoint that creates the account,
 * emails the password and, when configured, a sample database + model + dashboard.
 * Enabled by config/signup.config.js. Front end: the "edalitics-free-login" app plugin.
 */
export const SignupPlugin: IEDAPlugin = {
    kind: 'feature',
    type: 'signup',
    router: SignupRouter,
    routerPath: '/signup',
};
