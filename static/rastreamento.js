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
                maximumAge: 5000,  // mantém até 5s para reduzir consumo
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
