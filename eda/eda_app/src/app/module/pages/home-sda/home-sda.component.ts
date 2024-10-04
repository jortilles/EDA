import { GroupService } from "../../../services/api/group.service";
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AlertService, DashboardService, SidebarService, StyleProviderService } from "@eda/services/service.index";
import { EdaDialogController, EdaDialogCloseEvent } from "@eda/shared/components/shared-components.index";
import { IGroup } from "@eda/services/api/group.service";
import Swal from "sweetalert2";
import * as _ from "lodash";

@Component({
  selector: "home-sda",
  templateUrl: "./home-sda.component.html",
  styleUrls: ["./home-sda.component.css"]
})
export class HomeSdaComponent implements OnInit {
  // Dashboard Management
  public dashController: EdaDialogController;
  public dss: any[];
  public allDashboards: Array<any> = [];
  public visibleDashboards: Array<any> = [];
  public createDashboard: boolean = false;

  // View Mode
  public viewMode: "table" | "card" = "table";

  // Sorting and Filtering
  public sortColumn: string = "config.title";
  public sortDirection: "asc" | "desc" = "asc";
  public filteringByName: boolean = false;
  public searchTerm: string = "";
  public lastSortCriteria: {
    column: string;
    direction: "asc" | "desc";
  };

  // User and Group Management
  public groups: IGroup[] = [];
  public isAdmin: boolean;
  public currentUser: any;
  public IsDataSourceCreator: boolean;
  public isObserver: boolean = false;
  public grups: Array<any> = [];

  // Tag Filtering
  public tags: Array<any> = [];
  public selectedTags: Array<any> = [];
  public filteredTags: Array<any> = [];
  public tagSearchTerm: string = "";
  public noTagLabel = $localize`:@@NoTag:Sin Etiqueta`;

  // Group Filtering
  public groupOptions: Array<any> = [];
  public selectedGroups: Array<any> = [];
  public filteredGroups: Array<any> = [];
  public groupSearchTerm: string = "";
  public noGroupLabel = $localize`:@@NoGroup:Sin Grupo`;

  // Dashboard Type Filtering
  public dashboardTypes: Array<{
    type: string;
    label: string;
    icon: string;
    color: string;
  }> = [
    {
      type: "shared",
      label: $localize`:@@Public:Público`,
      icon: "fa-circle",
      color: "#b4bc32"
    },
    {
      type: "public",
      label: $localize`:@@Common:Común`,
      icon: "fa-circle",
      color: "#add8e7"
    },
    {
      type: "group",
      label: $localize`:@@Group:Grupo`,
      icon: "fa-circle",
      color: "#ffd971"
    },
    {
      type: "private",
      label: $localize`:@@Private:Privado`,
      icon: "fa-circle",
      color: "#ee4e36"
    }
  ];

  // Type filtering
  public selectedTypes: Array<any> = [];
  public filteredTypes: Array<any> = [];
  public typeSearchTerm: string = "";

  // Dashboard Type Translations
  public dashboardTypeTranslations = {
    public: $localize`:@@Common:Común`,
    shared: $localize`:@@Public:Público`,
    group: $localize`:@@Group:Grupo`,
    private: $localize`:@@Private:Privado`
  };

  // Title Editing
  public showEditIcon: boolean = false;
  public isEditing: boolean = false;

  // Dashboard Type Editing
  public editingType: {
    [key: string]: boolean;
  } = {};
  public editingTypeId: string | null = null;

  constructor(
    // Services for managing dashboards and related operations
    private dashboardService: DashboardService,
    private sidebarService: SidebarService,
    private stylesProviderService: StyleProviderService,
    // Services for navigation and user feedback
    private router: Router,
    private alertService: AlertService,
    // Service for group management
    private groupService: GroupService
  ) {
    // Initialize data sources
    this.sidebarService.getDataSourceNames();
    this.sidebarService.getDataSourceNamesForDashboard();

    // Set default styles
    this.stylesProviderService.setStyles(this.stylesProviderService.generateDefaultStyles());

    // Set view mode from local storage or default to table view
    this.viewMode = (localStorage.getItem("preferredViewMode") as "table" | "card") || "table";

    this.filteredTypes = [...this.dashboardTypes];
  }

  /**
   * Initializes the component.
   */
  public ngOnInit() {
    this.init();
    this.ifAnonymousGetOut();
    this.setIsObserver();
    this.currentUser = JSON.parse(sessionStorage.getItem("user"));
  }

  /**
   * Initializes all necessary data for the component.
   */
  private init() {
    this.initDatasources();
    this.initDashboards();
    this.initTags();
    this.initGroups();
  }

  /**
   * Sets the isObserver flag based on the user's group membership.
   */
  private setIsObserver = async () => {
    this.groupService.getGroupsByUser().subscribe(
      res => {
        const user = sessionStorage.getItem("user");
        const userID = JSON.parse(user)._id;
        this.grups = res;
        this.isObserver =
          this.grups.filter(group => group.name === "EDA_RO" && group.users.includes(userID)).length !== 0;
          this.sidebarService.setIsObserver(this.isObserver);
      },
      err => this.alertService.addError(err)
    );
  };

  /**
   * Redirects anonymous users to the login page.
   */
  private ifAnonymousGetOut(): void {
    const user = sessionStorage.getItem("user");
    const userName = JSON.parse(user).name;

    if (userName === "edaanonim" || userName === "EDA_RO") {
      this.router.navigate(["/login"]);
    }
  }

  /**
   * Initializes datasources from the sidebar service.
   */
  private initDatasources(): void {
    this.sidebarService.currentDatasourcesDB.subscribe(
      data => (this.dss = data),
      err => this.alertService.addError(err)
    );
  }

  /**
   * Initializes dashboards, sets up groups, and performs initial filtering.
   */
  private initDashboards(): void {
    this.dashboardService.getDashboards().subscribe(
      res => {
        this.allDashboards = [
          ...res.publics.map(d => ({
            ...d,
            type: "public"
          })),
          ...res.shared.map(d => ({
            ...d,
            type: "shared"
          })),
          ...res.group.map(d => ({
            ...d,
            type: "group"
          })),
          ...res.dashboards.map(d => ({
            ...d,
            type: "private"
          }))
        ].sort((a, b) => (a.config.title > b.config.title ? 1 : b.config.title > a.config.title ? -1 : 0));

        this.groups = _.map(_.uniqBy(res.group, "group._id"), "group");
        console.log("Groups obtained from service:", this.groups);

        this.isAdmin = res.isAdmin;
        this.IsDataSourceCreator = res.isDataSourceCreator;

        this.initTags();
        this.initGroups();
        this.filterDashboards();

        this.setIsObserver();
      },
      err => this.alertService.addError(err)
    );
  }

  /**
   * Initializes the tags for filtering dashboards.
   */
  private initTags(): void {
    const uniqueTags = Array.from(new Set(this.allDashboards.map(db => db.config.tag))).sort();
    this.tags = [
      {
        value: null,
        label: this.noTagLabel
      },
      ...uniqueTags.map(tag => ({
        value: tag,
        label: tag
      }))
    ];
    this.filteredTags = [...this.tags];
  }

  /**
   * Initializes the groups for filtering dashboards.
   */
  private initGroups(): void {
    console.log("Starting initGroups");
    console.log("allDashboards:", this.allDashboards);

    const uniqueGroups = Array.from(
      new Set(
        this.allDashboards
          .filter(db => db.group && Array.isArray(db.group))
          .reduce((acc, db) => acc.concat(db.group.map(g => g.name)), [])
      )
    ).sort();

    console.log("Unique groups found:", uniqueGroups);

    this.groupOptions = [
      {
        value: null,
        label: this.noGroupLabel
      },
      ...uniqueGroups.map(group => ({
        value: group,
        label: group
      }))
    ];

    console.log("Group options:", this.groupOptions);

    this.filteredGroups = [...this.groupOptions];

    // Ensure groups are updated in the view
    this.filterGroups();
  }

  /**
   * Initializes the dialog for creating a new dashboard.
   */
  public initDialog(): void {
    this.dashController = new EdaDialogController({
      params: {
        dataSources: this.dss
      },
      close: (event, response) => {
        if (!_.isEqual(event, EdaDialogCloseEvent.NONE)) {
          this.initDashboards();
          this.goToDashboard(response);
        }
        this.dashController = undefined;
      }
    });
  }

  /**
   * Deletes a dashboard after user confirmation.
   * @param dashboard The dashboard to be deleted
   */
  public deleteDashboard(dashboard): void {
    let text = $localize`:@@deleteDashboardWarning:You are about to delete the report:`;
    Swal.fire({
      title: $localize`:@@Sure:Are you sure?`,
      text: `${text} ${dashboard.config.title}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: $localize`:@@ConfirmDeleteModel:Yes, delete it!`,
      cancelButtonText: $localize`:@@DeleteGroupCancel:Cancel`
    }).then(deleted => {
      if (deleted.value) {
        this.dashboardService.deleteDashboard(dashboard._id).subscribe(
          () => {
            // Remove the dashboard from allDashboards and visibleDashboards without reordering
            this.allDashboards = this.allDashboards.filter(d => d._id !== dashboard._id);
            this.visibleDashboards = this.visibleDashboards.filter(d => d._id !== dashboard._id);

            this.alertService.addSuccess($localize`:@@DashboardDeletedInfo:Report successfully deleted.`);
          },
          err => this.alertService.addError(err)
        );
      }
    });
  }

  /**
   * Navigates to a specific dashboard.
   * @param dashboard The dashboard to navigate to
   */
  public goToDashboard(dashboard): void {
    if (dashboard) {
      this.router.navigate(["/dashboard", dashboard._id]);
    } else {
      this.alertService.addError($localize`:@@ErrorMessage:An error has occurred`);
    }
  }

  /**
   * Gets a string of group names for a dashboard.
   * @param group Array of groups
   * @returns A string of group names separated by commas
   */
  public getGroupsNamesByDashboard(group: any[]): string {
    return group.map((elem: any) => elem.name).join(" , ");
  }

  /**
   * Filters tags based on the search term.
   */
  public filterTags() {
    this.filteredTags = this.tags.filter(tag => tag.label.toLowerCase().includes(this.tagSearchTerm.toLowerCase()));
  }

/**
 * Filters groups based on the search term.
 */
public filterGroups() {
  this.filteredGroups = this.groupOptions.filter(group => {
    // Verificar si group y group.label están definidos
    if (group && typeof group.label === 'string') {
      return group.label.toLowerCase().includes(this.groupSearchTerm.toLowerCase());
    }
    // Si group.label no es una cadena, no lo incluimos en los resultados filtrados
    return false;
  });
  console.log("Filtered groups:", this.filteredGroups);
}

  /**
   * Toggles the selection of a tag and updates the dashboard filter.
   * @param tag The tag to toggle
   */
  public toggleTagSelection(tag: any) {
    const index = this.selectedTags.findIndex(t => t.value === tag.value);
    if (index > -1) {
      this.selectedTags.splice(index, 1);
    } else {
      this.selectedTags.push(tag);
    }
    this.filterDashboards();
  }

  /**
   * Toggles the selection of a group and updates the dashboard filter.
   * @param group The group to toggle
   */
  public toggleGroupSelection(group: any) {
    const index = this.selectedGroups.findIndex(g => g.value === group.value);
    if (index > -1) {
      this.selectedGroups.splice(index, 1);
    } else {
      this.selectedGroups.push(group);
    }
    this.filterDashboards();
  }

  /**
   * Toggles the selection of a dashboard type and updates the dashboard filter.
   * @param type The type to toggle
   */
  public toggleTypeSelection(type: any) {
    const index = this.selectedTypes.findIndex(t => t.type === type.type);
    if (index > -1) {
      this.selectedTypes.splice(index, 1);
    } else {
      this.selectedTypes.push(type);
    }
    this.filterDashboards();
  }

  /**
   * Filters dashboards based on selected types, tags, and groups.
   */
  public filterDashboards() {
    // Reset visibleDashboards
    this.visibleDashboards = [...this.allDashboards];

    // Apply type filter
    if (this.selectedTypes.length > 0) {
      this.visibleDashboards = this.visibleDashboards.filter(db =>
        this.selectedTypes.some(type => type.type === db.type)
      );
    }

    // Apply tag filter
    if (this.selectedTags.length > 0) {
      this.visibleDashboards = this.visibleDashboards.filter(db =>
        this.selectedTags.some(tag => tag.value === db.config.tag || (tag.value === null && !db.config.tag))
      );
    }

    // Apply group filter
    if (this.selectedGroups.length > 0) {
      this.visibleDashboards = this.visibleDashboards.filter(db => {
        if (this.selectedGroups.some(group => group.value === null)) {
          return (
            !db.group ||
            db.group.length === 0 ||
            this.selectedGroups.some(
              group => group.value !== null && db.group && db.group.some(g => g.name === group.value)
            )
          );
        } else {
          return (
            db.group && db.group.some(g => this.selectedGroups.some(selectedGroup => selectedGroup.value === g.name))
          );
        }
      });
    }
  }

  /**
   * Filters dashboards based on the search term
   * @param event The input event containing the search term
   */
  public filterTitle(event: any) {
    this.searchTerm = event.target.value.toString().toUpperCase();
    this.applyCurrentFilters();
    this.filteringByName = this.searchTerm.length > 1;
  }

  /**
   * Checks if the current user can edit a dashboard
   * @param dashboard The dashboard to check
   * @returns Boolean indicating if the user can edit the dashboard
   */
  public canIEdit(dashboard): boolean {
    let result: boolean = false;
    result = this.isAdmin;
    if (result == false) {
      if (dashboard.config.onlyIcanEdit === true) {
        if (sessionStorage.getItem("user") == dashboard.user) {
          result = true;
        }
      } else {
        result = true;
      }
    }
    return result;
  }

  /**
   * Sorts the table based on the selected column
   * @param column The column to sort by
   */
  public sortTable(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }

    this.visibleDashboards.sort((a, b) => {
      let valueA = this.getNestedProperty(a, column);
      let valueB = this.getNestedProperty(b, column);

      // Special handling for creation date
      if (column === "config.createdAt") {
        valueA = valueA ? new Date(valueA).getTime() : 0;
        valueB = valueB ? new Date(valueB).getTime() : 0;
      }

      // Special handling for author
      if (column === "user.name") {
        valueA = valueA || "";
        valueB = valueB || "";
      }

      if (typeof valueA === "string") valueA = valueA.toLowerCase();
      if (typeof valueB === "string") valueB = valueB.toLowerCase();

      if (valueA < valueB) return this.sortDirection === "asc" ? -1 : 1;
      if (valueA > valueB) return this.sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }

  /**
   * Retrieves a nested property from an object
   * @param obj The object to retrieve the property from
   * @param path The path to the property
   * @returns The value of the nested property
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split(".").reduce((o, key) => (o && o[key] !== undefined ? o[key] : null), obj);
  }

  /**
   * Sets the view mode and saves it to local storage
   * @param mode The view mode to set
   */
  public setViewMode(mode: "table" | "card"): void {
    this.viewMode = mode;
    localStorage.setItem("preferredViewMode", mode);
  }

  /**
   * Gets the CSS class for a dashboard type
   * @param type The dashboard type
   * @returns The CSS class for the dashboard type
   */
  public getDashboardTypeClass(type: string): string {
    const dashboardType = this.dashboardTypes.find(t => t.type === type);
    return dashboardType ? `card-border-${dashboardType.type}` : "";
  }

  /**
   * Gets the color for a dashboard type
   * @param type The dashboard type
   * @returns The color for the dashboard type
   */
  public getDashboardTypeColor(type: string): string {
    const dashboardType = this.dashboardTypes.find(t => t.type === type);
    return dashboardType ? dashboardType.color : "";
  }

  /**
   * Clones a dashboard
   * @param dashboard The dashboard to clone
   */
  public cloneDashboard(dashboard: any): void {
    this.dashboardService.cloneDashboard(dashboard._id).subscribe(
      response => {
        if (response.ok && response.dashboard) {
          // Create a deep copy of the original dashboard
          const clonedDashboard = _.cloneDeep(dashboard);

          // Update the cloned dashboard data with the server response
          Object.assign(clonedDashboard, response.dashboard);

          // Ensure type and author are correctly assigned
          clonedDashboard.type = clonedDashboard.config.visible;
          clonedDashboard.user = this.currentUser;

          // Update creation and modification dates
          clonedDashboard.config.createdAt = new Date().toISOString();
          clonedDashboard.config.modifiedAt = new Date().toISOString();

          // Find the index of the original dashboard in both lists
          const allDashboardsIndex = this.allDashboards.findIndex(d => d._id === dashboard._id);
          const visibleDashboardsIndex = this.visibleDashboards.findIndex(d => d._id === dashboard._id);

          // Insert the cloned dashboard just after the original in both lists
          if (allDashboardsIndex !== -1) {
            this.allDashboards.splice(allDashboardsIndex + 1, 0, clonedDashboard);
          } else {
            this.allDashboards.push(clonedDashboard);
          }

          if (visibleDashboardsIndex !== -1) {
            this.visibleDashboards.splice(visibleDashboardsIndex + 1, 0, clonedDashboard);
          } else {
            this.visibleDashboards.push(clonedDashboard);
          }

          // Mark the dashboard as newly cloned
          clonedDashboard.isNewlyCloned = true;

          // Scroll to the cloned dashboard
          setTimeout(() => {
            const element = document.getElementById(`dashboard-${clonedDashboard._id}`);
            if (element) {
              element.scrollIntoView({
                behavior: "smooth",
                block: "center"
              });
            }
          }, 100);

          // Remove the newly cloned mark after 5 seconds
          setTimeout(() => {
            clonedDashboard.isNewlyCloned = false;
          }, 5000);

          this.alertService.addSuccess($localize`:@@REPORTCloned:Informe clonado correctamente`);
        } else {
          throw new Error($localize`:@@InvalidServerResponse:Respuesta inválida del servidor`);
        }
      },
      error => {
        console.error($localize`:@@ErrorCloningDashboard:Error al clonar el dashboard:`, error);
        Swal.fire(
          $localize`:@@Error:Error`,
          $localize`:@@CouldNotCloneReport:No se pudo clonar el informe. Por favor, inténtalo de nuevo.`,
          "error"
        );
      }
    );
  }

  /**
   * Copies the public URL of a shared dashboard to the clipboard
   * @param dashboard The dashboard whose URL to copy
   */
  public copyUrl(dashboard: any): void {
    if (dashboard.type === "shared") {
      const href = location.href;
      const baseURL = href.slice(0, href.indexOf('#'));

      const url = `${baseURL}#/public/${dashboard._id}`

      navigator.clipboard.writeText(url).then(
        () => {
          this.alertService.addSuccess($localize`:@@URLCopied:URL copiada al portapapeles`);
        },
        err => {
          console.error($localize`:@@ErrorCopyingURL:Error al copiar URL: `, err);
          this.alertService.addError($localize`:@@ErrorCopyingURL:Error al copiar la URL`);
        }
      );
    }
  }

  /**
   * Formats a date string or Date object to a localized string
   * @param date The date to format
   * @returns A formatted date string
   */
  public formatDate(date: string | Date): string {
    if (!date) return "";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleString("es-ES", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  /**
   * Handles the closing of the create dashboard dialog
   * @param event The event object from the dialog close
   */
  public onCloseCreateDashboard(event?: any): void {
    this.createDashboard = false;
    if (event) this.router.navigate(["/dashboard", event._id]);
  }

  /**
   * Starts the editing mode for a dashboard title
   * @param titleSpan The HTML element containing the title
   */
  public startEditing(titleSpan: HTMLElement): void {
    this.isEditing = true;
    setTimeout(() => {
      titleSpan.focus();
      // Place the cursor at the end of the text
      const range = document.createRange();
      range.selectNodeContents(titleSpan);
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }, 0);
  }

  /**
   * Updates the title of a dashboard
   * @param dashboard The dashboard to update
   * @param event The event object containing the new title
   */
  public updateDashboardTitle(dashboard: any, event: any): void {
    const newTitle = event.target.textContent.trim();
    this.isEditing = false;
    if (newTitle !== dashboard.config.title) {
      dashboard.config.title = newTitle;
      this.dashboardService
        .updateDashboardSpecific(dashboard._id, {
          data: {
            key: "config.title",
            newValue: newTitle
          }
        })
        .subscribe(
          () => {
            this.alertService.addSuccess(
              $localize`:@@DashboardTitleUpdated:Título del informe actualizado correctamente.`
            );
          },
          error => {
            this.alertService.addError(
              $localize`:@@ErrorUpdatingDashboardTitle:Error al actualizar el título del informe.`
            );
            console.error("Error updating dashboard title:", error);
          }
        );
    }
  }

  /**
   * Applies the current filters to the dashboard list
   */
  private applyCurrentFilters(): void {
    // Apply type, tag, and group filters
    this.filterDashboards();

    // Apply text filter if it exists
    if (this.searchTerm && this.searchTerm.length > 1) {
      this.visibleDashboards = this.visibleDashboards.filter(
        db => db.config.title.toUpperCase().indexOf(this.searchTerm) >= 0
      );
    }
  }

  /**
   * Starts the editing mode for a dashboard type
   * @param dashboard The dashboard to edit
   */
  public startEditingType(dashboard: any): void {
    this.editingTypeId = dashboard._id;
  }

  /**
   * Updates the type of a dashboard
   * @param dashboard The dashboard to update
   * @param newType The new type for the dashboard
   */
  public updateDashboardType(dashboard: any, newType: string): void {
    const oldType = dashboard.type;
    dashboard.type = newType;
    dashboard.config.visible = newType;

    this.dashboardService
      .updateDashboardSpecific(dashboard._id, {
        data: {
          key: "config.visible",
          newValue: newType
        }
      })
      .subscribe(
        () => {
          this.alertService.addSuccess($localize`:@@DashboardTypeUpdated:Tipo de informe actualizado correctamente.`);
          this.editingTypeId = null;
        },
        error => {
          this.alertService.addError($localize`:@@ErrorUpdatingDashboardType:Error al actualizar el tipo de informe.`);
          dashboard.type = oldType;
          dashboard.config.visible = oldType;
          console.error("Error updating dashboard type:", error);
        }
      );
  }

  /**
   * Cancels the editing of a dashboard type
   */
  public cancelEditingType(): void {
    this.editingTypeId = null;
  }

  public filterTypes() {
    this.filteredTypes = this.dashboardTypes.filter(type =>
      type.label.toLowerCase().includes(this.typeSearchTerm.toLowerCase())
    );
  }

  public clearTagFilter() {
    this.selectedTags = [];
    this.filterDashboards();
  }

  public clearGroupFilter() {
    this.selectedGroups = [];
    this.filterDashboards();
  }

  public clearTypeFilter() {
    this.selectedTypes = [];
    this.filterDashboards();
  }
}
