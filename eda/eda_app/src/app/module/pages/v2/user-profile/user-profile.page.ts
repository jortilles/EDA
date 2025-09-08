import { Component, inject, signal } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, type FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { UserService } from "@eda/services/service.index";
import { User } from "@eda/models/model.index";
import { SharedModule } from "@eda/shared/shared.module";

@Component({
  selector: "app-profile-edit",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
  ],
  templateUrl: "./user-profile.page.html",
})
export class UserProfilePage {
  public selectedImage = $localize`:@@selectedImage:Imagen seleccionada`;
  public noImageSelected = $localize`:@@noImageSelected:No hay imagen seleccionada`;
  
  private fb = inject(FormBuilder);
  private userService = inject(UserService);

  user: User;
  profileForm: FormGroup
  profileImage = signal<string | null>(null)
  isUploading = signal(false)
  activeTab = signal("email")
  imageUpload = signal<File | null>(null);
  imageTemp: any

  constructor() {
    this.initForm();
  }

  private initForm() {
    this.user = this.userService.getUserObject();
    
    if(this.user.img) {
      this.imageTemp='start';
      this.profileImage.set(this.user.img);
    }

    this.profileForm = this.fb.group(
      {
        username: [this.user.name||"", [Validators.required, Validators.minLength(2)]],
        email: this.user.google ?? [this.user.email||"", [Validators.required, Validators.email]],
        password: [""],
        confirmPassword: [""],
      },
      { validators: this.passwordMatchValidator },
    )
  }

  passwordMatchValidator(group: FormGroup) {
    const password = group.get("password")?.value
    const confirmPassword = group.get("confirmPassword")?.value

    if ((password && !confirmPassword) || (!password && confirmPassword)) {
      return { passwordMismatch: true }
    }

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true }
    }

    return null
  }

  onSubmit() {
    if (this.profileForm.valid) {
      console.log(this.profileForm.value)
    }
  }

  handleImageChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]

    if (file) {
      this.isUploading.set(true)
      // Simular carga
      setTimeout(() => {
        this.profileImage.set(URL.createObjectURL(file))
        this.imageTemp = 'success';
        this.isUploading.set(false)
        this.imageUpload.set(file);
      }, 1000)
    }

  }

  handleImageUpload() {
    if (this.profileImage()) {
      this.userService.changeImage( this.imageUpload(), this.user._id, 'user' );
    }
  }

  setActiveTab(tab: string) {
    this.activeTab.set(tab)
  }
}

