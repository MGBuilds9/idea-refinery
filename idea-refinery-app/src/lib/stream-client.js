/**
 * Consume a streaming refinement response via SSE
 * @param {Object} options - { idea, provider, apiKey, model, serverUrl, authToken }
 * @param {Object} callbacks - { onPhase, onComplete, onError }
 * @returns {AbortController} - call .abort() to cancel
 */
export function streamRefinement({ idea, provider, apiKey, model, serverUrl, authToken }, callbacks) {
  const controller = new AbortController();

  const url = `${serverUrl}/api/refine/stream`;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ idea, provider, apiKey, model }),
    signal: controller.signal,
  })
  .then(response => {
    if (!response.ok) {
      // Try to parse error JSON from a non-SSE error response
      return response.json().then(errData => {
        throw new Error(errData.error || `HTTP ${response.status}: ${response.statusText}`);
      }).catch(parseErr => {
        // If we can't parse, throw the original HTTP error
        if (parseErr.message.startsWith('HTTP ')) throw parseErr;
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      });
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    function processBuffer() {
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      let currentEvent = null;
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.substring(7).trim();
        } else if (line.startsWith('data: ') && currentEvent) {
          try {
            const data = JSON.parse(line.substring(6));

            if (currentEvent === 'phase' && callbacks.onPhase) {
              callbacks.onPhase(data);
            } else if (currentEvent === 'complete' && callbacks.onComplete) {
              callbacks.onComplete(data);
            } else if (currentEvent === 'error' && callbacks.onError) {
              callbacks.onError(data);
            }
          } catch (e) {
            console.warn('Failed to parse SSE data:', line);
          }
          currentEvent = null;
        }
      }
    }

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) return;
        buffer += decoder.decode(value, { stream: true });
        processBuffer();
        read();
      }).catch(err => {
        if (err.name !== 'AbortError' && callbacks.onError) {
          callbacks.onError({ message: err.message });
        }
      });
    }

    read();
  })
  .catch(err => {
    if (err.name !== 'AbortError' && callbacks.onError) {
      callbacks.onError({ message: err.message });
    }
  });

  return controller;
}
