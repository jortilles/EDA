/*
Scheduler
*    *    *    *    *    *    
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    │
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)
 */


const MS_PER_MINUTE = 60000;
const MINUTES = 7 * 24 * 60;

module.exports = {

  UPDATING_SCHEDULE: '1 * * * *',               /* Schedule to check updates for cached queries */
  CLEANNING_SCHEDULE: '1 5 * * *',              /* Schedule to check removes for cached queries */
  MAX_MILIS_STORED: MINUTES * MS_PER_MINUTE,    /* Max miliseconds a cached query can be stored */
  DEFAULT_CACHE_CONFIG: {                       /* Default cache config when model is created   */
    units: 'days',
    quantity: 1,
    hours: '06',
    minutes: '00',
    enabled: true,
  },
  DEFAULT_NO_CACHE_CONFIG: {                       /* Default cache config when model is created   */
    units: '',
    quantity: null,
    hours: '',
    minutes: '',
    enabled: false,
  },
  MAX_STORED_ROWS : 5000

}