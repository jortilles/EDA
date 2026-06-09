import { CachedQueryService } from './services/cache-service/cached-query.service';
import { MailingService } from './services/mailingService/mailing.service';
import { OdooSyncService } from './services/odoo/odoo-sync.service';
import { GA4SyncService } from './services/google-analytics/ga4-sync.service';

import schedule from 'node-schedule';
const cache_config = require('../config/cache.config');
const mail_config  = require('../config/mailing.config');


export const initJobs = ()=> {

  /**Cleanning cached queries */
  const cacheCleaner = schedule.scheduleJob(cache_config.CLEANNING_SCHEDULE, () => CachedQueryService.clean(cache_config.MAX_MILIS_STORED) );
  const cacheUpdater = schedule.scheduleJob(cache_config.UPDATING_SCHEDULE, () => CachedQueryService.updateQueries() );

  /**Odoo datasource sync — checks each minute; actual refresh governed by each datasource cache_config */
  const odooSync = schedule.scheduleJob(cache_config.ODOO_SYNC_SCHEDULE, () => OdooSyncService.syncAll() );

  /**Google Analytics 4 datasource sync */
  const ga4Sync = schedule.scheduleJob(cache_config.GA4_SYNC_SCHEDULE, () => GA4SyncService.syncAll() );

  /**Check mail sending */
  const mailSender = schedule.scheduleJob(mail_config.MAILING_SCHEDULE, () => MailingService.mailingService() );

}

