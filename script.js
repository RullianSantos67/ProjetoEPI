const URL = "./modelo/"; 
let currentFacingMode = "user"; 
let lastUpdateTime = 0;
let model, webcam, labelContainer, maxPredictions;

async function loadModel() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    labelContainer = document.getElementById("label-container");
}

loadModel();

async function init() {
    if (!model) {
        await loadModel();
    }
    
    const flip = (currentFacingMode === "user"); 
    webcam = new tmImage.Webcam(400, 400, flip); 
    await webcam.setup({ facingMode: currentFacingMode }); 
    await webcam.play();
    window.requestAnimationFrame(loop);

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(webcam.canvas);
}

async function switchCamera() {
    if (webcam) {
        currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
        await webcam.stop();
        const flip = (currentFacingMode === "user");
        webcam = new tmImage.Webcam(400, 400, flip);
        await webcam.setup({ facingMode: currentFacingMode });
        await webcam.play();
        const container = document.getElementById("webcam-container");
        container.innerHTML = "";
        container.appendChild(webcam.canvas);
    } 
}

async function loop() {
    if (webcam && webcam.canvas) {
        webcam.update(); 
        await predict();
    }
    window.requestAnimationFrame(loop);
}

// === AQUI FOI ONDE A MÁGICA VISUAL ACONTECEU ===
function predictClass(prediction) {
    let highestProb = 0;
    let bestClass = "";
    
    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            bestClass = prediction[i].className;
        }
    }
    
    let statusColor = "#10b981"; // Verde esmeralda premium
    let icone = "✅";
    
    if (bestClass.toLowerCase().includes("no") || bestClass.toLowerCase().includes("sem")) {
        statusColor = "#ef4444"; // Vermelho vibrante
        icone = "⛔";
    }
    
    // Novo design do cartão de resultado (sombras suaves e bordas limpas)
    labelContainer.innerHTML = `
        <div style="background: #ffffff; padding: 25px 20px; border-radius: 16px; border-left: 8px solid ${statusColor}; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: left; position: relative;">
            <strong style="color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Status da Análise</strong>
            <h2 style="color: ${statusColor}; margin: 8px 0 15px 0; font-size: 2rem; display: flex; align-items: center; gap: 10px;">
                ${icone} ${bestClass.toUpperCase()}
            </h2>
            <div style="background: #f1f5f9; display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #475569;">
                Nível de Confiança: <span>${(highestProb * 100).toFixed(1)}%</span>
            </div>
        </div>`;
}
// ===============================================

async function predict() {
    const now = Date.now();
    if (now - lastUpdateTime > 1000) {
        const prediction = await model.predict(webcam.canvas);
        predictClass(prediction);
        lastUpdateTime = now; 
    }
}

async function predictFromFile() {
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('file-preview-container');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            previewContainer.innerHTML = `<img id="target-image" src="${e.target.result}" width="100%" style="max-width: 300px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">`;
            const imgElement = document.getElementById('target-image');
            imgElement.onload = async () => {
                await runStaticPrediction(imgElement);
            };
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

async function runStaticPrediction(imgElement) {
    if (model == null) {
        await loadModel();
    }
    const prediction = await model.predict(imgElement);
    predictClass(prediction);
}