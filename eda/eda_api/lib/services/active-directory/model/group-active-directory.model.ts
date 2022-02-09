export class GroupActiveDirectoryModel {
    public name: string;
    public role: string;
    public users: any[];
    public img: string;

    constructor(init?: Partial<GroupActiveDirectoryModel>) {
        Object.assign(this, init);
    }
}