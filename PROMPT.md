
# Prompt zur Neuerstellung der Anwendung "SHK LagerMeister"

## 1. Grundkonzept & Ziel

**Ziel:** Erstelle eine voll funktionsfähige, responsive Webanwendung namens **SHK LagerMeister** zur Verwaltung von Lagerbeständen, Werkzeugen/Maschinen und Bestellprozessen für ein Handwerksunternehmen im Bereich Sanitär, Heizung, Klima (SHK).

**Primärer Tech-Stack:**
- **Framework:** Next.js (mit App Router)
- **Sprache:** TypeScript
- **UI-Bibliothek:** React mit ShadCN UI Komponenten
- **Styling:** Tailwind CSS
- **Datenbank & Authentifizierung:** Google Firebase (Firestore & Firebase Auth)
- **KI-Funktionen:** Genkit

---

## 2. Kernmodule und deren Funktionalität

Implementiere die folgenden Module als separate Seiten in der Anwendung. Die Navigation soll über eine Seitenleiste (Desktop) und ein ausklappbares Menü (Mobil) erfolgen.

### 2.1. Dashboard (`/dashboard`)
- **Zweck:** Eine zentrale Übersichtsseite mit den wichtigsten Kennzahlen und Aktivitäten.
- **Komponenten (Kacheln):**
    - **Maschinenstatus:** Zeigt verliehene, reservierte und in Reparatur befindliche Maschinen.
    - **Lager-Kennzahlen:** Kacheln für "Artikel unter Mindestbestand", "Angeordnete Bestellungen" und "Bestellte Artikel".
    - **Aktivitäten-Feed:** Getrennte Feeds für Aktivitäten im Hauptlager und in den Fahrzeugen.
    - **Inventurstatus:** Ein Diagramm, das anzeigt, wie viele Artikel aktuell, fällig oder überfällig für die Inventur sind.
- **Anpassbarkeit:** Benutzer sollen Kacheln ein-/ausblenden und auf dem Desktop per Drag & Drop neu anordnen können.

### 2.2. Lagerbestand (`/inventory-list`)
- **Zweck:** Hauptmodul zur Verwaltung aller Lagerartikel.
- **Funktionen:**
    - **Listenansicht:** Zeigt alle Artikel gruppiert nach ihrem Hauptlagerplatz (z. B. "Regal A"). Jede Gruppe ist einklappbar.
    - **Artikel anlegen/bearbeiten:** Ein Dialog zum Erfassen neuer oder Ändern bestehender Artikel mit allen relevanten Daten (Name, Hersteller-Art.-Nr., Lieferanten, Lagerorte, Bestände etc.).
    - **KI-Artikelerfassung:** Dialog soll eine Option bieten, Artikeldaten via URL oder Bild-Upload automatisch per KI (Genkit `analyzeItem` Flow) auszufüllen.
    - **Schnell-Buchung:** Direkt in der Listenansicht den Bestand eines Artikels erhöhen oder verringern.
    - **Etikettendruck:** Generierung und Druck/Download von QR-Code-Etiketten für Artikel und Lagerfächer. Der Dialog soll verschiedene Größen und anpassbare Textfelder bieten.
    - **Detailansicht:** Ein modales Fenster, das alle Details und den kompletten Änderungsverlauf eines Artikels anzeigt.
    - **Responsivität:** Auf Mobilgeräten wird die Tabelle zu einer Kartenansicht, in der jeder Artikel eine eigene Karte ist.

### 2.3. Maschinen (`/machines`)
- **Zweck:** Verwaltung des Fuhrparks an Werkzeugen und Maschinen.
- **Funktionen:**
    - **Status-Ansicht:** Zeigt alle Maschinen, gruppiert nach ihrem Status (Verfügbar, Verliehen, In Reparatur).
    - **Verleih & Rückgabe:** Ein einfacher Prozess (idealerweise per QR-Code-Scan), um zu erfassen, wer (Mitarbeiter, Kunde etc.) eine Maschine ausleiht und wann sie zurückkommt.
    - **Reservierungen:** Möglichkeit, Maschinen für zukünftige Zeiträume für bestimmte Kunden oder Projekte zu blockieren.
    - **Wartung:** Maschinen können als "in Reparatur" markiert werden, um eine Ausleihe zu verhindern.

### 2.4. Bestellungen (`/orders`)
- **Zweck:** Automatisierung und Verwaltung des Bestellprozesses.
- **Tabs:**
    - **Vorschläge:** Zeigt automatisch Artikel an, die den Mindestbestand unterschreiten, gruppiert nach Großhändler und Lagerort (Hauptlager, Fahrzeug etc.).
    - **Offen:** Zeigt Bestellungen, die als Entwurf vorbereitet oder bereits als "bestellt" markiert wurden.
    - **Kommissionierung:** Zeigt Artikel, die für Fahrzeugbestellungen im Lager eingetroffen sind und auf die Verladung warten.
- **Funktionen:**
    - Aus Vorschlägen eine Bestellung erstellen.
    - Bestellliste in die Zwischenablage kopieren.
    - Bestellungen als "bestellt" markieren.
    - Wareneingang für einzelne Positionen oder ganze Bestellungen buchen.
    - **KI-Lieferschein-Scanner:** Eine Funktion, die einen hochgeladenen oder fotografierten Lieferschein per OCR und KI (`analyzeDeliveryNote` Flow) analysiert, die Bestellnummer findet und die gelieferten Mengen automatisch mit der offenen Bestellung abgleicht.

### 2.5. Kommissionierung (`/commissioning`)
- **Zweck:** Erfassen und Verwalten von Kommissionen für Projekte oder Baustellen.
- **Funktionen:**
    - **Übersicht:** Zeigt alle aktiven Kommissionen als Karten an.
    - **Kommission erstellen:** Ein Dialog zum Anlegen einer neuen Kommission mit Auftragsnummer, Name und optionalen Notizen.
    - **Entnahme:** Ein Button pro Kommission (Funktionalität für die Entnahme von Artikeln wird in einem späteren Schritt implementiert).

### 2.6. Inventur (`/inventory`)
- **Zweck:** Schnelle und einfache Bestandsaufnahme.
- **Funktionen:**
    - **Scanner-Ansicht:** Nutzt die Gerätekamera, um QR-Codes oder Barcodes von Artikeln zu scannen.
    - **Bestand eingeben:** Nach dem Scan öffnet sich ein Dialog, um den gezählten Bestand einzugeben.
    - **Inventur-Assistent:** Eine Liste, die Artikel priorisiert, deren letzte Zählung am längsten zurückliegt.
    - **Bestenliste:** Zeigt an, welcher Benutzer im aktuellen Monat die meisten Artikel gezählt hat.
    - **Lagerort-Wechsel:** Ein einfacher Schalter, um zwischen dem Hauptlager und dem favorisierten Fahrzeuglager zu wechseln.

---

## 3. Datenstruktur & Datenbank

Nutze **Firebase Firestore** als Datenbank. Die Daten sollen in den folgenden Collections gespeichert werden. Die Struktur der Dokumente muss den Definitionen in der Datei `src/lib/types.ts` exakt entsprechen.

-   `/articles`: Speichert `InventoryItem`-Objekte.
-   `/machines`: Speichert `Machine`-Objekte.
-   `/users`: Speichert `User`-Objekte (inkl. Benutzereinstellungen wie `favoriteLocationId`).
-   `/locations`: Speichert `Location`-Objekte (Hauptlager, Fahrzeuge).
-   `/wholesalers`: Speichert `Wholesaler`-Objekte.
-   `/orders`: Speichert `Order`-Objekte.
-   `/commissions`: Speichert `Commission`-Objekte.
-   `/app_settings`: Ein einziges Dokument `global` zur Speicherung globaler Einstellungen wie API-Keys.

---

## 4. UI/UX & Design-Richtlinien

-   **Farbschema (ShadCN Theme `globals.css`):**
    -   **Primary:** Ein kühles Blaugrau (`#607D8B`) für ein professionelles Erscheinungsbild.
    -   **Background:** Ein helles Grau (`#ECEFF1`).
    -   **Accent:** Orange (`#FF9800`) zur Hervorhebung von Aktionen.
-   **Schriftart:** `PT Sans`.
-   **Icons:** `lucide-react`.
-   **Layout:**
    -   Verwende durchgehend ein responsives Design, das sich flüssig an alle Bildschirmgrößen anpasst (Flexbox & Grid).
    -   Auf Mobilgeräten sollen Tabellen in Listen von Karten umgewandelt werden.
    -   Lange Texte (z.B. Artikelnamen) müssen korrekt umgebrochen werden (`break-words`) und dürfen das Layout nicht sprengen.
-   **Komponenten:** Nutze die vordefinierten ShadCN UI-Komponenten (`Card`, `Button`, `Dialog`, `Table`, etc.).

---

## 5. Authentifizierung & Benutzer

-   **Firebase Auth:** Nutze Firebase Authentication.
-   **Benutzer-Auswahl:** Beim ersten Start der App muss ein Dialog erscheinen, der den Benutzer zwingt, ein Profil auszuwählen oder ein neues anzulegen. Der ausgewählte Benutzer bleibt für die Sitzung aktiv.
-   **Favoriten:** Benutzer können einen "Favoriten"-Benutzer festlegen, der beim Start automatisch ausgewählt wird.

---

## 6. Technische Implementierungsdetails

-   **State Management:** Nutze React Context (`AppContext`) als zentrale Anlaufstelle für alle globalen Daten und Funktionen.
-   **Datenabruf:** Verwende die bereitgestellten `useCollection` und `useDoc` Hooks für den Echtzeit-Datenabruf aus Firestore.
-   **Schreiboperationen:** Nutze die "non-blocking" Update-Funktionen (`setDocumentNonBlocking` etc.), um die UI reaktionsfähig zu halten.
-   **Offline-Fähigkeit:** Die Anwendung soll grundlegend offline-fähig sein, indem der Zustand aus dem LocalStorage geladen wird, bevor die Firebase-Verbindung steht. Ein visueller Indikator soll den Verbindungsstatus anzeigen.
-   **Fehlerbehandlung:** Implementiere eine robuste Fehlerbehandlung, insbesondere für Datenbankzugriffe und KI-Anfragen.

Dieser Prompt beschreibt die vollständigen Anforderungen, um die **SHK LagerMeister** Anwendung 1:1 zu replizieren.
