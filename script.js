const URL = "./modelo/"; 
let currentFacingMode = "user"; // Começa com a frontal
let lastUpdateTime = 0;
let model, webcam, labelContainer, maxPredictions;

// 1. Função isolada para carregar o modelo
async function loadModel() {
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();
    labelContainer = document.getElementById("label-container");
}

// Inicia o carregamento em segundo plano assim que a página abre
loadModel();

// 2. Função de Inicialização da Câmera
async function init() {
    if (!model) {
        await loadModel();
    }
    
    const flip = (currentFacingMode === "user"); 
    webcam = new tmImage.Webcam(400, 400, flip); // Mantive 400x400 para ficar visível
    await webcam.setup({ facingMode: currentFacingMode }); 
    await webcam.play();
    window.requestAnimationFrame(loop);

    const container = document.getElementById("webcam-container");
    container.innerHTML = "";
    container.appendChild(webcam.canvas);
}

// 3. Função para Alternar Câmera (Frente / Trás)
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

// 4. Loop de atualização da Câmera
async function loop() {
    if (webcam && webcam.canvas) {
        webcam.update(); // update the webcam frame
        await predict();
    }
    window.requestAnimationFrame(loop);
}

// 5. Função para formatar o HTML do resultado e as cores
function predictClass(prediction) {
    let highestProb = 0;
    let bestClass = "";
    
    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            bestClass = prediction[i].className;
        }
    }
    
    let statusColor = "#2ecc71"; // Verde (Liberado)
    
    // Se for a classe "Sem EPI" ou "Sem Pessoa", fica vermelho
    if (bestClass.toLowerCase().includes("no") || bestClass.toLowerCase().includes("sem")) {
        statusColor = "#e74c3c"; // Vermelho (Bloqueado)
    }
    
    labelContainer.innerHTML = `
        <div style="background: #f0f0f0; padding: 10px; border-radius: 5px; border-left: 5px solid ${statusColor}">
            <strong>RESULTADO DA ANÁLISE:</strong>
            <h2 style="color: ${statusColor}; margin: 5px 0;">${bestClass.toUpperCase()}</h2>
            <small>Confiança: ${(highestProb * 100).toFixed(2)}%</small>
        </div>`;
}

// 6. Predição da Câmera (Com intervalo de 1 segundo)
async function predict() {
    const now = Date.now();
    if (now - lastUpdateTime > 1000) {
        const prediction = await model.predict(webcam.canvas);
        predictClass(prediction);
        lastUpdateTime = now; // Atualiza o marcador de tempo
    }
}

// 7. Predição a partir de Arquivo (Upload)
async function predictFromFile() {
    const fileInput = document.getElementById('file-input');
    const previewContainer = document.getElementById('file-preview-container');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async function (e) {
            previewContainer.innerHTML = `<img id="target-image" src="${e.target.result}" width="200" style="border-radius: 8px;">`;
            const imgElement = document.getElementById('target-image');
            imgElement.onload = async () => {
                await runStaticPrediction(imgElement);
            };
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
}

// 8. Roda o modelo na imagem enviada
async function runStaticPrediction(imgElement) {
    if (model == null) {
        await loadModel();
    }
    const prediction = await model.predict(imgElement);
    predictClass(prediction);
}