const URL = "./modelo/"; 
let currentFacingMode = "user"; 
let lastUpdateTime = 0;
let model, webcam, labelContainer, maxPredictions;

// Variável mágica que cria o efeito de "Catraca Real"
let isPaused = false; 

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
        
        // Só faz a análise se a catraca não estiver "travada" exibindo um resultado
        if (!isPaused) {
            await predict();
        }
    }
    window.requestAnimationFrame(loop);
}

// === NOVA LÓGICA DA CATRACA INTELIGENTE ===
function processPrediction(prediction, isFromFile = false) {
    let highestProb = 0;
    let bestClass = "";
    
    // Descobre qual foi o maior resultado
    for (let i = 0; i < maxPredictions; i++) {
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            bestClass = prediction[i].className;
        }
    }
    
    // Configuração das Cores e Ícones
    let statusColor = "#10b981"; // Verde (Liberado)
    let icone = "✅";
    
    // Se a IA disse "Sem EPI" ou "Sem capacete" (Cores de Bloqueado)
    if (bestClass.toLowerCase().includes("sem") && !bestClass.toLowerCase().includes("pessoa")) {
        statusColor = "#ef4444"; 
        icone = "⛔";
    } 
    // Se a IA disse "Sem Pessoa" (Deixa cinza aguardando)
    else if (bestClass.toLowerCase().includes("pessoa")) {
        statusColor = "#94a3b8"; 
        icone = "⏳";
        bestClass = "Aguardando Câmera...";
    }
    
    // Desenha o cartão de resultado na tela
    labelContainer.innerHTML = `
        <div style="background: #ffffff; padding: 25px 20px; border-radius: 16px; border-left: 8px solid ${statusColor}; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: left;">
            <strong style="color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px;">Status da Catraca</strong>
            <h2 style="color: ${statusColor}; margin: 8px 0 15px 0; font-size: 2rem; display: flex; align-items: center; gap: 10px;">
                ${icone} ${bestClass.toUpperCase()}
            </h2>
            <div style="background: #f1f5f9; display: inline-block; padding: 6px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; color: #475569;">
                Confiança da IA: <span>${(highestProb * 100).toFixed(1)}%</span>
            </div>
        </div>`;

    // 🔴 AQUI É O SEGREDO DO "TRAVAMENTO" 🔴
    // Trava a tela se você enviou uma foto OU se detectou uma pessoa de verdade na câmera
    if (isFromFile || (!bestClass.toLowerCase().includes("aguardando") && highestProb > 0.60)) {
        isPaused = true; // Para de analisar a câmera
        
        // Espera exatos 4 segundos e "Zera" a tela para a próxima pessoa
        setTimeout(() => {
            isPaused = false; // Libera a câmera de novo
            
            // Desenha a mensagem de PRÓXIMO
            labelContainer.innerHTML = `
                <div style="background: #ffffff; padding: 25px 20px; border-radius: 16px; border-left: 8px solid #3b82f6; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); text-align: left;">
                    <h2 style="color: #3b82f6; margin: 0; font-size: 1.5rem;">🔄 PRÓXIMO!</h2>
                    <p style="margin: 5px 0 0 0; color: #64748b;">Aproxime-se da catraca para escanear...</p>
                </div>`;
            
            // Se tinha uma foto na tela (upload), ele limpa a foto
            const preview = document.getElementById('file-preview-container');
            if(preview) preview.innerHTML = '';
            
        }, 10000); // 4000 = 4 segundos. Pode aumentar se achar rápido.
    }
}
// ==========================================

async function predict() {
    const now = Date.now();
    if (now - lastUpdateTime > 1000) {
        const prediction = await model.predict(webcam.canvas);
        processPrediction(prediction, false); // false = veio da câmera
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
    processPrediction(prediction, true); // true = veio do upload de arquivo
}