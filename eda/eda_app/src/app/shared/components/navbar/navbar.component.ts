import { Component, OnInit } from '@angular/core';
import { UserService } from '@eda/services/service.index';
import { User } from '@eda/models/model.index';
import { ImagePipe } from '../../pipes/image.pipe';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css'],
    standalone: true,
    imports: [RouterLink, FormsModule, ImagePipe]
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
