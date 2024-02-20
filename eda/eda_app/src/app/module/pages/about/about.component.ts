import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { User } from '@eda/models/model.index';
import { UserService } from "@eda/services/service.index";

/**
 * Component responsible for displaying information about the application, such as version details and last synchronization times.
 */
@Component({
  selector: "app-about",
  templateUrl: "./about.component.html",
  styleUrls: ["./about.component.css"]
})
export class AboutComponent implements OnInit {
  public lang: String;
  public user: User;
  public isAdmin: boolean;
  sinergiaDaVersion: string = "XXXX";
  edaApiVersion: string = "XXXX";
  edaApiPort: string = "XXXX";
  // edaAppVersion: string = "XXXX";
  lastRebuildDate: string = "XXXX";
  sinergiaCRMDatabaseName: string = "XXXX";
  lastUpdateModelRun: string = "XXXX";

  /**
   * Constructs the AboutComponent with injected services for HTTP requests and user services.
   *
   * @param http HttpClient for making requests.
   * @param userService UserService for accessing user-related functionalities.
   */
  constructor(
    private http: HttpClient,
    public userService: UserService,
  ) {
    this.user = this.userService.getUserObject();
  }

  /**
   * OnInit lifecycle hook to initialize component data.
   * Fetches and sets application-related information such as version numbers and last synchronization details.
   */
  ngOnInit(): void {
    this.user = this.userService.getUserObject();
    interface InfoResponse {
      info: {
        sinergiaDaVersion: string;
        // edaAppVersion: string;
        edaApiVersion: string;
        edaApiPort: string;
        lastRebuildDate: string;
        sinergiaCRMDatabaseName: string;
        lastUpdateModelRun: string;
      };
    }

    // get lang
    let lang = window.location.pathname;
    lang = lang.replace(/[^a-zA-Z]/g, "");
    this.lang = lang || "es";



    // Fetches information from the backend and updates component properties accordingly.
    this.http.get<InfoResponse>("/edapi/getsdainfo/getinfo").subscribe({
      next: data => {
        this.sinergiaDaVersion = data.info.sinergiaDaVersion;
        this.edaApiVersion = data.info.edaApiVersion;
        this.edaApiPort = data.info.edaApiPort;
        // this.edaAppVersion = data.info.edaAppVersion;
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
