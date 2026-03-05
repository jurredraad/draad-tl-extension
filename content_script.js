chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_CONVERSATION') {
    sendResponse({ conversation: getConversation(), mode: getActiveMode() });
  } else if (request.type === 'INJECT_TEXT') {
    injectText(request.text);
    sendResponse({ ok: true });
  }
});

function getConversation() {
  const items = document.querySelectorAll('li.item.mainitem .decotext');
  const texts = Array.from(items)
    .map(el => el.innerText.trim())
    .filter(t => t.length > 0);
  return texts.join('\n\n---\n\n');
}

function getActiveMode() {
  const activeBtn = document.querySelector('.g-link.button.selected[data-action]');
  if (activeBtn && activeBtn.getAttribute('data-action') !== 'ANSWER') return 'opmerking';
  return 'antwoord';
}

function injectText(text) {
  const editor = document.querySelector('div.trumbowyg-editor[contenteditable="true"]');

  if (!editor) {
    console.warn('[TL AI] Tekstveld niet gevonden');
    return;
  }

  editor.focus();
  document.execCommand('selectAll');
  document.execCommand('insertText', false, text);
}
