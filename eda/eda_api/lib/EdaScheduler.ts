import { CachedQueryService } from './services/cache-service/cached-query.service';
import { MailingService } from './services/mailingService/mailing.service';
import { MailDashboardsController } from './services/dashboardToPDFService/mail-dashboards.controller';

import schedule from 'node-schedule';
const cache_config = require('../config/cache.config');
const mail_config  = require('../config/mailing.config');


export const initJobs = ()=> {
  // MailingService.mailingService();
  /**Cleanning cached queries */
  const cacheCleaner = schedule.scheduleJob(cache_config.CLEANNING_SCHEDULE, () => CachedQueryService.clean(cache_config.MAX_MILIS_STORED) );
  const cacheUpdater = schedule.scheduleJob(cache_config.UPDATING_SCHEDULE, () => CachedQueryService.updateQueries() );

  /**Check mail sending */
  const mailSender   = schedule.scheduleJob(mail_config.MAILING_SCHEDULE, () => MailingService.mailingService() );
  //MailingService.mailingService();
}

