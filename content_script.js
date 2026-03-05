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
