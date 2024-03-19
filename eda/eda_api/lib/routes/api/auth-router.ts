const passport = require ('passport');
const router = require('express').Router();

//auth login
router.get('/login', (req,res) => {
    res.send("hi")
})

//auth google
router.get('/logingoogle', passport.authenticate(
    'google', {
        scope: ['profile']
    }
))

//callback route for google to redirect to
router.get('/logingoogle/redirect', 
    passport.authenticate('google'), (req,res) => {
        res.send("olrait")
}) 

//auth logout
router.get('/logout', (req,res) => {
    //aqui va passport
    res.send("logout")
})


export default router;