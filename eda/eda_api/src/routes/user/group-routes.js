const express = require('express'),
    router = express.Router(),
    controller = require('../../controllers/user/group-controller'),
    authGuard = require('../../guard/auth-guard');


router.get('', authGuard, controller.findAll);

router.post('', authGuard, controller.createGroup);

router.put('', authGuard, controller.updateGroup);

router.delete('', authGuard, controller.deleteGroup);

module.exports = router;
