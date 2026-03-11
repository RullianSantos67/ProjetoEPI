const modelURL = "./modelo/model.json";
const metadataURL = "./modelo/metadata.json";

let model, webcam, maxPredictions, statusBox;

async function init() {
    statusBox = document.getElementById("status-box");
    statusBox.innerHTML = "Carregando modelo de IA...";

    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    const flip = true; 
    webcam = new tmImage.Webcam(400, 400, flip);
    await webcam.setup(); 
    await webcam.play();
    window.requestAnimationFrame(loop);

    document.getElementById("webcam-container").appendChild(webcam.canvas);
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predictTopK(webcam.canvas, 1);
    
    let classe = prediction[0].className.toLowerCase();
    let probabilidade = (prediction[0].probability * 100).toFixed(0);

    if(classe.includes("com epi") || classe.includes("capacete")) {
        statusBox.className = "liberado";
        statusBox.innerHTML = `✅ ACESSO LIBERADO <br><span class="certeza">EPI Detectado. Bom trabalho! (${probabilidade}%)</span>`;
    } 
    else if(classe.includes("sem epi") || classe.includes("sem capacete")) {
        statusBox.className = "bloqueado";
        statusBox.innerHTML = `⛔ ACESSO BLOQUEADO <br><span class="certeza">Por favor, coloque o capacete e os óculos. (${probabilidade}%)</span>`;
    } 
    else {
        statusBox.className = "aguardando";
        statusBox.innerHTML = `Aproxime-se da catraca... <br><span class="certeza">Aguardando funcionário</span>`;
    }
}