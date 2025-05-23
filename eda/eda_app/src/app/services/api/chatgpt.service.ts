import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatgptService extends ApiService{

  public chatGptRoute = '/chatgpt';

  responseChatGpt(message: string): Observable<any> {
    return this.post(`${this.chatGptRoute}/response`, {input: message})
  }

}
