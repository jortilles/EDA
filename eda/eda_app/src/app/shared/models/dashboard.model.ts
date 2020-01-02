
export class Dashboard {

    constructor(
        public id: string,
        public title: string,
        public panel: any[],
        public user: string,
        public datasSource: any,
        public filters: any[],
        public applytoAllFilter : {present:boolean, refferenceTable:string, id : string}
    ) { }

}
