# Design: Draad TeamLeader AI Extensie

**Datum:** 2026-03-05
**Status:** Goedgekeurd

## Doel

Browser-extensie (Chrome/Firefox) voor de TeamLeader support-omgeving die via een popup de ticketconversatie uitleest, een AI-gegenereerde tekst toont als preview, en na goedkeuring het witte tekstveld op de pagina vult.

## Architectuur

Manifest V3 extensie met drie componenten:

- **popup.html / popup.js** — gebruikersinterface
- **content_script.js** — draait op de TeamLeader pagina, leest conversatie en injecteert tekst
- **background.js** — voert Claude API calls uit (omzeilt CORS-beperkingen)

## Data Flow

1. Gebruiker opent popup, typt optionele context
2. Popup stuurt bericht naar content_script.js
3. Content script leest ticketconversatie uit het DOM
4. Popup stuurt conversatie + context + mode naar background.js
5. Background.js roept Claude API aan
6. Resultaat komt terug in popup als preview
7. Gebruiker klikt "Plak in ticket"
8. Content script schrijft tekst in het witte tekstveld

## Popup UI

### Scherm 1 — Invoer
- Tekstveld: "Extra context (optioneel)"
- Knop: "Genereer" (label past aan op actieve mode)
- Tandwiel-icoon voor instellingen (API key)

### Scherm 2 — Preview
- Gegenereerde tekst in leesbaar vak
- Knop: "Plak in ticket" (injecteert tekst, sluit popup)
- Knop: "Opnieuw genereren"

### Instellingen
- API key invoer, opgeslagen in `chrome.storage.local`

## Mode Detectie

Content script detecteert actieve tab in TeamLeader ("Antwoord" / "Opmerking") via DOM-inspectie van de actieve knop.

| Mode | Actie |
|------|-------|
| Antwoord | Schrijf professioneel klantenservice antwoord in het Nederlands |
| Opmerking | Vat het ticket samen als interne notitie in het Nederlands |

## AI Integratie

- Model: `claude-sonnet-4-6`
- API call vanuit background service worker
- API key opgeslagen in `chrome.storage.local`
- Taal: altijd Nederlands

## Bestandsstructuur

```
draad-tl-extention/
  manifest.json
  background.js
  content_script.js
  popup/
    popup.html
    popup.js
    popup.css
  icons/
    icon16.png
    icon48.png
    icon128.png
  docs/
    plans/
      2026-03-05-teamleader-ai-extensie-design.md
```
