# Draad TL AI Assistent

Browser-extensie (Chrome/Firefox) voor de TeamLeader support-omgeving. Leest automatisch de ticketconversatie uit, genereert via Claude AI een antwoord of interne notitie, en injecteert de tekst in het invoerveld.

## Functionaliteit

- Leest de actieve ticketconversatie uit op `focus.teamleader.eu`
- Detecteert of je een **Antwoord** of **Opmerking** schrijft
- Genereert een passende tekst via de Claude API (altijd in het Nederlands)
- Toont een preview voor je goedkeuring
- Plakt de tekst direct in het tekstveld met één klik

## Installatie (ontwikkeling)

### Vereisten

- Een [Anthropic API key](https://console.anthropic.com/)
- Chrome 88+ of Firefox 109+

### Chrome

1. Ga naar `chrome://extensions`
2. Zet **Ontwikkelaarsmodus** aan (rechtsbovenin)
3. Klik **Uitgepakte extensie laden**
4. Selecteer de map van dit project

### Firefox

1. Ga naar `about:debugging`
2. Klik **Deze Firefox** > **Tijdelijk Add-on laden**
3. Selecteer `manifest.json` in de projectmap

### API key instellen

1. Klik op het extensie-icoon in de toolbar
2. Klik op het tandwiel-icoon (instellingen)
3. Vul je Anthropic API key in en klik **Opslaan**

## Gebruik

1. Open een ticket op `focus.teamleader.eu`
2. Klik op het extensie-icoon
3. Voeg optioneel extra context toe
4. Klik **Genereer antwoord** of **Genereer opmerking** (afhankelijk van de actieve tab)
5. Bekijk de preview en klik **Plak in ticket**

## Architectuur

```
draad-tl-extension/
  manifest.json         # Manifest V3 configuratie
  background.js         # Service worker — Claude API calls
  content_script.js     # DOM lezen/schrijven op TeamLeader pagina
  popup/
    popup.html          # Gebruikersinterface
    popup.js            # Popup logica en berichtverkeer
    popup.css           # Stijlen
  icons/
    icon16.png
    icon48.png
    icon128.png
  docs/
    plans/              # Design doc en implementatieplan
```

**Berichtenstroom:**

```
popup.js
  → content_script.js   (GET_CONVERSATION, INJECT_TEXT)
  → background.js       (GENERATE_RESPONSE → Claude API)
```

## Technologie

- Manifest V3
- Vanilla JS
- [Claude API](https://docs.anthropic.com/) — model `claude-sonnet-4-6`
- `chrome.storage.local` voor API key opslag

## Licentie

Intern project — Draad
