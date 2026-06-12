import { CachedQueryService } from './services/cache-service/cached-query.service';
import { MailingService } from './services/mailingService/mailing.service';
import { PluginRegistry } from './plugins';

import schedule from 'node-schedule';
const cache_config = require('../config/cache.config');
const mail_config  = require('../config/mailing.config');


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

  /**Plugin datasource syncs — each registered plugin with a syncService and scheduleExpression */
  for (const plugin of PluginRegistry.getAll()) {
      if (plugin.syncService && plugin.scheduleExpression) {
          schedule.scheduleJob(plugin.scheduleExpression, () => plugin.syncService.syncAll());
      }
  }

  /**Check mail sending */
  const mailSender = schedule.scheduleJob(mail_config.MAILING_SCHEDULE, () => MailingService.mailingService() );

}
