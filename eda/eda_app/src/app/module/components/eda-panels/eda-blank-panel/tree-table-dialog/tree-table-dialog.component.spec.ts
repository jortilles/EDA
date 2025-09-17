import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TreeTableDialogComponent } from './tree-table-dialog.component';

describe('TreeTableDialogComponent', () => {
  let component: TreeTableDialogComponent;
  let fixture: ComponentFixture<TreeTableDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TreeTableDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TreeTableDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
