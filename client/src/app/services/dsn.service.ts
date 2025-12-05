import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface DsnContact {
  spacecraft: string;
  spacecraftId: string;
  station: string;
  dish: string;
  rtltSeconds: number | null;
  uplegRangeKm: number | null;
  downlinkRate: number | null;
  snrDb: number | null;
  band: string | null;
  updatedAt: string | null;
  activity?: string | null;
}

@Injectable({ providedIn: 'root' })
export class DsnService {
  private readonly url = 'https://eyes.nasa.gov/dsn/data/dsn.xml';

  constructor(private http: HttpClient) {}

  /**
   * Récupère l’état courant du Deep Space Network (DSN Now) et filtre
   * uniquement les contacts utiles (VGR1/VGR2).
   */
  getContacts(): Observable<DsnContact[]> {
    return this.http.get(this.url, { responseType: 'text' }).pipe(
      map((xml) => this.parseXml(xml))
    );
  }

  private parseXml(xml: string): DsnContact[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');

    const contacts: DsnContact[] = [];
    let currentStationName = '';

    const children = Array.from(doc.documentElement.childNodes);
    for (const node of children) {
      if (node.nodeType !== Node.ELEMENT_NODE) {
        continue;
      }

      const el = node as Element;
      if (el.tagName === 'station') {
        currentStationName = el.getAttribute('friendlyName') || el.getAttribute('name') || '';
      } else if (el.tagName === 'dish') {
        const dishName = el.getAttribute('name') || '';
        const activity = el.getAttribute('activity') || null;
        const targets = Array.from(el.getElementsByTagName('target'));

        for (const target of targets) {
          const spacecraft = target.getAttribute('name') || '';
          const spacecraftId = target.getAttribute('id') || '';
          if (!spacecraft.toUpperCase().includes('VGR') && spacecraftId !== '31' && spacecraftId !== '32') {
            continue;
          }

          const rtlt = this.parseNumber(target.getAttribute('rtlt'));
          const range = this.parseNumber(target.getAttribute('downlegRange') ?? target.getAttribute('uplegRange'));

          const downSignal = el.querySelector('downSignal');
          const dataRate = this.parseNumber(downSignal?.getAttribute('dataRate'));
          const snrDb = this.parseNumber(downSignal?.getAttribute('power'));
          const band = downSignal?.getAttribute('band') || null;

          contacts.push({
            spacecraft,
            spacecraftId,
            station: currentStationName,
            dish: dishName,
            rtltSeconds: rtlt,
            uplegRangeKm: range,
            downlinkRate: dataRate,
            snrDb,
            band,
            updatedAt: this.extractTimestamp(el),
            activity
          });
        }
      }
    }

    return contacts;
  }

  private parseNumber(value: string | null | undefined): number | null {
    if (!value) {
      return null;
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  private extractTimestamp(el: Element): string | null {
    let parent: Element | null = el;
    while (parent && parent.tagName !== 'station') {
      parent = parent.parentElement;
    }
    const ts = parent?.getAttribute('timeUTC');
    if (!ts) {
      return null;
    }
    const n = Number(ts);
    if (!Number.isFinite(n)) {
      return null;
    }
    return new Date(n).toISOString();
  }
}
