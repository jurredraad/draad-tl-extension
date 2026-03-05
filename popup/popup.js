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
