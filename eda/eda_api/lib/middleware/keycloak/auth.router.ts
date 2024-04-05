const router = require('express').Router();
import { UserController } from "module/admin/users/user.controller";
import {keycloak} from "./keycloak-config";
import { jwtDecode } from "jwt-decode";


//auth login
router.post('/',
    async (req,res, next) => {
      try {
        const accessToken =  await keycloak(req).accessToken.get();
        if (accessToken) {
          console.log(accessToken)
          const token = jwtDecode(accessToken)
          console.log(token)
          next();
        }         
      } catch (e) {
        res.redirect('/')
        console.log("usuario no disponible")
      }  
});


router.get('/redirect', (req,res) => {
  res.send("hi 2")
});

export default router;