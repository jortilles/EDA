import { Directive, HostListener  } from '@angular/core';

@Directive({
  selector: '[appOnlySignsAndNumbers]'
})
export class OnlySignsAndNumbersDirective {

  constructor() { }

  @HostListener('input', ['$event'])
  onInput(event: any) {
    
    const valorFiltrado = event.target.value.replace(/[^0-9:.,]/g, '');

    // Verificar si el valor ha cambiado después del filtrado
    if (event.target.value !== valorFiltrado) {
      // Si hay caracteres no permitidos, actualiza el valor y detiene el evento
      event.target.value = valorFiltrado;
      event.stopPropagation(); // Evitar que el evento se propague si se detectan caracteres no válidos
    }
  }

}
