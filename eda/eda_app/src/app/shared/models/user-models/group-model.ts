import { User } from './user.model';
export class Group {
    constructor( public name: string,
                 public role: string,
                 public users: User[],
                 public img: string) {}
}
