let rastreamentoAtivo = false;
let rastreamentoInterval;

function iniciarRastreamento(funcionarioId) {
    rastreamentoAtivo = true;
    rastreamentoInterval = setInterval(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(position => {
                const dados = {
                    id_funcionario: funcionarioId,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    timestamp: new Date().toISOString()
                };
                fetch('/api/rastreamento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dados)
                });
            });
        }
    }, 30000);  // A cada 30 segundos
}

function pararRastreamento() {
    rastreamentoAtivo = false;
    clearInterval(rastreamentoInterval);
}
