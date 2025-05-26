// flask_gps_ponto/static/rastreamento.js

let marcadores = {};  // ✅ Objeto global para armazenar marcadores de cada funcionário
let rastreamentoAtivo = false;
let rastreamentoWatcherId;

// ✅ Função para iniciar rastreamento (continua igual)
function iniciarRastreamento(funcionarioId) {
    if (!funcionarioId) {
        console.error("❌ ERRO: ID do funcionário não informado para rastreamento!");
        return;
    }

    if (rastreamentoAtivo) {
        console.warn("⚠️ Rastreamento já está ativo.");
        return;
    }

    rastreamentoAtivo = true;

    console.log(`✅ Rastreamento iniciado com watchPosition para funcionário ID: ${funcionarioId}`);

    if ("geolocation" in navigator) {
        rastreamentoWatcherId = navigator.geolocation.watchPosition(
            position => {
                const dados = {
                    id_funcionario: funcionarioId,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: new Date().toISOString()
                };

                console.log("📡 Enviando dados de rastreamento:", dados);

                fetch('/api/rastreamento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                })
                .then(response => {
                    if (!response.ok) {
                        console.error("❌ Falha ao enviar rastreamento:", response.statusText);
                    } else {
                        console.log("✅ Rastreamento enviado com sucesso.");
                    }
                })
                .catch(error => {
                    console.error("❌ Erro de rede ao enviar rastreamento:", error);
                });
            },
            error => {
                console.error("❌ Erro ao obter localização:", error.message);
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 10000
            }
        );
    } else {
        console.warn("⚠️ Geolocalização não suportada neste navegador.");
    }
}

// ✅ Função para parar rastreamento
function pararRastreamento() {
    if (rastreamentoAtivo && rastreamentoWatcherId !== undefined) {
        navigator.geolocation.clearWatch(rastreamentoWatcherId);
        rastreamentoAtivo = false;
        rastreamentoWatcherId = undefined;
        console.log("🛑 Rastreamento parado com clearWatch.");
    } else {
        console.log("ℹ️ Rastreamento já estava parado ou não iniciado.");
    }
}

// ✅ Inicializa o mapa em tempo real
function inicializarMapaTempoReal() {
    const mapaTempoReal = L.map('mapaTempoReal').setView([-22.9, -43.2], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaTempoReal);
    return mapaTempoReal;
}

// ✅ Atualiza marcador de funcionário
function atualizarMarcador(funcionario, mapaTempoReal) {
    const { id, nome_completo, lat, lng, status } = funcionario;

    if (marcadores[id]) {
        marcadores[id].setLatLng([lat, lng]);
        marcadores[id].setIcon(getIcon(status));
    } else {
        marcadores[id] = L.marker([lat, lng], {
            icon: getIcon(status)
        }).addTo(mapaTempoReal).bindPopup(`${nome_completo} - ${status}`);
    }
}

// ✅ Define ícone de status
function getIcon(status) {
    const color = status === "online" ? "green" : "red";
    return L.icon({
        iconUrl: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
}

// ✅ Polling RESTful a cada 10 segundos
function iniciarPolling(mapaTempoReal) {
    setInterval(() => {
        fetch('/api/ultima_posicao')
            .then(response => response.json())
            .then(data => {
                console.log("📡 Dados recebidos do polling:", data);
                data.forEach(funcionario => {
                    atualizarMarcador(funcionario, mapaTempoReal);
                });
            })
            .catch(error => {
                console.error("❌ Erro ao buscar última posição:", error);
            });
    }, 10000); // 10 segundos
}

// ✅ Inicialização geral
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Inicializando mapa tempo real com polling...");
    const mapaTempoReal = inicializarMapaTempoReal();
    iniciarPolling(mapaTempoReal);
});
