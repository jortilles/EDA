import { SchedulerFunctions } from './../scheduler/schedulerFunctions'
import hasher from 'node-object-hash'
import CachedQuery, { ICachedQuery } from './cached-query.model'
import DataSource from '../../module/datasource/model/datasource.model'
import ManagerConnectionService from '../../services/connection/manager-connection.service'

export class CachedQueryService {
  static build(model_id: string, query: any) {
    const hash = hasher()
    return hash.hash({ model: model_id, query: query })
  }


  static async getQuery(queryHash) {
    try {
      const query = await CachedQuery.findOne({
        'cachedQuery.hashedQuery': queryHash
      }).exec()
      return query
    } catch (err) {
      console.log(err)
      return null
    }
  }

  static async checkQuery(model_id: string, query: any) {    try {
      const queryHash = CachedQueryService.build(model_id, query);
      const storedQuery = await CachedQueryService.getQuery(queryHash);
      if (storedQuery) {
        const res = await CachedQuery.updateOne(
          { _id: storedQuery._id },
          {
            'cachedQuery.lastLoaded': SchedulerFunctions.totLocalISOTime(
              new Date()
            )
          }
        )
      }
      return storedQuery;
    } catch (err) {
      console.log(err);
      throw new Error(`Unable to cache query`);
    }
  }

  static async storeQuery (model_id: string, query: any, response: Array<any>) {
        try {
      const cachedQuery: ICachedQuery = new CachedQuery({
        cachedQuery: {
          query: query,
          model_id: model_id,
          hashedQuery: CachedQueryService.build(model_id, query),
          response: response,
          dateAdded: SchedulerFunctions.totLocalISOTime(new Date()),
          lastLoaded: SchedulerFunctions.totLocalISOTime(new Date()),
          lastUpdated: SchedulerFunctions.totLocalISOTime(new Date())
        }
      })

      cachedQuery.save(async (err, querySaved: ICachedQuery) => {
        if (err) {
          console.log(err)
          throw new Error('Unable to cache query');
        }
      })
    } catch (err) {
      console.log(err)
      throw new Error('Unable to cache query');
    }
  }

  static async clean (MAX_MILIS_STORED: number) {
    const now = new Date()
    let limitDate = new Date(now.getTime() - MAX_MILIS_STORED)
    // console.log(`\n\x1b[34m=====\x1b[0m \x1b[32mCleaning service\x1b[0m \x1b[34m=====\x1b[0m\n`);

    try {
      const res = await CachedQuery.deleteMany({
        'cachedQuery.lastLoaded': {
          $lte: SchedulerFunctions.totLocalISOTime(limitDate)
        }
      }).exec()
      if (res.n > 0) {
        console.log(
          `\n\x1b[34m=====\x1b[0m \x1b[32mCleaning service: Removed ${res.n} cached queries \x1b[0m \x1b[34m=====\x1b[0m\n`
        )
      }
    } catch (err) {
      throw new Error(err)
    }
  }

  static async updateQueries () {
    console.log(
      `\n\x1b[34m=====\x1b[0m \x1b[32mUpdating service\x1b[0m \x1b[34m=====\x1b[0m\n`
    )

    try {
      const models = await DataSource.find({})

      const cachedModels = models
        .filter(model => model.ds.metadata.cache_config.enabled == true)
        .map(model => {
          return {
            model_id: `${model._id}`,
            cache_config: model.ds.metadata.cache_config
          }
        })

      const queries = await CachedQuery.find({
        'cachedQuery.model_id': {
          $in: cachedModels.map(model => model.model_id)
        }
      })

      let updatedQueries = 0

      queries.forEach(async query => {
        const cache_config = cachedModels
          .filter(m => (m.model_id = query.cachedQuery.model_id))
          .map(_ => _.cache_config)[0]

        let shouldUpdate = false

        if (cache_config.units === 'hours') {
          shouldUpdate = SchedulerFunctions.checkScheduleHours(
            cache_config.quantity,
            query.cachedQuery.lastUpdated
          )
        } else if (cache_config.units === 'days') {
          shouldUpdate = SchedulerFunctions.checkScheduleDays(
            cache_config.quantity,
            cache_config.hours,
            cache_config.minutes,
            query.cachedQuery.lastUpdated
          )
        }
        if (shouldUpdate) {
          console.log('Cached query should update queries!')

          updatedQueries++
          try{
            const updatedValues = await CachedQueryService.execQuery(
             query.cachedQuery.model_id,
             query.cachedQuery.query,
             query.cachedQuery.response[0]
           )
            const updated = await CachedQuery.updateOne(
              { _id: query._id },
              {
                'cachedQuery.lastUpdated': SchedulerFunctions.totLocalISOTime(
                  new Date()
                ),
                'cachedQuery.response': updatedValues
              }
            ).exec()
            console.log( SchedulerFunctions.totLocalISOTime( new Date()) + ' Updated query ' +  query._id );
          } catch (err) {
            CachedQueryService.deleteQuery( query.cachedQuery.hashedQuery)
            console.log('Error updating query' + query.cachedQuery.hashedQuery + ' Query has been deleted ') ;
            
          }     
        }
      })
      /**Log info */
      if (updatedQueries > 0) {
        console.log(
          `\n\x1b[34m=====\x1b[0m \x1b[32mUpdating service: ${updatedQueries} updated \x1b[0m \x1b[34m=====\x1b[0m\n`
        )
      }
    } catch (err) {
      throw new Error(err)
    }
  }

  static hoursToInt (date: Date) {
    let hour = date.getHours(),
      hourStr
    hourStr = hour > 10 ? `0${hour}` : `${hour}`
    let minutes = date.getMinutes(),
      minutesStr
    minutesStr = minutes > 10 ? `0${minutes}` : `${minutes}`
    const hourToInt = parseInt(`${hour}${minutes}`)
    return hourToInt
  }

  static async execQuery (
    model_id: string,
    query: string,
    labels: Array<string>
  ) {
    try {
      const connection = await ManagerConnectionService.getConnection(model_id)
      connection.client = await connection.getclient()
      const getResults = await connection.execQuery(query)
      const results = []

      // Normalize data
      for (let i = 0, n = getResults.length; i < n; i++) {
        const r = getResults[i]
        const output = Object.keys(r).map(i => r[i])
        results.push(output)
      }

      const output = [labels, results]
      return output
    } catch (e) {
      throw e
    }
  }

  static async deleteQuery (hashedQuery) {
    return await CachedQuery.deleteOne({
      'cachedQuery.hashedQuery': { $eq: hashedQuery }
    })
  }
}
