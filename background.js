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
