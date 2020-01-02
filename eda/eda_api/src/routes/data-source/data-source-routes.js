const express = require('express'),
    router = express.Router(),
    global = require('../../controllers/global/index'),
    db_manager = require('../../controllers/db/main'),
    authGuard = require('../../guard/auth-guard');

// DataSource Routes
router.get('', authGuard, global.ds.getDataSources);

router.get('/names', authGuard, global.ds.getNamesDataSources);

router.get('/check-connection', authGuard, db_manager.check_db);

router.get('/:id', authGuard, global.ds.getDataSourceById);

router.post('/', authGuard, db_manager.generate_data_model);

router.post('/reload/:id', authGuard, db_manager.refreshDatamodel);

router.put('/:id', authGuard, global.ds.updateDataSource);

router.delete('/:id', authGuard, global.ds.deleteDataSource);


module.exports = router;