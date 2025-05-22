let rastreamentoAtivo = false;
let rastreamentoInterval;

function iniciarRastreamento(funcionarioId) {
    if (!funcionarioId) {
        console.error("❌ ERRO: ID do funcionário não informado para rastreamento!");
        return;
    }

    rastreamentoAtivo = true;

    console.log(`✅ Rastreamento iniciado para funcionário ID: ${funcionarioId}`);

    rastreamentoInterval = setInterval(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
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
                }
            );
        } else {
            console.warn("⚠️ Geolocalização não suportada neste navegador.");
        }
    }, 30000);  // A cada 30 segundos
}

function pararRastreamento() {
    if (rastreamentoAtivo) {
        clearInterval(rastreamentoInterval);
        rastreamentoAtivo = false;
        console.log("🛑 Rastreamento parado.");
    }
}
