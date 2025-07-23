# TimbrApp Extension 

Developed by **Gianni F. _fvlgnn_**

Work Time Clock-in/out Reminder - Chrome & Edge Extension / Promemoria Timbratura Presenza sul Lavoro - Estensione per Chrome & Edge

![TimbrApp Extension](https://raw.githubusercontent.com/fvlgnn/timbrapp-extension/main/timbrapp-extension-logo.png "TimbrApp Extension Logo")

![TimbrApp Extension Release and Deploy](https://github.com/fvlgnn/timbrapp-extension/actions/workflows/main.yml/badge.svg?event=push "TimbrApp Extension Release and Deploy Status")

- [Releases/Versioni](https://github.com/fvlgnn/timbrapp-extension/releases) (developer mode / modalità sviluppatore)
- ~~[Chrome Web Store](link-chrome-web-store)~~ (Coming Soon / Prossimamente)
- ~~[Edge Add-ons](link-edge-addons)~~ (Coming Soon / Prossimamente)


## Menu

- [TimbrApp Extension](#timbrapp-extension)
  - [Menu](#menu)
  - [English 🇬🇧](#english-)
    - [Description](#description)
    - [Features](#features)
    - [Installation](#installation)
      - [1a. Developer Mode](#1a-developer-mode)
      - [1b. ~~Installation from Store~~ (Coming Soon)](#1b-installation-from-store-coming-soon)
      - [2. Configure the Icon (Important!)](#2-configure-the-icon-important)
      - [3. Updating the Extension (Developer Mode)](#3-updating-the-extension-developer-mode)
    - [Usage](#usage)
    - [Privacy](#privacy)
    - [Contributing](#contributing)
    - [Disclaimer](#disclaimer)
  - [Italiano 🇮🇹](#italiano-)
    - [Descrizione](#descrizione)
    - [Funzionalità](#funzionalità)
    - [Installazione](#installazione)
      - [1a. Modalità sviluppatore](#1a-modalità-sviluppatore)
      - [1b. ~~Installazione da Store~~ (Prossimamente)](#1b-installazione-da-store-prossimamente)
      - [2. Configura l'icona (Importante!)](#2-configura-licona-importante)
      - [3. Aggiornamento dell'estensione (Modalità Sviluppatore)](#3-aggiornamento-dellestensione-modalità-sviluppatore)
    - [Utilizzo](#utilizzo)
    - [Privacy](#privacy-1)
    - [Contribuisci](#contribuisci)
    - [Dichiarazione di non responsabilità](#dichiarazione-di-non-responsabilità)
  - [License](#license)


## English 🇬🇧

### Description

TimbrApp Extension is a Chrome and Edge extension that helps you remember to clock in and out at work.

### Features

* **Reminders**: Receive a reminder when it's time to clock in or out.

### Installation

TimbrApp Extension can be installed in two ways: in developer mode (for now) or through the official stores (coming soon).

#### 1a. Developer Mode

1.  **Download the extension:**
    *   Download the latest version of [TimbrApp Extension](https://github.com/fvlgnn/timbrapp-extension/releases/latest) from the GitHub repository.
    *   Unzip the file to a folder that you will not delete or move later (e.g., `~/Documents/timbrapp-extension`).

2.  **Enable developer mode:**
    *   Open Google Chrome or Microsoft Edge.
    *   Type `chrome://extensions` in the address bar and press Enter, or click on the puzzle icon and select "Manage extensions".
    *   Turn on the "Developer mode" switch in the upper right corner (or in the sidebar for Edge).

3.  **Load the uncompressed extension:**
    *   Click on the "Load unpacked" button.
    *   Select the `timbrapp-extension` folder containing the unzipped files.

4.  **Verify the installation:**
    *   The TimbrApp Extension should now be visible on the extensions page.
    *   If the extension was loaded correctly, you should see its icon in the browser toolbar.

#### 1b. ~~Installation from Store~~ (Coming Soon)

The extension will soon be available on the Chrome Web Store and Edge Add-ons.

1.  ~~Open the [Chrome Web Store](https://www.google.com/search?q=timbrapp-extension) or [Edge Add-ons](https://www.google.com/search?q=timbrapp-extension).~~
2.  ~~Search for `TimbrApp Extension`.~~
3.  ~~Click on "Add to Chrome" or "Add to Edge".~~

#### 2. Configure the Icon (Important!)

The TimbrApp Extension icon must always be visible in the browser toolbar to allow you to view clock-in reminders. If the icon is not visible, you will not know when it is time to clock in! To configure the icon, follow these steps:

*   Click on the extensions icon (usually a puzzle piece) in the address bar.
*   Find TimbrApp Extension in the drop-down menu.
*   **At this point, it is crucial to make the icon always visible:** Click on the pin icon next to TimbrApp Extension to "pin" it to the toolbar. This way, the icon will always be within reach and you can immediately view the reminders (indicated by a red badge).

#### 3. Updating the Extension (Developer Mode)

To update TimbrApp Extension to the latest version, follow these steps:

1.  **Download the latest version:**
    *   Visit the [releases page](https://github.com/fvlgnn/timbrapp-extension/releases/latest) on the GitHub repository.
    *   Download the ZIP file of the latest available version.

2.  **Replace the existing folder:**
    *   Unzip the ZIP file.
    *   Copy or move the unzipped files to the folder where you previously extracted the extension (e.g., `~/Documents/timbrapp-extension`).
    *   Overwrite the existing files with those from the new version.

3.  **Reload the extension:**
    You have three ways to reload the updated extension:

    *   **Restart the browser:** Completely close Google Chrome or Microsoft Edge and restart it.
    *   **Reload from the extensions page:**
        *   Type `chrome://extensions` in the address bar and press Enter.
        *   Find TimbrApp Extension in the list.
        *   Click the refresh icon (a circular arrow) next to the extension.
    *   **Update all extensions (Chrome):**
        *   On the `chrome://extensions` page, click the "Update" button in the upper right corner.

This will update your TimbrApp Extension to the latest version.

### Usage

1.  **Set reminders:**
    *   Make sure that the TimbrApp Extension icon in the toolbar does not have a red badge.
    *   Click on the TimbrApp Extension icon to open the settings.
    *   Configure the times you want to receive the reminder.
    *   Customize additional options: set the HR portal URL to open when clicking, choose your "Do Not Disturb" days, and decide where to display the alert banner (on all pages or only the active one).

2.  **Receive reminders:**
    *   When it is time to clock in, a red badge with a triangle will appear on the extension icon.
    *   Additionally, for an even more noticeable reminder, a yellow banner may appear on the pages you are viewing. However, the appearance of this banner is not guaranteed on all pages.
    *   You may also receive a notification from your operating system (if enabled and supported by your operating system).

3.  **Clock in:**
    *   Click on the notification or the extension icon with the **red badge**.
        *   **If the URL of the HR portal has been set**, TimbrApp Extension will open it for you.
        *   **If the URL of the HR portal has NOT been set**, you will have to manually clock in on the device. **Important:** Remember to click on the notification or the icon after clocking in to reset the reminder.

### Privacy

**Your privacy is a priority!** TimbrApp Extension is designed with user privacy in mind:

*   **Local Data:** All settings and data necessary for TimbrApp Extension to function are saved locally within your browser. No information is transmitted or shared with anyone!
*   **No data collection:** The extension does not collect any personal data, nor information about your browsing activity.
*   **No external services:** TimbrApp does not use remote services or scripts for its operation.
*   **No data transmission:** The extension does not transmit any information to third parties.
*   **Security guaranteed:** TimbrApp is a secure extension that does not compromise your privacy.

This extension's single purpose is to help users remember to clock in and out for work. It provides configurable, time-based reminders to prevent missed time-tracking entries. All features directly support this unique core purpose.

### Contributing

If you'd like to contribute to the development of TimbrApp Extension, please visit the repository on [GitHub](https://github.com/fvlgnn/timbrapp-extension).

### Disclaimer

The TimbrApp Extension extension is provided "as is", without any explicit or implicit warranty. The developer assumes no responsibility for any missed clock-ins or clock-outs, whether caused by software bugs, incorrect user configuration, computer problems, operating system issues, browser issues, or any other cause.

The user is solely responsible for correctly clocking in and out at work. TimbrApp Extension is a support tool and does not in any way replace company clock-in procedures.


## Italiano 🇮🇹

### Descrizione

TimbrApp Extension è un'estensione per Chrome e Edge che ti aiuta a ricordare di timbrare la tua presenza al lavoro.

### Funzionalità

*   **Promemoria**: Ricevi un promemoria quando è ora di timbrare.

### Installazione

TimbrApp Extension può essere installata in due modi: in modalità sviluppatore (per ora) o tramite gli store ufficiali (prossimamente).

#### 1a. Modalità sviluppatore

1.  **Scarica l'estensione:**
    *   Scarica l'ultima versione di [TimbrApp Extension](hhttps://github.com/fvlgnn/timbrapp-extension/releases/latest) dal repository GitHub.
    *   Decomprimi il file zip in una cartella che non eliminerai o sposterai in seguito (ad esempio, `~/Documenti/timbrapp-extension`).

2.  **Abilita la modalità sviluppatore:**
    *   Apri Google Chrome o Microsoft Edge.
    *   Digita `chrome://extensions` nella barra degli indirizzi e premi Invio, oppure clicca sull'icona del puzzle e seleziona "Gestisci estensioni".
    *   Attiva l'interruttore "Modalità sviluppatore" in alto a destra (o nella barra laterale per Edge).

3.  **Carica l'estensione decompressa:**
    *   Clicca sul pulsante "Carica estensione non compressa".
    *   Seleziona la cartella `timbrapp-extension` contenente i file decompressi.

4.  **Verifica l'installazione:**
    *   L'estensione TimbrApp Extension dovrebbe ora essere visibile nella pagina delle estensioni.
    *   Se l'estensione è stata caricata correttamente, dovresti vedere la sua icona nella barra degli strumenti del browser.

#### 1b. ~~Installazione da Store~~ (Prossimamente)

L'estensione sarà presto disponibile sul Chrome Web Store e su Edge Add-ons.

1.  ~~Apri il [Chrome Web Store](https://www.google.com/search?q=timbrapp-extension) o [Edge Add-ons](https://www.google.com/search?q=timbrapp-extension).~~
2.  ~~Cerca `TimbrApp Extension`.~~
3.  ~~Clicca su "Aggiungi a Chrome" o "Aggiungi a Edge".~~

#### 2. Configura l'icona (Importante!)

L'icona di TimbrApp Extension deve essere sempre visibile nella barra degli strumenti del browser per consentirti di visualizzare i promemoria di timbratura. Se l'icona non è visibile, non potrai sapere quando è ora di timbrare! Per configurare l'icona, segui questi passaggi:

*   Clicca sull'icona delle estensioni (solitamente un puzzle) nella barra degli indirizzi.
*   Trova TimbrApp Extension nel menu a tendina.
*   **A questo punto, è fondamentale rendere l'icona sempre visibile:** Clicca sull'icona a forma di spillo accanto a TimbrApp Extension per "fissarla" nella barra degli strumenti. In questo modo, l'icona sarà sempre a portata di click e potrai visualizzare immediatamente i promemoria (indicati con un badge rosso).

#### 3. Aggiornamento dell'estensione (Modalità Sviluppatore)

Per aggiornare TimbrApp Extension alla versione più recente, segui questi passaggi:

1.  **Scarica l'ultima versione:**
    *   Visita la pagina delle [release](https://github.com/fvlgnn/timbrapp-extension/releases/latest) sul repository di GitHub.
    *   Scarica il file ZIP dell'ultima versione disponibile.

2.  **Sostituisci la cartella esistente:**
    *   Decomprimi il file ZIP.
    *   Copia o sposta i file decompressi nella cartella in cui hai precedentemente estratto l'estensione (ad esempio, `~/Documents/timbrapp-extension`).
    *   Sovrascrivi i file esistenti con quelli della nuova versione.

3.  **Ricarica l'estensione:**
    Hai tre modi per ricaricare l'estensione aggiornata:

    *   **Riavvia il browser:** Chiudi completamente Google Chrome o Microsoft Edge e riavvialo.
    *   **Ricarica dalla pagina delle estensioni:**
        *   Digita `chrome://extensions` nella barra degli indirizzi e premi Invio.
        *   Trova TimbrApp Extension nell'elenco.
        *   Clicca sull'icona di aggiornamento (una freccia circolare) accanto all'estensione.
    *   **Aggiorna tutte le estensioni (Chrome):**
        *   Nella pagina `chrome://extensions`, clicca sul pulsante "Aggiorna" in alto a destra.

In questo modo, la tua estensione TimbrApp Extension sarà aggiornata all'ultima versione.

### Utilizzo

1.  **Imposta i promemoria:**
    *   Assicurati che l'icona di TimbrApp Extension nella barra degli strumenti non abbia un badge rosso.
    *   Clicca sull'icona di TimbrApp Extension per aprire le impostazioni.
    *   Configura gli orari in cui vuoi ricevere il promemoria.
    *   Personalizza le opzioni aggiuntive: imposta l'URL del portale HR da aprire al click, scegli i giorni per la modalità "Non Disturbare" e decidi dove visualizzare il banner di avviso (su tutte le pagine o solo su quella attiva).

2.  **Ricevi i promemoria:**
    *   Quando è ora di timbrare, sull'icona dell'estensione comparirà un badge rosso con un triangolo.
    *   Inoltre, per un promemoria ancora più evidente, potrebbe apparire un banner di colore giallo sulle pagine che stai visualizzando. Tuttavia la comparsa di questo banner non è garantita su tutte le pagine.
    *   Potresti anche ricevere una notifica dal tuo sistema operativo (se abilitata e se supportato dal tuo sistema operativo).

3.  **Timbra:**
    *   Clicca sulla notifica o sull'icona dell'estensione con il **badge rosso**.
        *   **Se è stato impostato l'URL del portale HR**, TimbrApp Extension lo aprirà per te.
        *   **Se NON è stato impostato l'URL del portale HR**, dovrai andare a timbrare manualmente sul dispositivo. **Importante:** Ricordati di cliccare sulla notifica o sull'icona dopo aver timbrato per resettare il promemoria.

### Privacy

**La tua privacy è una priorità!** TimbrApp Extension è stata progettata nel rispetto della privacy degli utenti:

*   **Dati locali:** Tutte le impostazioni e i dati necessari per il funzionamento di TimbrApp Extension sono salvati localmente nel tuo browser. Nessuna informazione viene trasmessa o condivisa con nessuno!
*   **Nessuna raccolta dati:** L'estensione non raccoglie alcun tipo di dato personale, né informazioni relative alla tua attività di navigazione.
*   **Nessun servizio esterno:** TimbrApp Extension non utilizza servizi o script remoti per il suo funzionamento.
*   **Nessuna trasmissione di dati:** L'estensione non trasmette alcuna informazione a terze parti.
*   **Sicurezza garantita:** TimbrApp Extension è un'estensione sicura che non mette a rischio la tua privacy.

L'unico scopo di questa estensione è aiutare gli utenti a ricordare di timbrare l'entrata e l'uscita dal lavoro. Fornisce promemoria configurabili basati sull'orario per prevenire mancate registrazioni. Tutte le funzionalità supportano direttamente questo unico scopo principale.

### Contribuisci

Se vuoi contribuire allo sviluppo di TimbrApp Extension, visita il repository su [GitHub](https://github.com/fvlgnn/timbrapp-extension).

### Dichiarazione di non responsabilità

L'estensione TimbrApp Extension è fornita "così com'è", senza alcuna garanzia esplicita o implicita. Lo sviluppatore non si assume alcuna responsabilità per eventuali mancate timbrature, siano esse causate da bug del software, errata configurazione da parte dell'utente, problemi con il computer, il sistema operativo, il browser o qualsiasi altra causa.

L'utente è l'unico responsabile della corretta timbratura della propria presenza al lavoro. TimbrApp Extension è uno strumento di supporto e non sostituisce in alcun modo le procedure di timbratura aziendali.


## License

Released under the [MIT License](https://raw.githubusercontent.com/fvlgnn/timbrapp-extension/main/LICENSE) - Copyright (c) 2025 Gianni F. _fvlgnn_
