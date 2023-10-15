import { AbstractConnection } from '../abstract-connection'
import { AggregationTypes } from '../../../module/global/model/aggregation-types'
import https from 'https'
import http from 'http'
import { collapseTextChangeRangesAcrossMultipleVersions } from 'typescript'

export class JSONWebServiceConnection extends AbstractConnection {
  public dataModel: any
  public user: string
  public groups: Array<string> = []

  GetDefaultSchema (): string {
    return 'public'
  }

  private queryBuilder: any
  private AggTypes: AggregationTypes

  async getclient () {
    try {
      return null
    } catch (err) {
      throw err
    }
  }

  async tryConnection (): Promise<any> {
    try {
      this.itsConnected()
      return
    } catch (err) {
      throw err
    }
  }

  async generateDataModel (
    optimize: number,
    filter: string,
    name: string
  ): Promise<any> {
    const url = this.config.host
    const tableName = name
    const protocol = url.slice(0, 5)
    let module = null

    if (protocol === 'https') {
      module = https
    } else {
      module = http
    }
    //console.log('generateDataModel querying....');
    //console.log(url);

    return new Promise((resolve, reject) => {
      module.get(url, async res => {
        try {
          let body = ''
          res.setEncoding('utf-8')
          for await (const chunk of res) {
            body += chunk
          }
         // let firstRow = JSON.parse(body)[0]

          const newTable = {
            table_name: tableName,
            display_name: {
              default: this.normalizeName(tableName),
              localized: []
            },
            description: {
              default: `${this.normalizeName(tableName)}`,
              localized: []
            },
            table_granted_roles: [],
            table_type: [],
            columns: this.getColumns( JSON.parse(body) ),
            relations: [],
            visible: true
          }

          /**Resolve promise */
          resolve([newTable])
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  private getData = (host: string): Promise<any> => {
    const protocol = host.slice(0, 5)
    let module = null

    if (protocol === 'https') {
      module = https
    } else if (protocol.slice(0, 4) === 'http') {
      module = http
    }

    //console.log('getData querying....');
    //console.log(host);
    return new Promise((resolve, reject) => {
      module.get(host, async res => {
        try {
          let body = ''
          res.setEncoding('utf-8')
          for await (const chunk of res) {
            body += chunk
          }
          let data = JSON.parse(body)
          resolve(data)
        } catch (e) {
          reject(e)
        }
      })
    })
  }

  private getColumns (rows) {
    let columns = []
    rows.forEach(row => {
        Object.keys(row).forEach(k => {
          const column = this.setColumn(k, row[k]);
          if(! columns.some(c => c.column_name === column.column_name)){
            columns.push(column);
          }
        })
    });

    return columns
  }
  private setColumn (column, value) {
    const type = isNaN(value) ? 'text' : 'numeric'
    let c = {
      column_name: column,
      column_type: type,
      display_name: {
        default: this.normalizeName(column),
        localized: []
      },
      description: {
        default: this.normalizeName(column),
        localized: []
      },
      aggregation_type:
        type === 'numeric'
          ? AggregationTypes.getValuesForNumbers()
          : [{ value: 'none', display_name: 'no' }],
      column_granted_roles: [],
      row_granted_roles: [],
      visible: true,
      tableCount: 0,
      minimumFractionDigits: type === 'numeric' ? 2 : 0
    }
    return c
  }

  async execQuery (query: any): Promise<any> {
    try {
      const fields = query[0].fields
      const fields_names = fields.map(field => field['column_name'])
      let filters = query[0].filters
      const model = query[1]
      const host = model.ds.connection.host
      const data = await this.getData(host)
      const aggregationInfo = this.getAggregationInfo(fields)
      const sortFields = this.getSortInfo(fields)
      const aggregatedDatesInfo = this.getDatesInfo(fields)

      /**Security */
      const modelPermissions = this.dataModel.ds.metadata.model_granted_roles
      const permissions = this.getUserPermissions(
        modelPermissions,
        this.user,
        this.groups
      )
      let permissionFilters = []
      if (permissions.length > 0) {
        permissionFilters = this.builPermissionFilters(permissions)
      }

      filters = [...filters, ...permissionFilters]

      let response = []

      if (filters.length > 0) {
        response = this.filter(data, filters).map(row => {
          const res = {}
          fields_names.forEach(name => (res[name] = row[name]))
          return res
        })
      } else {
        response = data.map(row => {
          const res = {}
          fields_names.forEach(name => (res[name] = row[name]))
          return res
        })
      }

      if (aggregatedDatesInfo.length > 0) {
        this.formatDates(response, aggregatedDatesInfo)
      }

      if (aggregationInfo.aggFields.length > 0) {
        response = this.aggregate(
          response,
          aggregationInfo.nonAggFields,
          aggregationInfo.aggFields,
          fields
        )
      }

      if (sortFields.length > 0) {
        response = this.sort(response, sortFields)
      }

      /** select count should return 0 instead of no-data*/
      if (response.length == 0) {
        let doit = 0
        fields.forEach(field => {
          if (
            field.column_type == 'numeric' &&
            (field.aggregation_type == 'count' ||
              field.aggregation_type == 'count_distinct')
          ) {
            //
            doit = 1
            response.push({ [field.name]: 0 })
          } else {
            if (field.column_type == 'numeric') {
              response.push({ [field.name]: 0 })
            } else {
              response.push({ [field.name]: '-' })
            }
          }
        })
        response = [...new Set(response.map(row => Object.values(row)[0]))].map(
          value => ({ [fields_names[0]]: value })
        )
        // if there is no numeric && count or count-distinct the response is again []
        if (doit == 0) {
          response = []
        }
      }

      /**Unique values  for all*/
      let finalResponse = []
      response.forEach(x => {
        if (!finalResponse.some(y => JSON.stringify(y) === JSON.stringify(x))) {
          finalResponse.push(x)
        }
      })
      response = finalResponse;



      return response;

    } catch (err) {
      console.log(err)
      throw err
    }
  }


  async execSqlQuery (query: any): Promise<any> {
    return this.execQuery(query);
  }

  private getDatesInfo = (
    fields: Array<any>
  ): Array<{ field_name: string; format: string }> => {
    let aggregatedDateFields = []
    fields.forEach(field => {
      if (field.column_type === 'date' && field.format !== 'No') {
        aggregatedDateFields.push({
          field_name: field.column_name,
          format: field.format
        })
      }
    })

    return aggregatedDateFields
  }

  private filter = (data: Array<any>, filters: Array<any>) => {
    filters.forEach(filter => {
      switch (filter.filter_type) {
        case '=':
          data = data.filter(
            row =>
              row[filter.filter_column] === filter.filter_elements[0].value1[0]
          )
          break
        case '!=':
          data = data.filter(
            row =>
              row[filter.filter_column] !== filter.filter_elements[0].value1[0]
          )
          break
        case '<':
          data = data.filter(
            row =>
              parseFloat(row[filter.filter_column]) <
              parseFloat(filter.filter_elements[0].value1[0])
          )
          break
        case '>':
          data = data.filter(
            row =>
              parseFloat(row[filter.filter_column]) >
              parseFloat(filter.filter_elements[0].value1[0])
          )
          break
        case '<=':
          data = data.filter(
            row =>
              parseFloat(row[filter.filter_column]) <=
              parseFloat(filter.filter_elements[0].value1[0])
          )
          break
        case '>=':
          data = data.filter(
            row =>
              parseFloat(row[filter.filter_column]) >=
              parseFloat(filter.filter_elements[0].value1[0])
          )
          break
        case 'in':
          data = data.filter(row =>
            filter.filter_elements[0].value1.includes(row[filter.filter_column])
          )
          break
        case 'not_in':
          data = data.filter(
            row =>
              !filter.filter_elements[0].value1.includes(
                row[filter.filter_column]
              )
          )
          break
        case 'between':
          data = data.filter(
            row =>
              parseFloat(row[filter.filter_column]) >=
                parseFloat(filter.filter_elements[0].value1[0]) &&
              parseFloat(row[filter.filter_column]) <=
                parseFloat(filter.filter_elements[1].value2[0])
          )
          break
        case 'like':
          data = data.filter(row =>
            row[filter.filter_column].includes(
              filter.filter_elements[0].value1[0]
            )
          )
          break
        case 'not_like':
          data = data.filter(
            row =>
              !row[filter.filter_column].includes(
                filter.filter_elements[0].value1[0]
              )
          )
          break
        case 'not_null':
          data = data.filter(row => !!row[filter.filter_column])
          break
      }
    })
    return data
  }

  private getAggregationInfo = (fields: Array<any>) => {
    let aggFields = fields
      .filter(field => field.aggregation_type !== 'none')
      .map(field => field.column_name)
    let nonAggFields = fields
      .filter(field => field.aggregation_type === 'none')
      .map(field => field.column_name)

    return { aggFields: aggFields, nonAggFields: nonAggFields }
  }

  private formatDates = (
    arr: Array<any>,
    fieldsToFormat: Array<{ field_name: string; format: string }>
  ) => {
    arr.forEach(row => {
      fieldsToFormat.forEach(field => {
        row[field.field_name] = this.formatDate(
          field.format,
          row[field.field_name]
        )
      })
    })
  }

  private getWeekNumber = (d: any): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
    var yearStart: any = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    var weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
    return weekNo
  }

  private aggregate (
    arr: Array<any>,
    groupByCols: Array<string>,
    aggregateCols: Array<string>,
    fields
  ) {
    const subSet = (o: Object, keys: Array<string>) =>
      keys.reduce((r, k) => ((r[k] = o[k]), r), {})
    let grouped = {}

    arr.forEach(o => {
      const values = groupByCols.map(k => o[k]).join('|')
      const countDistinctValues = {}

      if (grouped[values]) {
        aggregateCols.forEach(col => {
          let aggType = fields
            .filter(field => field.column_name === col)
            .map(field => field.aggregation_type)[0]
          grouped[values][col] = this.aggregateValue(
            o[col],
            grouped[values][col],
            aggType,
            countDistinctValues
          )
        })

        grouped[values].Count++
      } else {
        grouped[values] = subSet(o, groupByCols)
        grouped[values].Count = 1
        aggregateCols.forEach(col => {
          let aggType = fields
            .filter(field => field.column_name === col)
            .map(field => field.aggregation_type)[0]

          if (aggType === 'count_distinct') {
            countDistinctValues[o[col]] = true
          }

          grouped[values][col] = !['count', 'count_distinct'].includes(aggType)
            ? parseFloat(o[col])
            : 1
        })
      }
    })

    let values = Object.values(grouped)
    let result = []
    /**Re-sort keys */
    values.forEach(value => {
      let newValue = {}
      fields.forEach(field => {
        if (field.aggregation_type === 'avg') {
          newValue[field.column_name] =
            value[field.column_name] / value['Count']
        } else {
          newValue[field.column_name] = value[field.column_name]
        }
        //Formato els números
        if (
          field.column_type === 'numeric' &&
          field.minimumFractionDigits >= 0
        ) {
          newValue[field.column_name] = parseFloat(
            newValue[field.column_name]
          ).toFixed(field.minimumFractionDigits)
        }
      })
      result.push(newValue)
    })

    return Object.values(result)
  }

  private aggregateValue = (
    value: any,
    total: number,
    aggType: string,
    countDistinctValues: Object
  ) => {
    if (['sum', 'avg'].includes(aggType)) return parseFloat(value) + total

    if (aggType === 'min')
      return parseFloat(value) < total ? parseFloat(value) : total

    if (aggType === 'max')
      return parseFloat(value) > total ? parseFloat(value) : total

    if (aggType === 'count') return total + 1

    if (aggType === 'count_distinct') {
      if (!countDistinctValues[value]) {
        countDistinctValues[value] = true
        return total + 1
      } else return total
    }
  }
  private getSortInfo = (fields: Array<any>) => {
    return fields.filter(field => field.ordenation_type !== 'No')
  }
  private sort = (data: Array<any>, sortFields: Array<any>) => {
    let evalChain = []

    /**For each sort-field push his sort function based on field name and type */
    sortFields.forEach(field => {
      if (field.ordenation_type === 'Desc') {
        if (field.column_type === 'numeric')
          evalChain.push((a, b) => b[field.column_name] - a[field.column_name])
        else
          evalChain.push((b, a) =>
            a[field.column_name].localeCompare(b[field.column_name])
          )
      } else {
        if (field.column_type === 'numeric')
          evalChain.push((b, a) => b[field.column_name] - a[field.column_name])
        else
          evalChain.push((a, b) =>
            a[field.column_name].localeCompare(b[field.column_name])
          )
      }
    })
    /**Sort based on each function
     * sort function should return 0 or 1. 0 does noting, 1 sorts values;
     * therefore if previous function returns 0 (values are equal) next function is called
     * (this is done by reduce in evalChain with 0 as initial value)
     * */
    return data.sort((a, b) => evalChain.reduce((f, g) => f || g(a, b), 0))
  }

  public getUserPermissions (modelPermissions: any[], user, groups) {
    const permissions = []
    modelPermissions.forEach(permission => {
      switch (permission.type) {
        case 'users':
          if (permission.users.includes(user) && !permission.global) {
            permissions.push(permission)
          }
          break
        case 'groups':
          groups.forEach(group => {
            if (permission.groups.includes(group) && !permission.global) {
              permissions.push(permission)
            }
          })
      }
    })
    return permissions
  }

  public builPermissionFilters = (filters: Array<any>): Array<any> => {
    let buildedFilters = []
    filters.forEach(filter => {
      let newFilter = {
        filter_table: filter.table,
        filter_column: filter.column,
        filter_type: 'in',
        filter_elements: [{ value1: filter.value }],
        selectedRange: null,
        isGlobal: false
      }
      buildedFilters.push(newFilter)
    })

    return buildedFilters
  }

  async getQueryBuilded (queryData: any, dataModel: any, user: any) {
    this.queryBuilder = null
    this.user = user._id
    this.groups = user.role
    this.dataModel = dataModel
    return [queryData, dataModel]
  }

  BuildSqlQuery (queryData: any, dataModel: any, user: any): string {
    return null
  }

  private formatDate = (format: string, date: string): string => {
    let toDate: Date = new Date(date) || new Date('1971-01-01T00:00:00')

    if (format === 'year') {
      return `${toDate.getFullYear()}`
    }
    if (format === 'quarter') {
      let month = toDate.getMonth() + 1;
      let leadingZerosMonth = 'Q';
      if( month < 4){
        leadingZerosMonth = leadingZerosMonth+'1';
      }else if( month > 3 && month < 7){
        leadingZerosMonth = leadingZerosMonth+'2';
      }else if( month > 6 && month < 10){
        leadingZerosMonth = leadingZerosMonth+'3';
      }else if( month > 9 && month < 13){
        leadingZerosMonth = leadingZerosMonth+'4';
      }else{
        leadingZerosMonth = leadingZerosMonth+'??';
      }

      return `${toDate.getFullYear()}-${leadingZerosMonth}`
    }
    if (format === 'month') {
      let month = toDate.getMonth() + 1
      let leadingZerosMonth = month < 10 ? `0${month}` : `${month}`
      return `${toDate.getFullYear()}-${leadingZerosMonth}`
    }
    if (format === 'week') {
      let week = this.getWeekNumber(toDate)
      let leadingZerosWeek = week < 10 ? `0${week}` : `${week}`
      return `${toDate.getFullYear()}-${leadingZerosWeek}`
    }
    if (format === 'day') {
      let month = toDate.getMonth() + 1
      let leadingZerosMonth = month < 10 ? `0${month}` : `${month}`
      let day = toDate.getDate()
      let leadingZerosDay = day < 10 ? `0${day}` : `${day}`
      return `${toDate.getFullYear()}-${leadingZerosMonth}-${leadingZerosDay}`
    }
    if (format === 'week_day') {
      let day = toDate.getDay()
      day = day === 0 ? 7 : day
      return `${day}`
    }
    if (format === 'timestamp') {
      return date
    } else {
      return date
    }
  }

  private normalizeName (name: string) {
    let out = name.split('_').join(' ')
    return out
      .toLowerCase()
      .split(' ')
      .map(s => s.charAt(0).toUpperCase() + s.substring(1))
      .join(' ')
  }

  createTable (queryData: any, user: any): string {
    return null
  }

  generateInserts (queryData: any, user: any): string {
    return null
  }

  getForeignKeysQuery () {
    return null
  }
}
