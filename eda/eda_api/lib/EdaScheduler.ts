import { CachedQueryService } from './services/cache-service/cached-query.service';
import { MailingService } from './services/mailingService/mailing.service';
import { LogRotationService } from './services/log-rotation/log-rotation.service';
import { PluginRegistry } from './plugins';

import schedule from 'node-schedule';
const cache_config = require('../config/cache.config');
const mail_config  = require('../config/mailing.config');
const eda_api_config = require('../config/eda_api_config.js');


export const initJobs = ()=> {

  /**Cleanning cached queries */
  const cacheCleaner = schedule.scheduleJob(cache_config.CLEANNING_SCHEDULE, () => CachedQueryService.clean(cache_config.MAX_MILIS_STORED) );
  const cacheUpdater = schedule.scheduleJob(cache_config.UPDATING_SCHEDULE, () => CachedQueryService.updateQueries() );

  /**Plugin sync jobs — each plugin declares its own schedule expression */
  for (const plugin of PluginRegistry.getAll()) {
      if (plugin.syncService && plugin.scheduleExpression) {
          schedule.scheduleJob(plugin.scheduleExpression, () => plugin.syncService!.syncAll());
      }
  }

  /**Check mail sending */
  const mailSender = schedule.scheduleJob(mail_config.MAILING_SCHEDULE, () => MailingService.mailingService() );


  /**Archive yesterday's access log daily at midnight and empty it in place for the new day */
  const logRotator = schedule.scheduleJob(eda_api_config.log_rotation_schedule, () => LogRotationService.rotateAccessLog());

}

//console.log('Sending mails at the beggining');
//MailingService.mailingService();
