import { Keycloak } from "keycloak-backend"
import { Request } from "express";




export const keycloak  = (req : Request ) => new Keycloak({
    realm: req.body.realm,
    keycloak_base_url: req.body.keycloak_base_url,
    client_id: req.body.client_id,
    client_secret: req.body.client_secret,
    username: req.body.username,
    password: req.body.password,
    is_legacy_endpoint: false

    })

