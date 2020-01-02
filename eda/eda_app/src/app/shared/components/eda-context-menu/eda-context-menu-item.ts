export class EdaContextMenuItem {
    public label: string;
    public icon: string;
    public items: EdaContextMenuItem[];
    command: () => void = () => {};

    constructor(init: Partial<EdaContextMenuItem>) {
        Object.assign(this, init);
    }

}
