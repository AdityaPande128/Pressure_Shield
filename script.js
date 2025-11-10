document.addEventListener('DOMContentLoaded', () => {

  const mainContent = document.getElementById('main-content');
  const startButton = document.getElementById('start-btn');
  const transcriptLog = document.getElementById('transcript-log');
  const alertLog = document.getElementById('alert-log');
  // NEW ELEMENT
  const summaryLog = document.getElementById('summary-log');

  if (!mainContent || !startButton || !transcriptLog || !alertLog || !summaryLog) {
    console.error("Fatal Error: HTML elements are missing.");
    document.body.innerHTML = "<h1>Fatal Error: HTML file is out of sync with script.js. Please hard refresh (Cmd+Shift+R).</h1>";
    return;
  }

  let isCallActive = false;
  let recognition = null;
  let fullTranscript = '';
  let shownAlerts = new Set();

  function toggleCall() {
    if (isCallActive) {
      stopCall();
    } else {
      startCall();
    }
  }

  function startCall() {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        addSystemEntry("Error: Speech recognition not supported by this browser.");
        return;
      }

      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = handleRecognitionResult;
      recognition.onerror = handleRecognitionError;
      recognition.onend = handleRecognitionEnd;

      isCallActive = true;
      fullTranscript = '';
      shownAlerts.clear();
      transcriptLog.innerHTML = '';
      alertLog.innerHTML = '';
      // NEW: Reset summary box
      summaryLog.innerHTML = '<p class="log-entry system">Waiting for conversation...</p>';
      
      mainContent.classList.add('call-active');
      startButton.textContent = 'Stop Call Analysis';
      startButton.classList.add('stop');
      
      addSystemEntry("Connected. Start speaking...", transcriptLog);
      recognition.start();

    } catch (error) {
      console.error("Error starting call:", error);
      addSystemEntry("Error: Could not start microphone.", transcriptLog);
    }
  }

  function stopCall() {
    if (recognition) {
      recognition.stop();
    }
    isCallActive = false;
    mainContent.classList.remove('call-active');
    startButton.textContent = 'Start Call Analysis';
    startButton.classList.remove('stop');
  }

  function handleRecognitionResult(event) {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      addTranscript(finalTranscript);
      fullTranscript += finalTranscript + ' ';
      analyzeWithAI(fullTranscript);
    }
    if (interimTranscript) {
      updateInterimTranscript(interimTranscript);
    }
  }

  function handleRecognitionError(event) {
    if (event.error === 'no-speech' || event.error === 'audio-capture') {
      addSystemEntry("Did not catch that. Still listening...", transcriptLog);
    } else {
      console.error("Speech recognition error:", event.error);
      addSystemEntry(`An unexpected error occurred: '${event.error}'`, transcriptLog);
    }
  }

  function handleRecognitionEnd() {
    if (isCallActive) {
      recognition.start();
    }
  }

  function addSystemEntry(text, logElement) {
    const existingSystemEntry = logElement.querySelector('.system');
    if (existingSystemEntry && !existingSystemEntry.classList.contains('interim')) {
      existingSystemEntry.remove();
    }
    const entry = document.createElement('p');
    entry.className = 'log-entry system';
    entry.textContent = text;
    logElement.appendChild(entry);
    logElement.scrollTop = logElement.scrollHeight;
  }

  function addTranscript(text) {
    const existingInterim = transcriptLog.querySelector('.interim');
    if (existingInterim) {
      existingInterim.remove();
    }
    const entry = document.createElement('p');
    entry.className = 'log-entry transcript';
    entry.textContent = text.trim();
    transcriptLog.appendChild(entry);
    transcriptLog.scrollTop = transcriptLog.scrollHeight;
  }

  function updateInterimTranscript(text) {
    let interimEntry = transcriptLog.querySelector('.interim');
    if (!interimEntry) {
      interimEntry = document.createElement('p');
      interimEntry.className = 'log-entry system interim';
      transcriptLog.appendChild(interimEntry);
    }
    interimEntry.textContent = text;
    transcriptLog.scrollTop = transcriptLog.scrollHeight;
  }

  async function analyzeWithAI(transcript) {
    try {
      const response = await fetch('/api/analyzePressure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript }),
      });

      if (!response.ok) {
        throw new Error('AI analysis failed');
      }

      const data = await response.json();
      
      // NEW: Update the summary
      if (data.summary) {
        // We *replace* the content of the summary log
        summaryLog.innerHTML = `<p class="log-entry transcript">${data.summary}</p>`;
        summaryLog.scrollTop = summaryLog.scrollHeight;
      }

      if (data.alerts && data.alerts.length > 0) {
        for (const alert of data.alerts) {
          const alertKey = `${alert.type}-${alert.title}`;
          if (!shownAlerts.has(alertKey)) {
            addAlert(alert);
            shownAlerts.add(alertKey);
          }
        }
      }

    } catch (error) {
      console.error("Error calling AI:", error);
    }
  }
  
  function addAlert(alert) {
    const alertId = `alert-${shownAlerts.size}`;
    const alertCard = document.createElement('div');
    alertCard.id = alertId;
    alertCard.className = `alert-card ${alert.type.toLowerCase()}`;
    
    alertCard.innerHTML = `
      <svg class="alert-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.374c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <div class="alert-content">
        <p><strong>${alert.title}</strong></p>
        <p>${alert.message}</p>
        <p><i><strong>Suggested:</strong> "${alert.suggestion}"</i></p>
      </div>
    `;
    
    alertLog.prepend(alertCard);
  }

  startButton.addEventListener('click', toggleCall);
});