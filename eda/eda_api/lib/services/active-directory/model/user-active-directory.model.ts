export class UserActiveDirectoryModel {
    public username: string;
    public displayName: string;
    public email: string;
    public userRole: string;
    public adminRole: string;

    constructor(init?: Partial<UserActiveDirectoryModel>) {
        Object.assign(this, init);
    }
}