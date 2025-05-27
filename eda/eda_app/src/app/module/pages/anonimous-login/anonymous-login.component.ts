import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { User } from '@eda/models/model.index';
import { UserService, AlertService } from '@eda/services/service.index';
import Swal from 'sweetalert2';



@Component({
  selector: 'app-login',
  templateUrl: './anonymous-login.component.html'

})
export class AnonymousLoginComponent implements OnInit {

  private dashboardID: string;
  constructor(
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private alertService: AlertService, ) { }

  ngOnInit(): void {
    (this.route.paramMap.subscribe(
      params => {
        const dashboardID = params.get('dashboardID');
        const user = new User(null, 'edaanonim@jortilles.com', '_-(··)-_edanonymous_-(··)-_');
        this.userService.login(user, false).subscribe(
          () => this.router.navigate([`/v2/dashboard/${dashboardID}`],
          { queryParams:  Object.assign({}, this.route.snapshot.queryParams) }),
           err => Swal.fire('Error al iniciar sesión', err.text, 'error')
        );
      },
      err => this.alertService.addError(err)
    ))
   
  }

}
