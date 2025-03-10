import { Component, OnInit, Input } from '@angular/core';

import { TreeNode } from 'primeng/api';
import { NodeService } from '../../../services/test/nodeservice';
import { TreeTableModule  } from 'primeng/treetable';

@Component({
  selector: 'app-eda-treetable',
  templateUrl: './eda-treetable.component.html',
  styleUrls: ['./eda-treetable.component.css'],
  standalone: true,
  imports: [TreeTableModule],
  providers: [NodeService]
})
export class EdaTreeTable implements OnInit {

  @Input() inject: any; // Podemos crear una clase para categorizar los valores

  files!: TreeNode[];

  constructor(private nodeService: NodeService) { }

  ngOnInit(): void {
    this.nodeService.getFilesystem().then((files) => (this.files = files));
  }

}
