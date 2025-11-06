if (typeof deepgram === 'undefined') {
    
    document.body.innerHTML = `<div style="font-family: sans-serif; padding: 2rem; text-align: center; line-height: 1.6;">
        <h1 style="color: #d9534f;">CRITICAL ERROR: Deepgram SDK failed to load.</h1>
        <p>This is likely a <strong>network issue</strong> or an <strong>ad blocker</strong>.</p>
        <p>The file <strong>deepgram.min.js</strong> from <strong>cdn.jsdelivr.net</strong> is being blocked.</p>
        <hr style="margin: 2rem 0;">
        <p><strong>Please try the following:</strong></p>
        <ol style="text-align: left; display: inline-block; margin-top: 1rem;">
            <li><strong>Disable your Ad Blocker</strong> for this site and retry.</li>
            <li><strong>Try a different browser</strong> (like Chrome or Firefox).</li>
            <li>Check your <strong>console (F12) > Network tab</strong> to see why the file is blocked.</li>
        </ol>
    </div>`;

} else {

    const { createClient } = deepgram;

    const startButton = document.getElementById('startButton');
    const callContainer = document.getElementById('call-container');
    const transcriptLog = document.getElementById('transcript-log');
    const alertsLog = document.getElementById('alerts-log');

    let isCallActive = false;
    let mediaRecorder;
    let deepgramSocket;

    startButton.addEventListener('click', toggleCall);

    function toggleCall() {
        isCallActive = !isCallActive;

        if (isCallActive) {
            startButton.textContent = 'Stop Call Analysis';
            callContainer.style.display = 'grid';

            transcriptLog.innerHTML = '<p class="log-entry system">Connecting to analysis service...</p>';
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
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            const _deepgram = createClient(DEEPGRAM_API_KEY);
            deepgramSocket = _deepgram.listen.live({
                model: 'nova-2',
                smart_format: true,
            });

            deepgramSocket.on('open', () => {
                transcriptLog.innerHTML = '<p class="log-entry system">Connected. Start speaking...</p>';
                
                mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                
                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0 && deepgramSocket.readyState === 1) {
                        deepgramSocket.send(event.data);
                    }
                };
                
                mediaRecorder.start(250);
            });

            deepgramSocket.on('message', (data) => {
                const text = data.channel.alternatives[0].transcript;
                if (text) {
                    addTranscript(text);
                }
            });

            deepgramSocket.on('close', () => {
                console.log('Deepgram connection closed.');
            });

            deepgramSocket.on('error', (error) => {
                console.error('Deepgram error:', error);
                transcriptLog.innerHTML = `<p class="log-entry system error">Error: ${error.message}</p>`;
            });

        } catch (error) {
            console.error('Error accessing microphone:', error);
            transcriptLog.innerHTML = '<p class="log-entry system error">Error: Could not access microphone. Please grant permission and try again.</p>';
            if (isCallActive) {
                toggleCall();
            }
        }
    }

    function stopCall() {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        if (deepgramSocket) {
            deepgramSocket.close();
        }
        
        mediaRecorder = null;
        deepgramSocket = null;

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

    const DEEPGRAM_API_KEY = '950ff3a33cce6db0de635647d407cd56fe75853c';

}