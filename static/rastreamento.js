let marcadores = {};  // ✅ Objeto global para armazenar marcadores de cada funcionário

let rastreamentoAtivo = false;
let rastreamentoWatcherId;

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

// ✅ Socket.IO: escutando atualizações em tempo real e atualizando marcadores

function configurarSocket(mapaTempoReal) {
    const socket = io();  // ✅ Conecta ao servidor Socket.IO

    socket.on('status_atualizado', function(dados) {
        const { id_funcionario, nome, lat, lng, status } = dados;

        const cor = status === 'online' ? 'green' : 'red';

        if (marcadores[id_funcionario]) {
            marcadores[id_funcionario].setLatLng([lat, lng]);
            marcadores[id_funcionario].setIcon(L.icon({
                iconUrl: `https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=•|${cor}`,
                iconSize: [21, 34],
                iconAnchor: [10, 34]
            }));
        } else {
            const marcador = L.marker([lat, lng], {
                icon: L.icon({
                    iconUrl: `https://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=•|${cor}`,
                    iconSize: [21, 34],
                    iconAnchor: [10, 34]
                })
            }).addTo(mapaTempoReal).bindPopup(`${nome} (${status})`);

            marcadores[id_funcionario] = marcador;
        }

        console.log(`📡 Atualização recebida: ${nome} está ${status} em (${lat}, ${lng})`);
    });
}
