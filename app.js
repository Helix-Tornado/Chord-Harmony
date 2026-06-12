document.addEventListener('DOMContentLoaded', () => {
    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const BASE_FREQS = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88];
    const SCIENTIFIC_COLORS = ['#ff0000', '#ff4500', '#ff8c00', '#ffa500', '#ffff00', '#00ff00', '#4b0082', '#8a2be2', '#9400d3', '#c71585', '#ff69b4', '#00ffff'];

    let audioCtx, analyzer, data, source;
    let isAnalyzing = false;
    const canvas = document.getElementById('waveCanvas');
    const ctx = canvas.getContext('2d');

    function updateMeter() {
        if (analyzer) {
            let array = new Uint8Array(analyzer.frequencyBinCount);
            analyzer.getByteFrequencyData(array);
            let sum = array.reduce((a, b) => a + b, 0);
            const meter = document.getElementById('volume-meter');
            if (meter) meter.style.width = Math.min(100, (sum / array.length) * 6) + '%';
        }
        requestAnimationFrame(updateMeter);
    }
    updateMeter();

    document.getElementById('record-btn').onclick = async () => {
        if (isAnalyzing) location.reload();
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            source = audioCtx.createMediaStreamSource(stream);
            analyzer = audioCtx.createAnalyser();
            analyzer.fftSize = 16384;
            source.connect(analyzer);
            data = new Float32Array(analyzer.frequencyBinCount);
            isAnalyzing = true;
            document.getElementById('status-label').innerText = "Listening...";
            setTimeout(() => {
                document.getElementById('status-label').innerText = "Analyzing...";
                runAnalysis();
            }, 3000);
        } catch (e) { 
            alert("Mic Error: " + e); 
            console.error(e);
        }
    };

    function runAnalysis() {
        analyzer.getFloatFrequencyData(data);
        let buffer = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) buffer[i] = Math.pow(10, data[i] / 20);
        let detected = [];
        for (let i = 0; i < 12; i++) {
            for (let oct = 2; oct <= 5; oct++) {
                let f = 440 * Math.pow(2, (i - 9 + (oct - 4) * 12) / 12);
                let bin = Math.round(f * analyzer.fftSize / audioCtx.sampleRate);
                if (bin > 2 && bin < buffer.length - 2 && Math.max(buffer[bin], buffer[bin-1], buffer[bin+1]) > 0.0001) {
                    detected.push(i); break;
                }
            }
        }
        detected = [...new Set(detected)].sort((a,b) => a-b).slice(0, 3);
        document.getElementById('notes-label').innerText = "Notes: " + (detected.length ? detected.map(i => NOTES[i]).join(', ') : "None");
        const [score, text, color] = calculateHarmony(detected);
        document.getElementById('status-label').innerText = `Harmony Score: ${score}%`;
        document.getElementById('status-label').style.color = color;
        document.getElementById('text-breakdown').innerText = text;
        drawWaves(detected);
    }

    function calculateHarmony(indices) {
        if (indices.length < 2) return [100, "MATHEMATICAL ANALYSIS:\n\n• Play 2 or more notes to calculate frequency ratios.", "#bdc3c7"];
        let crunch = 0;
        for (let i = 0; i < indices.length; i++) {
            for (let j = i + 1; j < indices.length; j++) {
                let diff = Math.abs(indices[i] - indices[j]) % 12;
                if ([1, 2, 6, 11].includes(diff)) crunch += 40;
            }
        }
        let s = 100 - Math.min(100, crunch);
        return [s, `MATHEMATICAL ANALYSIS:\n\n• Detected: ${indices.map(x=>NOTES[x]).join(', ')}\n• Harmony Level: ${s}%`, s > 70 ? "#2ecc71" : "#e74c3c"];
    }

    function drawWaves(indices) {
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height);
        indices.forEach(idx => {
            ctx.strokeStyle = SCIENTIFIC_COLORS[idx]; ctx.lineWidth = 2.5; ctx.beginPath();
            for (let x = 0; x < canvas.width; x++) {
                let y = 0.4 * Math.sin(2 * Math.PI * BASE_FREQS[idx] * (x / canvas.width) * 0.015);
                ctx.lineTo(x, (canvas.height/2) - (y * canvas.height));
            }
            ctx.stroke();
        });
    }
});
