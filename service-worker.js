# D&D Initiative Tracker — wersja testowa

Prosta statyczna aplikacja PWA dla Mistrza Gry, przeznaczona do publikacji na GitHub Pages.

## Funkcje

- kafelki uczestników walki,
- automatyczne sortowanie według inicjatywy,
- ręczne rozstrzyganie remisów przyciskiem między kafelkami,
- edycja imienia, typu, inicjatywy i KP,
- dodawanie przeciwników,
- oznaczanie uczestników jako pokonanych,
- reset walki,
- zapis lokalny przez localStorage,
- działanie offline po publikacji jako PWA.

## Pliki

- `index.html` — struktura aplikacji
- `style.css` — wygląd
- `app.js` — logika aplikacji
- `manifest.json` — konfiguracja PWA
- `service-worker.js` — działanie offline
- `icons/` — ikony aplikacji

## Uwaga

Domyślne postacie graczy mają robocze nazwy i KP. Można je zmienić w aplikacji albo później bezpośrednio w kodzie.


## Zmiany w wersji testowej 2

- Kolory kafelków zależą od typu uczestnika: gracz, wróg, boss, NPC/sojusznik.
- Podczas edycji inicjatywy kafelek nie przeskakuje na nowe miejsce.
- Sortowanie listy po zmianie inicjatywy następuje dopiero po zakończeniu edycji.


## Zmiany w wersji testowej 3

- Domyślne postacie graczy to: Meepo, Ariah, Tulia i Mannon.
- Domyślne ikony graczy: sztylet, tarcza, łuk i błyskawica.
- Domyślna KP graczy wynosi 20.
- Nowo dodawane kafelki startują z KP 20.
- Klucz localStorage zmieniono na `dnd-initiative-tracker-v2`, żeby wersja testowa startowała ze świeżymi danymi domyślnymi.
