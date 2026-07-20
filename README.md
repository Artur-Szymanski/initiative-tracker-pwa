# D&D Initiative Tracker — v5

Prosta aplikacja PWA do śledzenia inicjatywy w D&D.

## Nowości w wersji 5

- Nowo dodana postać pojawia się na początku listy i od razu otwiera tryb edycji.
- Nowy kafelek pozostaje przypięty na górze do kliknięcia „Gotowe”.
- Po zakończeniu edycji kafelek trafia na właściwe miejsce według inicjatywy.
- Aktualna tura jest oznaczona grubą białą ramką.
- Aktywny kafelek ma przycisk przejścia do następnej tury.
- Po turze ostatniej postaci oznaczenie wraca do pierwszej.
- Licznik rund zwiększa się automatycznie przy przejściu z ostatniej postaci do pierwszej.
- Przed pierwszym użyciem przycisku następnej tury oznaczenie automatycznie wskazuje postać z najwyższą inicjatywą.
- Stan walki, aktualna tura oraz numer rundy są zapisywane w localStorage.

## Pozostałe funkcje

- Cztery domyślne postacie: Meepo, Ariah, Tulia i Mannon.
- Domyślna KP: 20.
- Kolory kafelków zależne od typu.
- Automatyczne sortowanie inicjatywy.
- Ręczne rozstrzyganie remisów.
- Oznaczanie uczestników jako pokonanych.
- Reset walki.
- Tryb PWA i działanie offline.


## Poprawka w wersji 6

- Pole Klasy Pancerza ma teraz zawsze kształt niewielkiej kapsułki.
- Nieaktywny kafelek nie rozciąga już pola KP do kształtu koła.
- Układ pola KP i przycisku następnej tury pozostaje poprawny również na wąskich ekranach.


## Poprawka w wersji 7

- Strzałka następnej tury i pole KP pozostają po prawej stronie także na wąskich ekranach.
- Usunięto przenoszenie prawej kolumny do drugiego wiersza.
- Na małych ekranach zmniejszane są odstępy, ikony i rozmiary tekstu.
- Kafelki są niższe i lepiej wykorzystują dostępną szerokość.
