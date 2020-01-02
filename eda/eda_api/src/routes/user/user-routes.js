const express = require('express'),
    router = express.Router(),
    controller = require('../../controllers/user/user-controller'),
    authGuard = require('../../guard/auth-guard');



// Login routes
router.post('', controller.create);

router.post('/login', controller.login);

router.get('/refresh-token', authGuard, controller.refreshToken);

// User routes
router.get('', authGuard, controller.findAll);

router.get('/profile-img/:img', authGuard, controller.findProfileImg);

router.get('/:id', authGuard, controller.getUser);
    
router.put('/:id', authGuard, controller.update);

router.delete('/:id', authGuard, controller.delete);

module.exports = router;
