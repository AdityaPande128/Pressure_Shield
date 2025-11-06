const mainContent = document.getElementById('main-content');
const startButton = document.getElementById('start-btn');
const transcriptLog = document.getElementById('transcript-log');
const alertLog = document.getElementById('alert-log');

let isCallActive = false;
let recognition = null;
let fullTranscript = '';
let alertCount = 0;

const pressureRegex = /(act now|limited time|only one left|don't wait|offer expires|final notice|your account is suspended|immediate payment|must verify|bank details|verify your identity)/i;

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
    alertCount = 0;
    transcriptLog.innerHTML = '';
    alertLog.innerHTML = '';
    
    mainContent.classList.add('call-active');
    startButton.textContent = 'Stop Call Analysis';
    startButton.classList.add('stop');
    
    addSystemEntry("Connected. Start speaking...");
    recognition.start();

  } catch (error) {
    console.error("Error starting call:", error);
    addSystemEntry("Error: Could not start microphone.");
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
    checkTranscriptForPressure(finalTranscript);
  }
  if (interimTranscript) {
    updateInterimTranscript(interimTranscript);
  }
}

function handleRecognitionError(event) {
  if (event.error === 'no-speech' || event.error === 'audio-capture') {
    addSystemEntry("Did not catch that. Still listening...");
  } else {
    console.error("Speech recognition error:", event.error);
    addSystemEntry(`An unexpected error occurred: '${event.error}'`);
  }
}

function handleRecognitionEnd() {
  if (isCallActive) {
    recognition.start();
  }
}

function addSystemEntry(text) {
  const existingSystemEntry = transcriptLog.querySelector('.system');
  if (existingSystemEntry && !existingSystemEntry.classList.contains('interim')) {
    existingSystemEntry.remove();
  }
  const entry = document.createElement('p');
  entry.className = 'log-entry system';
  entry.textContent = text;
  transcriptLog.appendChild(entry);
  transcriptLog.scrollTop = transcriptLog.scrollHeight;
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

function checkTranscriptForPressure(text) {
  if (pressureRegex.test(text)) {
    const alertId = `alert-${alertCount++}`;
    addAlert(alertId, text);
    analyzeWithAI(fullTranscript, alertId);
  }
}

function addAlert(id, text) {
  const alertCard = document.createElement('div');
  alertCard.id = id;
  alertCard.className = 'alert-card yellow';
  
  alertCard.innerHTML = `
    <svg class="alert-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.374c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
    <div class="alert-content">
      <p><strong>Caution: High-Pressure Language Detected</strong></p>
      <p>Detected phrase: "${text}"</p>
      <p><i>Analyzing context...</i></p>
    </div>
  `;
  
  alertLog.prepend(alertCard);
}

async function analyzeWithAI(transcript, alertId) {
  try {
    const response = await fetch('/api/analyzePressure', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript: transcript }),
    });

    if (!response.ok) {
      throw new Error('AI analysis failed');
    }

    const data = await response.json();
    updateAlert(alertId, data);

  } catch (error) {
    console.error("Error calling AI:", error);
    updateAlert(alertId, { error: "Could not analyze context." });
  }
}

function updateAlert(alertId, aiResponse) {
  const alertCard = document.getElementById(alertId);
  if (!alertCard) return;

  if (aiResponse.is_manipulative) {
    alertCard.classList.remove('yellow');
    alertCard.classList.add('red');
    
    alertCard.innerHTML = `
      <svg class="alert-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.374c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
      <div class="alert-content">
        <p><strong>Alert: Manipulative Tactic Confirmed</strong></p>
        <p>${aiResponse.explanation}</p>
        <p><strong>Suggested:</strong> "${aiResponse.suggested_response}"</p>
      </div>
    `;
  } else if (aiResponse.is_manipulative === false) {
    alertCard.remove();
  } else if (aiResponse.error) {
    const contextElement = alertCard.querySelector('i');
    if(contextElement) {
      contextElement.textContent = `AI Error: ${aiResponse.error}`;
    }
  }
}

startButton.addEventListener('click', toggleCall);