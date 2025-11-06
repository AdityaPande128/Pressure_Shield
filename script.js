document.addEventListener('DOMContentLoaded', () => {

    const startButton = document.getElementById('startButton');
    const callContainer = document.getElementById('call-container');
    const transcriptLog = document.getElementById('transcript-log');
    const alertsLog = document.getElementById('alerts-log');

    let isCallActive = false;
    let mediaRecorder;
    let deepgramSocket;

    const { createClient } = deepgram;

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

    const DEEPGRAM_API_KEY = '756be4e40c6d692d4ffe8a8df614d945c94d5458';

});