import { Component } from '@angular/core';
import { MediaLibraryComponent } from '@eda/components/media-library/media-library.component';

@Component({
  selector: 'app-media-list',
  standalone: true,
  templateUrl: './media-list.page.html',
  styleUrls: ['./media-list.page.css'],
  imports: [MediaLibraryComponent]
})
export class MediaListPage { }
