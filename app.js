const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BASE_FREQS = [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88];
const SCIENTIFIC_COLORS = [
    '#ff0000', '#ff4500', '#ff8c00', '#ffa500', 
    '#ffff00', '#00ff00', '#4b0082', '#8a2be2', 
    '#9400d3', '#c71585', '#ff69b4', '#00ffff'
];

let audioCtx, analyzer, data, source;
let isAnalyzing = false;
let canvas, ctx;

const recordBtn = document.getElementById('record-btn');
const statusLabel = document.getElementById('status-label');
const notesLabel = document.getElementById('notes-label');
const textBreakdown = document.getElementById('text-breakdown');

// Set up Canvas background view grid parameters
canvas = document.getElementById('waveCanvas');
ctx = canvas.getContext('2d');
resizeCanvas();

function resizeCanvas() {
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    drawEmptyGrid();
}

window.addEventListener('resize', resizeCanvas);

function drawEmptyGrid() {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, w, h);
    
    // Draw background grid ticks
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
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
        location.reload(); // Works like your Python refresh build
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
        
        // Listen for 3 seconds like DURATION = 3 in Python, then analyze
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
    let detectedIndices = [];

    // Note detection frequency calculations
    for (let i = 0; i < 12; i++) {
        let maxVal = -Infinity;
        for (let oct = 2; oct <= 5; oct++) {
            let freq = 440 * Math.pow(2, (i - 9 + (oct - 4) * 12) / 12);
            let bin = Math.round(freq * analyzer.fftSize / audioCtx.sampleRate);
            if (bin >= 0 && bin < data.length) {
                let val = Math.max(data[bin], data[bin-1]||-Infinity, data[bin+1]||-Infinity);
                if (val > maxVal) maxVal = val;
            }
        }
        let threshold = (i === 7 || i === 0) ? -65 : -56;
        if (maxVal > threshold) {
            detectedIndices.push(i);
        }
    }

    // Limit to 3 notes max like the Python filter arrays
    if (detectedIndices.length > 3) {
        detectedIndices = detectedIndices.slice(0, 3);
    }
    detectedIndices.sort((a, b) => a - b);

    // Update labels UI element text details
    if (detectedIndices.length > 0) {
        notesLabel.innerText = "Notes: " + detectedIndices.map(i => NOTES[i]).join(', ');
    } else {
        notesLabel.innerText = "No notes detected.";
    }

    // Calculate harmony score & display raw physics text string
    const [score, mathText, scoreColor] = calculateHarmony(detectedIndices);
    statusLabel.innerText = `Harmony Score: ${score}%`;
    statusLabel.style.color = scoreColor;
    textBreakdown.innerText = mathText;

    // Plot waveform paths directly onto clean UI window panel context
    drawAcousticWaves(detectedIndices);
    
    // Shut off audio processing streams completely
    source.disconnect();
    isAnalyzing = false;
}

function calculateHarmony(indices) {
    if (indices.length < 2) {
        return [100, "MATHEMATICAL ANALYSIS:\n\n• Play 2 or more notes to calculate frequency ratios.", "#bdc3c7"];
    }

    // Check Major Triad layout rules configurations
    let isMajorTriad = false;
    let chordName = "";
    if (indices.length === 3) {
        let root = indices[0];
        let pattern = indices.map(num => (num - root) % 12).sort((a,b) => a-b);
        if (pattern[0] === 0 && pattern[1] === 4 && pattern[2] === 7) {
            isMajorTriad = true;
            chordName = `${NOTES[root]} Major`;
        }
    }

    if (isMajorTriad) {
        let mathText = `MATHEMATICAL ANALYSIS: ${chordName} Triad (3-Notes)\n\n` +
                       `• Physics Frequency Ratios: 4 : 5 : 6\n` +
                       `• Least Common Multiple: LCM(4, 5, 6) = 60\n` +
                       `• Science: In an idealized scale, these waves cycle perfectly\n` +
                       `  together every 60 intervals. On the graph, you see the real,\n` +
                       `  unaltered acoustic wavelengths moving at their true speeds.\n` +
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
                    `• Alignment rating: ${rating}.\n` +
                    `• Wave structural properties are rendered on screen.\n` +
                    `• Harmony Level: ${finalScore}%`;

    return [finalScore, `MATHEMATICAL ANALYSIS:\n\n${reasoning}`, color];
}

function drawAcousticWaves(indices) {
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    
    // Background fill colors
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, w, h);
    
    // Plot lines layout metrics rules
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for(let i=1; i<4; i++) {
        ctx.beginPath(); ctx.moveTo(0, (h/4)*i); ctx.lineTo(w, (h/4)*i); ctx.stroke();
        ctx.beginPath(); ctx.moveTo((w/4)*i, 0); ctx.lineTo((w/4)*i, h); ctx.stroke();
    }

    if (indices.length === 0) return;

    // Standard time calculation sequence windows matching Python (15ms duration bounds)
    const tMax = 0.015; 

    indices.forEach(noteIdx => {
        const freq = BASE_FREQS[noteIdx];
        ctx.strokeStyle = SCIENTIFIC_COLORS[noteIdx];
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        for (let x = 0; x < w; x++) {
            let t = (x / w) * tMax;
            // Pure mathematical matching sine array equation model calculations
            let yVal = 0.4 * Math.sin(2 * Math.PI * freq * t);
            
            // Map into UI canvas center grid height ranges coordinates
            let canvasY = (h / 2) - (yVal * (h / 1.0)); 

            if (x === 0) ctx.moveTo(x, canvasY);
            else ctx.lineTo(x, canvasY);
        }
        ctx.stroke();
    });
}
