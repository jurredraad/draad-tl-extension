# TeamLeader AI Extensie — Implementatieplan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bouw een Manifest V3 browser-extensie voor Chrome/Firefox die op TeamLeader ticketpagina's de conversatie uitleest, via de Claude API een antwoord of samenvatting genereert, en de tekst in het tekstveld injecteert.

**Architecture:** De extensie bestaat uit drie lagen: een popup (UI), een content script (DOM-toegang op de TeamLeader pagina), en een background service worker (API calls). Berichten lopen via `chrome.runtime.sendMessage`. De API-sleutel wordt opgeslagen in `chrome.storage.local`.

**Tech Stack:** Vanilla JS, Manifest V3, Chrome Extensions API, Anthropic Claude API (`claude-sonnet-4-6`)

---

### Task 1: manifest.json aanmaken

**Files:**
- Create: `manifest.json`

**Stap 1: Schrijf manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Draad TL AI Assistent",
  "version": "1.0.0",
  "description": "AI-assistent voor TeamLeader support tickets",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "https://focus.teamleader.eu/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["https://focus.teamleader.eu/*"],
      "js": ["content_script.js"],
      "run_at": "document_idle"
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

**Stap 2: Commit**

```bash
git add manifest.json
git commit -m "feat: add manifest v3 config"
```

---

### Task 2: Placeholder iconen aanmaken

**Files:**
- Create: `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`

**Stap 1: Maak icons map en placeholder PNG's**

Gebruik een eenvoudig Node-script of download drie PNG-bestanden (16x16, 48x48, 128x128) in een egale kleur. Voorlopige placeholder (kan later vervangen worden):

```bash
mkdir -p icons
# Gebruik een online tool of teken eenvoudige iconen
# Minimaal: kopieer een bestaand PNG bestand in drie maten
```

> Tip: Gebruik https://www.favicon.io of een vergelijkbare tool om snel iconen te genereren. Sla de drie maten op als `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`.

**Stap 2: Commit**

```bash
git add icons/
git commit -m "feat: add placeholder icons"
```

---

### Task 3: background.js — Claude API aanroep

**Files:**
- Create: `background.js`

**Stap 1: Schrijf background.js**

De background service worker ontvangt berichten van de popup en roept de Claude API aan.

```js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GENERATE_RESPONSE') {
    handleGenerate(request).then(sendResponse).catch((err) => {
      sendResponse({ error: err.message });
    });
    return true; // Houdt het berichtkanaal open voor async response
  }
});

async function handleGenerate({ conversation, context, mode, apiKey }) {
  const systemPrompt = mode === 'antwoord'
    ? 'Je bent een professionele klantenservice medewerker. Schrijf een beleefd, duidelijk en volledig antwoord op het ticket in het Nederlands. Reageer alleen met de antwoordtekst zelf, zonder aanhef als "Beste [naam]" — dat wordt apart afgehandeld.'
    : 'Je bent een interne support medewerker. Vat dit ticket samen als een interne notitie in het Nederlands. Wees beknopt en feitelijk.';

  const userMessage = context
    ? `Hier is de ticketconversatie:\n\n${conversation}\n\nExtra context van de medewerker: ${context}`
    : `Hier is de ticketconversatie:\n\n${conversation}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API fout: ${response.status}`);
  }

  const data = await response.json();
  return { result: data.content[0].text };
}
```

**Stap 2: Commit**

```bash
git add background.js
git commit -m "feat: add background service worker with Claude API integration"
```

---

### Task 4: content_script.js — conversatie uitlezen en tekst injecteren

**Files:**
- Create: `content_script.js`

**Stap 1: Schrijf content_script.js**

Het content script doet twee dingen:
1. Conversatieberichten uit het DOM uitlezen
2. Gegenereerde tekst in het antwoordveld injecteren

```js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_CONVERSATION') {
    sendResponse({ conversation: getConversation(), mode: getActiveMode() });
  } else if (request.type === 'INJECT_TEXT') {
    injectText(request.text);
    sendResponse({ ok: true });
  }
});

function getConversation() {
  // TeamLeader toont berichten in elementen met klasse voor chat-bubbles
  // Pas deze selector aan op basis van de werkelijke DOM structuur
  const messages = document.querySelectorAll('[data-testid="ticket-message"], .ticket-message, .message-body');

  if (messages.length === 0) {
    // Fallback: probeer algemene tekstblokken
    const fallback = document.querySelectorAll('.conversation .message');
    if (fallback.length > 0) {
      return Array.from(fallback).map(el => el.innerText.trim()).join('\n\n---\n\n');
    }
    return '';
  }

  return Array.from(messages).map(el => el.innerText.trim()).join('\n\n---\n\n');
}

function getActiveMode() {
  // Detecteer of "Antwoord" of "Opmerking" actief is
  // TeamLeader gebruikt tabs/knoppen om te wisselen
  const activeTab = document.querySelector(
    '[role="tab"][aria-selected="true"], .reply-tab.active, .tab--active'
  );
  if (!activeTab) return 'antwoord'; // Default

  const label = activeTab.textContent.trim().toLowerCase();
  if (label.includes('opmerking') || label.includes('note')) return 'opmerking';
  return 'antwoord';
}

function injectText(text) {
  // Zoek het tekstveld (textarea of contenteditable div)
  const textarea = document.querySelector(
    'textarea[placeholder], [contenteditable="true"][role="textbox"], .ql-editor, .ProseMirror'
  );

  if (!textarea) {
    console.warn('[TL AI] Tekstveld niet gevonden');
    return;
  }

  if (textarea.tagName === 'TEXTAREA') {
    textarea.value = text;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // Contenteditable (bijv. Quill of ProseMirror editor)
    textarea.focus();
    document.execCommand('selectAll');
    document.execCommand('insertText', false, text);
  }
}
```

**Stap 2: Commit**

```bash
git add content_script.js
git commit -m "feat: add content script for DOM reading and text injection"
```

---

### Task 5: popup HTML en CSS

**Files:**
- Create: `popup/popup.html`
- Create: `popup/popup.css`

**Stap 1: Schrijf popup.html**

```html
<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>TL AI Assistent</title>
  <link rel="stylesheet" href="popup.css" />
</head>
<body>
  <!-- Instellingenscherm -->
  <div id="settings-screen" class="screen hidden">
    <div class="header">
      <button id="back-btn" class="icon-btn">&#8592;</button>
      <h2>Instellingen</h2>
    </div>
    <label for="api-key-input">Anthropic API Key</label>
    <input type="password" id="api-key-input" placeholder="sk-ant-..." />
    <button id="save-key-btn" class="btn primary">Opslaan</button>
    <p id="settings-status" class="status"></p>
  </div>

  <!-- Hoofdscherm: invoer -->
  <div id="main-screen" class="screen">
    <div class="header">
      <h1>TL AI Assistent</h1>
      <button id="settings-btn" class="icon-btn" title="Instellingen">&#9881;</button>
    </div>
    <label for="context-input">Extra context <span class="optional">(optioneel)</span></label>
    <textarea id="context-input" placeholder="Bijv. klant heeft al eerder gebeld..."></textarea>
    <button id="generate-btn" class="btn primary">Genereer antwoord</button>
    <p id="main-status" class="status"></p>
  </div>

  <!-- Previewscherm -->
  <div id="preview-screen" class="screen hidden">
    <div class="header">
      <button id="preview-back-btn" class="icon-btn">&#8592;</button>
      <h2 id="preview-title">Gegenereerd antwoord</h2>
    </div>
    <div id="preview-text" class="preview-box"></div>
    <div class="btn-row">
      <button id="regenerate-btn" class="btn secondary">Opnieuw</button>
      <button id="inject-btn" class="btn primary">Plak in ticket</button>
    </div>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

**Stap 2: Schrijf popup.css**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  width: 340px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 14px;
  color: #1a1a2e;
  background: #fff;
}

.screen {
  padding: 16px;
}

.hidden {
  display: none;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

h1 {
  font-size: 16px;
  font-weight: 600;
}

h2 {
  font-size: 15px;
  font-weight: 600;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  color: #555;
  padding: 4px;
  border-radius: 4px;
}

.icon-btn:hover {
  background: #f0f0f0;
}

label {
  display: block;
  font-weight: 500;
  margin-bottom: 6px;
  color: #333;
}

.optional {
  font-weight: 400;
  color: #888;
  font-size: 12px;
}

textarea,
input[type="password"] {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  resize: vertical;
  margin-bottom: 12px;
  font-family: inherit;
}

textarea {
  min-height: 80px;
}

textarea:focus,
input:focus {
  outline: none;
  border-color: #4f6ef7;
  box-shadow: 0 0 0 2px rgba(79, 110, 247, 0.15);
}

.btn {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s;
}

.btn.primary {
  background: #4f6ef7;
  color: #fff;
}

.btn.primary:hover {
  background: #3a58e0;
}

.btn.primary:disabled {
  background: #a0b0f5;
  cursor: not-allowed;
}

.btn.secondary {
  background: #f0f0f0;
  color: #333;
}

.btn.secondary:hover {
  background: #e0e0e0;
}

.btn-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.btn-row .btn {
  flex: 1;
}

.preview-box {
  background: #f7f8fc;
  border: 1px solid #e0e4f0;
  border-radius: 6px;
  padding: 12px;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
}

.status {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
  min-height: 16px;
}

.status.error {
  color: #d32f2f;
}

.status.success {
  color: #2e7d32;
}
```

**Stap 3: Commit**

```bash
git add popup/popup.html popup/popup.css
git commit -m "feat: add popup HTML and CSS"
```

---

### Task 6: popup.js — logica en berichtverkeer

**Files:**
- Create: `popup/popup.js`

**Stap 1: Schrijf popup.js**

```js
// Scherm elementen
const mainScreen = document.getElementById('main-screen');
const previewScreen = document.getElementById('preview-screen');
const settingsScreen = document.getElementById('settings-screen');

// Knoppen
const settingsBtn = document.getElementById('settings-btn');
const backBtn = document.getElementById('back-btn');
const previewBackBtn = document.getElementById('preview-back-btn');
const generateBtn = document.getElementById('generate-btn');
const regenerateBtn = document.getElementById('regenerate-btn');
const injectBtn = document.getElementById('inject-btn');
const saveKeyBtn = document.getElementById('save-key-btn');

// Invoervelden en status
const contextInput = document.getElementById('context-input');
const apiKeyInput = document.getElementById('api-key-input');
const previewText = document.getElementById('preview-text');
const previewTitle = document.getElementById('preview-title');
const mainStatus = document.getElementById('main-status');
const settingsStatus = document.getElementById('settings-status');

let lastGeneratedText = '';
let lastMode = 'antwoord';

// Scherm hulpfuncties
function showScreen(screen) {
  mainScreen.classList.add('hidden');
  previewScreen.classList.add('hidden');
  settingsScreen.classList.add('hidden');
  screen.classList.remove('hidden');
}

// Instellingen laden bij openen
chrome.storage.local.get(['apiKey'], (result) => {
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
  }
});

// Navigatie
settingsBtn.addEventListener('click', () => showScreen(settingsScreen));
backBtn.addEventListener('click', () => showScreen(mainScreen));
previewBackBtn.addEventListener('click', () => showScreen(mainScreen));

// API key opslaan
saveKeyBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key.startsWith('sk-ant-')) {
    settingsStatus.textContent = 'Ongeldige API key (moet beginnen met sk-ant-)';
    settingsStatus.className = 'status error';
    return;
  }
  chrome.storage.local.set({ apiKey: key }, () => {
    settingsStatus.textContent = 'Opgeslagen!';
    settingsStatus.className = 'status success';
    setTimeout(() => showScreen(mainScreen), 800);
  });
});

// Genereer knop
generateBtn.addEventListener('click', () => generate());
regenerateBtn.addEventListener('click', () => generate());

async function generate() {
  mainStatus.textContent = '';
  mainStatus.className = 'status';

  // API key ophalen
  const { apiKey } = await chrome.storage.local.get(['apiKey']);
  if (!apiKey) {
    mainStatus.textContent = 'Geen API key ingesteld. Ga naar instellingen.';
    mainStatus.className = 'status error';
    showScreen(mainScreen);
    return;
  }

  // Actieve tab ophalen
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    mainStatus.textContent = 'Geen actieve tab gevonden.';
    mainStatus.className = 'status error';
    return;
  }

  // Conversatie ophalen van content script
  let conversation = '';
  let mode = 'antwoord';
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CONVERSATION' });
    conversation = response?.conversation || '';
    mode = response?.mode || 'antwoord';
    lastMode = mode;
  } catch (e) {
    mainStatus.textContent = 'Kan pagina niet bereiken. Ben je op een TeamLeader ticket?';
    mainStatus.className = 'status error';
    return;
  }

  if (!conversation) {
    mainStatus.textContent = 'Geen conversatie gevonden op deze pagina.';
    mainStatus.className = 'status error';
    return;
  }

  // UI updaten voor laadstatus
  generateBtn.disabled = true;
  generateBtn.textContent = 'Bezig...';
  mainStatus.textContent = 'AI genereert tekst...';

  // Naar background sturen voor API call
  const result = await chrome.runtime.sendMessage({
    type: 'GENERATE_RESPONSE',
    conversation,
    context: contextInput.value.trim(),
    mode,
    apiKey,
  });

  generateBtn.disabled = false;
  generateBtn.textContent = mode === 'antwoord' ? 'Genereer antwoord' : 'Genereer opmerking';

  if (result.error) {
    mainStatus.textContent = `Fout: ${result.error}`;
    mainStatus.className = 'status error';
    return;
  }

  lastGeneratedText = result.result;
  previewTitle.textContent = mode === 'antwoord' ? 'Gegenereerd antwoord' : 'Gegenereerde opmerking';
  previewText.textContent = lastGeneratedText;
  showScreen(previewScreen);
}

// Tekst injecteren in ticket
injectBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  await chrome.tabs.sendMessage(tab.id, { type: 'INJECT_TEXT', text: lastGeneratedText });
  window.close();
});
```

**Stap 2: Commit**

```bash
git add popup/popup.js
git commit -m "feat: add popup JS with full generate/preview/inject flow"
```

---

### Task 7: Handmatig testen in Chrome

**Stap 1: Extensie laden in Chrome**

1. Ga naar `chrome://extensions`
2. Zet "Ontwikkelaarsmodus" aan (rechtsbovenin)
3. Klik "Uitgepakte extensie laden"
4. Selecteer de map `draad-tl-extention`

**Stap 2: API key instellen**

1. Klik op het extensie-icoon in de toolbar
2. Klik op het tandwiel (instellingen)
3. Vul een geldige Anthropic API key in en klik "Opslaan"

**Stap 3: Testen op een TeamLeader ticket**

1. Ga naar een bestaand ticket op `focus.teamleader.eu`
2. Klik op het extensie-icoon
3. Klik "Genereer antwoord"
4. Controleer:
   - De conversatie wordt opgepikt (geen "Geen conversatie gevonden" fout)
   - Er verschijnt een preview met tekst
   - "Plak in ticket" schrijft de tekst in het invoerveld

**Stap 4: DOM selectors aanpassen indien nodig**

Als de conversatie niet opgepikt wordt, open DevTools op de TeamLeader pagina (F12) en inspecteer de DOM. Pas de selectors in `content_script.js` (`getConversation()` en `getActiveMode()`) aan op basis van de werkelijke klasse-namen en data-attributen.

**Stap 5: Commit na eventuele selector-aanpassingen**

```bash
git add content_script.js
git commit -m "fix: update DOM selectors for TeamLeader ticket page"
```

---

### Task 8: Firefox compatibiliteit

**Files:**
- Modify: `manifest.json`

**Stap 1: Firefox manifest aanpassing**

Firefox vereist een `browser_specific_settings` veld. Voeg toe aan `manifest.json`:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "tl-ai-assistent@draad.be",
    "strict_min_version": "109.0"
  }
}
```

**Stap 2: Testen in Firefox**

1. Ga naar `about:debugging`
2. Klik "Deze Firefox" > "Tijdelijk Add-on laden"
3. Selecteer `manifest.json`
4. Test dezelfde flow als in Chrome

**Stap 3: Commit**

```bash
git add manifest.json
git commit -m "feat: add Firefox browser_specific_settings for gecko compatibility"
```
