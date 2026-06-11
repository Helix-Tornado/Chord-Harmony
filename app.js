const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BASE_FREQS = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88];
const SCIENTIFIC_COLORS = ['#ff0000', '#ff4500', '#ff8c00', '#ffa500', '#ffff00', '#00ff00', '#4b0082', '#8a2be2', '#9400d3', '#c71585', '#ff69b4', '#00ffff'];

let audioCtx, analyzer, data, source;
let isAnalyzing = false;
let canvas = document.getElementById('waveCanvas'), ctx = canvas.getContext('2d');

// Updates the green volume meter bar
function updateMeter() {
    if (analyzer) {
        let array = new Uint8Array(analyzer.frequencyBinCount);
        analyzer.getByteFrequencyData(array);
        let sum = array.reduce((a, b) => a + b, 0);
        document.getElementById('volume-meter').style.width = Math.min(100, (sum / array.length) * 6) + '%';
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
    } catch (e) { alert("Microphone Error: " + e); }
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
}    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    for (let i = 1; i < 4; i++) {
        let y = (h / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        let x = (w / 4) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.setLineDash([]);
}

recordBtn.onclick = async () => {
    if (isAnalyzing) {
        location.reload();
        return;
    }
    
    statusLabel.innerText = "Listening...";
    statusLabel.style.color = "#e74c3c";
    
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') await audioCtx.resume();

        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } 
        });
        
        source = audioCtx.createMediaStreamSource(stream);
        analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = 16384;
        analyzer.smoothingTimeConstant = 0.3;
        
        source.connect(analyzer);
        data = new Float32Array(analyzer.frequencyBinCount);

        isAnalyzing = true;
        recordBtn.innerText = "🔄 RESET SYSTEM";
        recordBtn.style.background = "#7f8c8d";
        
        setTimeout(() => {
            statusLabel.innerText = "Analyzing...";
            statusLabel.style.color = "#f39c12";
            runAnalysis();
        }, 3000);

    } catch (e) {
        alert("Microphone connection blocked: " + e);
        statusLabel.innerText = "Press 'Record' and play a chord";
        statusLabel.style.color = "#bdc3c7";
    }
};

function runAnalysis() {
    analyzer.getFloatFrequencyData(data);
    
    let buffer = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) {
        buffer[i] = Math.pow(10, data[i] / 20);
    }

    let detectedIndices = [];

    for (let i = 0; i < 12; i++) {
        let noteActivated = false;
        for (let oct = 2; oct <= 5; oct++) {
            let targetFreq = 440 * Math.pow(2, (i - 9 + (oct - 4) * 12) / 12);
            let bin = Math.round(targetFreq * analyzer.fftSize / audioCtx.sampleRate);
            
            if (bin >= 2 && bin < buffer.length - 2) {
                let localPeak = Math.max(buffer[bin], buffer[bin-1], buffer[bin+1], buffer[bin-2], buffer[bin+2]);
                if (localPeak > 0.0015) { 
                    noteActivated = true;
                    break;
                }
            }
        }
        if (noteActivated) detectedIndices.push(i);
    }

    if (detectedIndices.length > 3) detectedIndices = detectedIndices.slice(0, 3);
    detectedIndices.sort((a, b) => a - b);

    if (detectedIndices.length > 0) {
        notesLabel.innerText = "Notes: " + detectedIndices.map(i => NOTES[i]).join(', ');
    } else {
        notesLabel.innerText = "No notes detected. Play closer to the mic.";
    }

    const [score, mathText, scoreColor] = calculateHarmony(detectedIndices);
    statusLabel.innerText = `Harmony Score: ${score}%`;
    statusLabel.style.color = scoreColor;
    textBreakdown.innerText = mathText;

    drawAcousticWaves(detectedIndices);
    
    source.disconnect();
    isAnalyzing = false;
}

function calculateHarmony(indices) {
    if (indices.length < 2) {
        return [100, "MATHEMATICAL ANALYSIS:\n\n• Play 2 or more notes to calculate frequency ratios.", "#bdc3c7"];
    }

    let isMajorTriad = false;
    let chordName = "";
    if (indices.length === 3) {
        let root = indices[0];
        let pattern = indices.map(num => (num - root + 12) % 12).sort((a,b) => a-b);
        if (pattern[0] === 0 && pattern[1] === 4 && pattern[2] === 7) {
            isMajorTriad = true;
            chordName = `${NOTES[root]} Major`;
        }
    }

    if (isMajorTriad) {
        let mathText = `MATHEMATICAL ANALYSIS: ${chordName} Triad (3-Notes)\n\n` +
                       `• Physics Frequency Ratios: 4 : 5 : 6\n` +
                       `• Harmony Level: 100% (Perfect Consonancy)`;
        return [100, mathText, "#2ecc71"];
    }

    let crunch = 0;
    for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
            let diff = Math.abs(indices[i] - indices[j]) % 12;
            if ([1, 2, 6, 11].includes(diff)) crunch += 40;
        }
    }
    let finalScore = 100 - Math.max(0, Math.min(100, crunch));
    let color = finalScore >= 70 ? "#2ecc71" : (finalScore >= 40 ? "#f39c12" : "#e74c3c");
    let rating = finalScore >= 70 ? "Consonant" : (finalScore >= 40 ? "Mild Dissonance" : "Dissonant");

    let reasoning = `• Notes Detected: ${indices.map(x => NOTES[x]).join(', ')}\n` +
                    `• Alignment: ${rating}.\n` +
                    `• Harmony Level: ${finalScore}%`;

    return [finalScore, `MATHEMATICAL ANALYSIS:\n\n${reasoning}`, color];
}

function drawAcousticWaves(indices) {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, w, h);
    
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for(let i=1; i<4; i++) {
        ctx.beginPath(); ctx.moveTo(0, (h/4)*i); ctx.lineTo(w, (h/4)*i); ctx.stroke();
        ctx.beginPath(); ctx.moveTo((w/4)*i, 0); ctx.lineTo((w/4)*i, h); ctx.stroke();
    }

    if (indices.length === 0) return;
    const tMax = 0.015; 
    indices.forEach(noteIdx => {
        const freq = BASE_FREQS[noteIdx];
        ctx.strokeStyle = SCIENTIFIC_COLORS[noteIdx];
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
            let t = (x / w) * tMax;
            let yVal = 0.4 * Math.sin(2 * Math.PI * freq * t);
            let canvasY = (h / 2) - (yVal * (h / 1.0)); 
            if (x === 0) ctx.moveTo(x, canvasY);
            else ctx.lineTo(x, canvasY);
        }
        ctx.stroke();
    });
}
