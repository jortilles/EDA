const   express = require('express'),
        router = express.Router(),
        dashboard = require('../../controllers/dashboard/dashboard-controller'),
        authGuard = require('../../guard/auth-guard');

    router.get('', authGuard,  dashboard.findAll);

    router.get('/:id', authGuard, dashboard.findOne);

    router.post('', authGuard, dashboard.create);

    router.put('/:id', authGuard, dashboard.update);

    router.delete('/:id', authGuard, dashboard.delete);

module.exports = router;