import { Component, OnInit } from '@angular/core';
import { User } from '@eda/models/model.index';
import { UserService, AlertService } from '@eda/services/service.index';

@Component({
    selector: 'app-profile',
    templateUrl: './profile.component.html'
})
export class ProfileComponent implements OnInit {
    public user: User;
    public imageUpload: File;
    public imageTemp: any;
    public newPassword : string;
    public newPasswordCheck : string;

    constructor(private userService: UserService,
                private alertService: AlertService) {
        this.user = this.userService.getUserObject();
    }

    ngOnInit() {}

    guardar(user: User) {
        this.user.name = user.name;
        if ( !this.user.google ) {
            this.user.email = user.email;
        }

        if(this.checkNewPasswords(this.newPassword, this.newPasswordCheck)){
            return this.alertService.addWarning($localize`:@@passwordValidation:Las contraseñas no coinciden`);
        }else{
            this.user.password = this.newPassword;
            this.userService.updateUser(this.user).subscribe(
                () => console.log('user updated'),
                err => this.alertService.addError(err)
            );
        }
    }

    selectImage(event: Event) {
        const input = event.target as HTMLInputElement;
        let file: File;

        if (input.files && input.files[0]) {
            file = input.files[0];
        }

        if (!file) {
            this.imageUpload = null;
            return;
        }

        if (file.type.indexOf('image') < 0) {
            this.alertService.addError($localize`:@@fileNotPicture:El archivo seleccionado no es una imagen`);
            this.imageUpload = null;
            return;
        }

        this.imageUpload = file;

        const reader = new FileReader();
        const urlImageTemp = reader.readAsDataURL(file);

        reader.onloadend = () => this.imageTemp = reader.result;
    }

    changeImage() {
        this.userService.changeImage( this.imageUpload, this.user._id, 'user' );
    }
    private checkNewPasswords(a:string, b:string){
        return a !== b;
    }
}
