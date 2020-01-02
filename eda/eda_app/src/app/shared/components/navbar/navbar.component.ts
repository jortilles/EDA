import { Component, OnInit } from "@angular/core";
import { UserService } from "@eda_services/service.index";
import { User } from '@eda_models/model.index';

@Component({
    selector: "app-navbar",
    templateUrl: "./navbar.component.html",
    styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {

    user: User;

    constructor(
        public _userService: UserService
    ) {}

    ngOnInit() {
        this.user = this._userService.user;
    }

}
