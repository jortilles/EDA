import { HttpClient } from "@angular/common/http";
import { CommonModule } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { User } from "@eda/models/model.index";
import { UserService } from "@eda/services/service.index";

interface InfoResponse {
  info: {
    sinergiaDaVersion: string;
    edaApiVersion: string;
    edaApiPort: string;
    lastRebuildDate: string;
    sinergiaCRMDatabaseName: string;
    lastUpdateModelRun: string;
  };
}

/**
 * Component responsible for displaying information about the application, such as version details and last synchronization times.
 */
@Component({
  standalone: true,
  selector: "about-sda",
  imports: [CommonModule],
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.css"]
})
export class AboutSdaComponent implements OnInit {
  public lang: string;
  public user: User;
  public isAdmin: boolean;
  public sinergiaDaVersion: string = "XXXX";
  public edaApiVersion: string = "XXXX";
  public edaApiPort: string = "XXXX";
  public lastRebuildDate: string = "XXXX";
  public sinergiaCRMDatabaseName: string = "XXXX";
  public lastUpdateModelRun: string = "XXXX";

  constructor(
    private http: HttpClient,
    public userService: UserService
  ) {
    this.user = this.userService.getUserObject();
  }

  /**
   * OnInit lifecycle hook to initialize component data.
   * Fetches and sets application-related information such as version numbers and last synchronization details.
   */
  public ngOnInit(): void {
    this.user = this.userService.getUserObject();
    this.isAdmin = this.userService.isAdmin;

    // get lang
    let lang = window.location.pathname;
    lang = lang.replace(/[^a-zA-Z]/g, "");
    this.lang = lang || "es";

    // Fetches information from the backend and updates component properties accordingly.
    this.http.get<InfoResponse>(`/edapi/getsdainfo/getinfo?token=${this.userService.getToken()}`).subscribe({
      next: data => {
        this.sinergiaDaVersion = data.info.sinergiaDaVersion;
        this.edaApiVersion = data.info.edaApiVersion;
        this.edaApiPort = data.info.edaApiPort;
        this.lastRebuildDate = data.info.lastRebuildDate;
        this.lastUpdateModelRun = data.info.lastUpdateModelRun;
        // Conditionally displays the database name based on admin status.
        this.sinergiaCRMDatabaseName = this.userService.isAdmin ? data.info.sinergiaCRMDatabaseName : '';
      },
      error: error => {
        console.error("Error fetching information from the backend", error);
      }
    });
  }
}
