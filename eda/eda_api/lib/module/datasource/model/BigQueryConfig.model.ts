function BigQueryConfig(type: string, schema :string, project_id:string) {
  this.project_id =  project_id;
  this.type = type;
  this.schema = schema;
}

export default BigQueryConfig;