# Frontend / Backend Boundary Review

Ten dokument zbiera wnioski z przeglądu `src/app` pod kątem podziału odpowiedzialności między frontendem i backendem.

Cel:
- wskazać, co koniecznie powinno zostać przeniesione na backend,
- odróżnić to od rzeczy, które sensownie mogą zostać na froncie,
- zaproponować kolejność zmian tak, żeby nie rozwalić działającego projektu.

## 1. Co koniecznie przenieść na backend

To są obszary, w których frontend pełni dziś rolę źródła prawdy dla domeny, oferty albo logiki produkcyjnej. To jest najdroższy technicznie rodzaj długu.

### 1.1. Słowniki domenowe i ofertowe

Do backendu powinny docelowo trafiać:
- typy szafek,
- typy otwierania,
- modele szuflad,
- materiały,
- dopuszczalne grubości,
- kolory,
- typy ścian, jeśli mają znaczenie biznesowe,
- metadane statusów projektu.

Dlaczego:
- zmiana oferty nie powinna wymagać deployu frontu,
- frontend i backend mogą się dziś rozjechać,
- słowniki są częścią konfiguracji biznesowej, nie tylko UI.

Najbardziej widoczne miejsca:
- [cabinet-constants.ts](/D:/IT/JAVA/Aplikacje/furniture-application/furniture-front/furniture-front/src/app/alone-cabinet/model/cabinet-constants.ts:5)
- [kitchen-cabinet-constants.ts](/D:/IT/JAVA/Aplikacje/furniture-application/furniture-front/furniture-front/src/app/kitchen/cabinet-form/model/kitchen-cabinet-constants.ts:5)
- [kitchen-cabinet-constants.ts](/D:/IT/JAVA/Aplikacje/furniture-application/furniture-front/furniture-front/src/app/kitchen/cabinet-form/model/kitchen-cabinet-constants.ts:200)
- [kitchen-project.model.ts](/D:/IT/JAVA/Aplikacje/furniture-application/furniture-front/furniture-front/src/app/kitchen/model/kitchen-project.model.ts:89)
- [kitchen-project.model.ts](/D:/IT/JAVA/Aplikacje/furniture-application/furniture-front/furniture-front/src/app/kitchen/model/kitchen-project.model.ts:103)

### 1.2. Workflow statusów projektu

Status projektu jest domeną backendu i tam powinny być utrzymywane:
- lista statusów,
- label,
- kolor lub semantyczny typ statusu,
- dozwolone przejścia,
- ewentualne reguły kto i kiedy może zmienić status.

Frontend powinien dostać gotowe metadane i je renderować.

Dlaczego:
- statusy są częścią procesu biznesowego,
- frontend nie powinien zgadywać semantyki workflow,
- nowe statusy bez zmian na froncie będą dziś problematyczne.

### 1.3. Constraints produktowe i walidacja domenowa

Te rzeczy powinny mieć źródło prawdy po stronie backendu:
- zakresy wymiarów dla typów szafek,
- dozwolone warianty konfiguracji,
- zależności typu: który cabinet może mieć jakie segmenty, jakie fronty, jakie modele,
- projektowe ustawienia graniczne, jeśli wynikają z oferty lub technologii.

Frontend może je cache’ować i używać do szybkiej walidacji formularza, ale nie powinien być ich właścicielem.

Dlaczego:
- to nie jest tylko walidacja UX, tylko wiedza technologiczna,
- backend i frontend mogą dziś akceptować różne dane,
- rozwój katalogu produktów będzie bardzo kosztowny, jeśli reguły są powielane.

Najbardziej widoczne miejsce:
- [kitchen-cabinet-constants.ts](/D:/IT/JAVA/Aplikacje/furniture-application/furniture-front/furniture-front/src/app/kitchen/cabinet-form/model/kitchen-cabinet-constants.ts:5)

### 1.4. Logika agregacji BOM i etykiet produkcyjnych

To jest dziś jeden z najbardziej backendowych fragmentów działających na froncie.

Do backendu powinno docelowo trafić:
- pełna agregacja BOM na poziomie projektu,
- grupowanie płyt, komponentów i prac,
- wyliczanie odpadu,
- budowanie etykiet technologicznych,
- remarks typu frezowanie, zawiasy, HDF groove,
- techniczne fallbacki dla nazw produkcyjnych.

Frontend powinien dostać gotowe DTO do wyświetlenia i eksportu.

Dlaczego:
- to jest logika produkcyjno-kosztowa, nie prezentacyjna,
- eksport i ekran szczegółów mogą się dziś rozjechać z backendowym wynikiem,
- im więcej wyjątków tu dołożysz, tym większe ryzyko regresji.

Najbardziej widoczne miejsce:
- [project-details-aggregator.service.ts](/D:/IT/JAVA/Aplikacje/furniture-application/furniture-front/furniture-front/src/app/kitchen/service/project-details-aggregator.service.ts:97)

### 1.5. Request building z dużą ilością reguł domenowych

`ProjectRequestBuilderService` robi sporo poprawnej pracy technicznej, ale zawiera też dużo wiedzy o:
- pozycjonowaniu,
- domyślnych wartościach domenowych,
- mapowaniu szczególnych przypadków per typ szafki,
- zachowaniu blatów, cokołów, obudów i segmentów.

Nie wszystko trzeba przenosić 1:1 na backend, ale backend powinien przejąć reguły, które są:
- krytyczne dla kalkulacji,
- zależne od oferty,
- trudne do utrzymania w dwóch miejscach.

Najbardziej widoczne miejsce:
- [project-request-builder.service.ts](/D:/IT/JAVA/Aplikacje/furniture-application/furniture-front/furniture-front/src/app/kitchen/service/project-request-builder.service.ts:38)

## 2. Co może zostać na froncie

Nie wszystko trzeba przepychać na serwer. Część rzeczy naturalnie należy do UI.

### 2.1. Stan ekranu i interakcje użytkownika

Na froncie powinny zostać:
- otwarte zakładki,
- aktywny panel,
- zaznaczenia w UI,
- loading states,
- chwilowe filtry i sortowanie list,
- stan dialogów,
- lokalne drafty formularza.

To są typowe odpowiedzialności frontu.

### 2.2. Walidacja “komfortowa”

Frontend może nadal robić:
- szybkie walidacje pól,
- blokowanie oczywistych błędów przed requestem,
- podpowiedzi dla użytkownika,
- disabled states,
- lokalne ostrzeżenia.

Ale:
- backend powinien być źródłem prawdy dla reguł,
- frontend powinien te reguły odczytywać, a nie wynajdywać samodzielnie.

### 2.3. Formatowanie i prezentacja

Na froncie sensownie mogą zostać:
- układ BOM na ekranie,
- sposób renderowania badge’y i tabel,
- lokalne sortowanie widoku,
- formatowanie daty i waluty,
- decyzje czysto wizualne.

### 2.4. Część geometrii i interakcji layoutowych

Jeśli użytkownik przeciąga, ustawia i komponuje układ kuchni w czasie rzeczywistym, to część logiki interakcyjnej musi zostać na froncie:
- drag/drop,
- przeliczanie pozycji pomocniczych do podglądu,
- highlight kolizji na żywo,
- reakcje formularza na zmianę typu szafki.

Ale wynik biznesowy tej geometrii powinien być finalnie potwierdzany i interpretowany przez backend.

## 3. Rekomendowana kolejność bez demolki

Nie polecam wielkiego refaktoru “wszystko naraz”. Tu lepsza będzie migracja warstwowa.

### Etap 1. Backend jako źródło słowników

Najpierw przenieś na backend:
- statusy projektu wraz z metadanymi,
- typy otwarcia,
- słowniki materiałów i kolorów,
- podstawowe katalogi opcji z `alone-cabinet` i `kitchen`.

Frontend w tym etapie:
- nadal może mieć fallback,
- ale powinien już umieć pobrać słowniki z API.

To da szybki zysk przy małym ryzyku.

### Etap 2. Backendowe constraints i reguły walidacyjne

Następnie wystaw z backendu:
- zakresy wymiarów,
- reguły wariantów,
- dopuszczalne konfiguracje per typ szafki,
- ograniczenia projektowe.

Frontend:
- przestaje utrzymywać twarde constraints jako jedyne źródło prawdy,
- używa kontraktu z API do walidacji formularzy.

To jest moment, w którym zaczynasz realnie zmniejszać ryzyko rozjazdu.

### Etap 3. Backendowy BOM view model

To najważniejszy krok biznesowy.

Dodaj endpoint albo rozszerz istniejący response tak, żeby backend zwracał:
- zagregowane boards,
- zagregowane components,
- zagregowane jobs,
- odpady,
- techniczne labelki i remarks gotowe do pokazania,
- brakujące ceny w formie gotowej do ostrzegania.

Wtedy frontend:
- przestaje sam budować BOM,
- robi tylko render i eksport.

To bardzo mocno odciąży `ProjectDetailsAggregatorService`.

### Etap 4. Ograniczenie frontendowej wiedzy w request builderach

Dopiero później porządkuj:
- `ProjectRequestBuilderService`,
- `KitchenStateService`,
- typ-specyficzne mapowanie żądań.

Tu celem nie jest od razu “frontend nic nie wie”, tylko:
- zmniejszyć liczbę twardych wyjątków,
- uprościć mapowanie,
- opierać się na backendowych słownikach i constraints.

### Etap 5. Sprzątanie legacy feature’ów

Na końcu zdecyduj co zrobić z:
- `alone-cabinet`,
- `cabinet-visualization`,
- `print-doc`.

To wygląda jak boczna, starsza gałąź architektury. Nie zaczynałbym od niej, chyba że biznesowo jest już martwa.

## 4. Priorytety

### Priorytet P1

- statusy projektu i metadane workflow,
- słowniki domenowe oferty,
- constraints i reguły walidacyjne,
- agregacja BOM po stronie backendu.

To są rzeczy, które najmocniej zmniejszą ryzyko rozjazdu front-back.

### Priorytet P2

- uproszczenie request builderów,
- ograniczenie frontendowych fallbacków nazw technologicznych,
- porządkowanie pricing warnings i DTO pod eksport.

### Priorytet P3

- legacy `alone-cabinet`,
- stary `print-doc`,
- boczne komponenty wizualizacyjne.

To warto zrobić, ale dopiero gdy rdzeń `kitchen` będzie miał lepszy podział odpowiedzialności.

## 5. Krótki werdykt

Największy problem tego frontu nie polega na tym, że jest “brzydko napisany”.

Największy problem polega na tym, że frontend jest dziś częściowo:
- katalogiem oferty,
- silnikiem walidacji domenowej,
- tłumaczem workflow,
- agregatorem BOM,
- i fragmentami nawet interpretatorem reguł produkcyjnych.

To jest za dużo jak na warstwę UI.

Najbardziej opłacalny kierunek to nie “wielki refaktor Angulara”, tylko stopniowe oddanie domeny z powrotem backendowi.
