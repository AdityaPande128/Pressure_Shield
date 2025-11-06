document.addEventListener('DOMContentLoaded', () => {

    const startButton = document.getElementById('startButton');
    const callContainer = document.getElementById('call-container');
    const transcriptLog = document.getElementById('transcript-log');
    const alertsLog = document.getElementById('alerts-log');

    let isCallActive = false;
    let recognition;

    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        startButton.disabled = true;
        startButton.textContent = 'Speech Recognition Not Supported';
        transcriptLog.innerHTML = '<p class="log-entry system error">Error: Speech Recognition is not supported by this browser. Please use Chrome, Edge, or Safari.</p>';
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
        let final_transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                final_transcript += event.results[i][0].transcript.trim() + ' ';
            }
        }
        
        if (final_transcript) {
            addTranscript(final_transcript);
        }
    };

    recognition.onend = () => {
        if (isCallActive) {
            recognition.start();
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = 'An error occurred. ';
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            errorMessage = 'Error: Microphone permission was denied. Please allow access and try again.';
        } else if (event.error === 'network') {
            errorMessage = 'Error: A network error occurred. Please check your connection.';
        }
        transcriptLog.innerHTML = `<p class="log-entry system error">${errorMessage}</p>`;
    };

    startButton.addEventListener('click', toggleCall);

    function toggleCall() {
        isCallActive = !isCallActive;

        if (isCallActive) {
            startButton.textContent = 'Stop Call Analysis';
            callContainer.style.display = 'grid';

            transcriptLog.innerHTML = '<p class="log-entry system">Connecting...</p>';
            alertsLog.innerHTML = '<p class="log-entry system">Alerts will appear here.</p>';

            startCall();

        } else {
            startButton.textContent = 'Start Call Analysis';
            callContainer.style.display = 'none';

            stopCall();
        }
    }

    async function startCall() {
        try {
            
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            transcriptLog.innerHTML = '<p class="log-entry system">Connected. Start speaking...</p>';
            recognition.start();

        } catch (error) {
            console.error('Error accessing microphone:', error);
            transcriptLog.innerHTML = '<p class="log-entry system error">Error: Could not access microphone. Please grant permission and try again.</p>';
            if (isCallActive) {
                toggleCall();
            }
        }
    }

    function stopCall() {
        if (recognition) {
            recognition.stop();
        }
        
        if (transcriptLog.innerHTML.includes('...')) {
            transcriptLog.innerHTML = '<p class="log-entry system">Call ended.</p>';
        } else {
            transcriptLog.innerHTML += '<p class="log-entry system">Call ended.</p>';
        }
    }

    function addTranscript(text) {
        const firstEntry = transcriptLog.querySelector('.system');
        if (firstEntry) {
            transcriptLog.removeChild(firstEntry);
        }

        const p = document.createElement('p');
        p.className = 'log-entry transcript';
        p.textContent = text;
        
        transcriptLog.appendChild(p);
        transcriptLog.scrollTop = transcriptLog.scrollHeight;
    }

});