import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../api/api.service';
import { Column, Query } from '@eda_models/model.index';


@Injectable()
export class QueryBuilderService extends ApiService {

  constructor(
    protected http: HttpClient) {
    super(http);
  }


public simpleQuery(column: Column, tableID:string, modelId:string, dashboardId:string, panelId:string) {
      const labels = [];
      const queryColumns = [];
      const col: any = {};
      col.table_id = tableID;
      col.column_name = column.column_name;
      col.display_name = column.display_name.default;
      col.column_type = column.column_type;
      col.aggregation_type = column.aggregation_type.filter(ag => ag.selected === true);
      col.aggregation_type = col.aggregation_type[0] ? col.aggregation_type[0].value : 'none';
      col.ordenation_type = column.ordenation_type;
      col.order = 0;
      col.column_granted_roles = column.column_granted_roles;
      col.row_granted_roles = column.row_granted_roles;

      queryColumns.push(col);


      const body: Query = {
          id: '1',
          model_id: modelId,
          user: {
              user_id: localStorage.getItem('id'),
              user_roles: ['USER_ROLE']
          },
          dashboard: {
              dashboard_id: dashboardId,
              panel_id: panelId,
          },
          query: {
              fields: queryColumns,
              filters : [],
              simple : true
          },
          output: {
              labels,
              data: []
          }
      };

      return body;
  }
}
