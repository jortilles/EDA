import { Column } from '@eda/models/model.index';

export class UserQuery<T>{
  type : string;
  query : T;
  constructor(type:string, content:T){
    this.type = type;
    this.query = content;
  }
  setQuery(query:T):void{
    this.query = query;
  }
  getquery() : T {
    return this.query;
  }
}

export class UserEDAQuery extends UserQuery<Array<Column>>{
  type: string;
  query: Column[];
}

export class UserSQLQuery extends UserQuery<string>{
  type: string;
  query: string;
}