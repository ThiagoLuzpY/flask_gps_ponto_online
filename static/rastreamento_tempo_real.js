// flask_gps_ponto/static/rastreamento_tempo_real.js

let marcadores = {};  // ✅ Armazena marcadores únicos por funcionário

// ✅ Inicializa o mapa de tempo real
function inicializarMapaTempoReal() {
    const mapaTempoReal = L.map('mapaTempoReal').setView([-22.9, -43.2], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaTempoReal);
    return mapaTempoReal;
}

// ✅ Atualiza ou cria marcador com status
function atualizarMarcador(funcionario, mapaTempoReal) {
    const { id_funcionario, nome, lat, lng, timestamp } = funcionario;

    // ✅ Define status com base na diferença de tempo
    const agora = new Date();
    const ultimaData = new Date(timestamp);
    const diffSegundos = (agora - ultimaData) / 1000;

    const status = diffSegundos <= 15 ? 'online' : 'offline';

    if (marcadores[id_funcionario]) {
        marcadores[id_funcionario].setLatLng([lat, lng]);
        marcadores[id_funcionario].setIcon(getIcon(status));
        marcadores[id_funcionario].bindPopup(`${nome} - ${status}<br>${ultimaData.toLocaleTimeString()}`);
    } else {
        marcadores[id_funcionario] = L.marker([lat, lng], {
            icon: getIcon(status)
        }).addTo(mapaTempoReal).bindPopup(`${nome} - ${status}<br>${ultimaData.toLocaleTimeString()}`);
    }
}

// ✅ Define ícone de status (verde = online / vermelho = offline)
function getIcon(status) {
    const color = status === "online" ? "green" : "red";
    return L.icon({
        iconUrl: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
}

// ✅ Polling RESTful: atualiza a cada 15 segundos
function iniciarPolling(mapaTempoReal, funcionarioIdSelecionado = null) {
    setInterval(() => {
        fetch('/api/ultima_posicao')
            .then(response => response.json())
            .then(data => {
                console.log("📡 Dados recebidos do polling:", data);

                data.forEach(funcionario => {
                    if (!funcionarioIdSelecionado || funcionario.id_funcionario == funcionarioIdSelecionado) {
                        atualizarMarcador(funcionario, mapaTempoReal);
                    }
                });
            })
            .catch(error => {
                console.error("❌ Erro ao buscar última posição:", error);
            });
    }, 15000);  // ✅ A cada 15 segundos
}

// ✅ Inicialização geral
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Inicializando mapa GPS Tempo Real com polling...");

    const mapaTempoReal = inicializarMapaTempoReal();

    const selectFuncionario = document.querySelector("#select-funcionario-tempo-real");
    let funcionarioIdSelecionado = selectFuncionario ? selectFuncionario.value : null;

    if (selectFuncionario) {
        selectFuncionario.addEventListener('change', function() {
            funcionarioIdSelecionado = this.value;
            console.log(`🔄 Funcionário selecionado para tempo real: ${funcionarioIdSelecionado}`);
        });
    }

    iniciarPolling(mapaTempoReal, funcionarioIdSelecionado);
});
