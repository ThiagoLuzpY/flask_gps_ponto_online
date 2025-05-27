// flask_gps_ponto/static/rastreamento_tempo_real.js

// ✅ Inicializa o mapa com o último ponto
function inicializarMapaTempoReal(ultimoPonto) {
    const mapaTempoReal = L.map('mapaTempoReal').setView([ultimoPonto.lat, ultimoPonto.lng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaTempoReal);

    L.marker([ultimoPonto.lat, ultimoPonto.lng])
        .addTo(mapaTempoReal)
        .bindPopup(`Última posição registrada<br>Latitude: ${ultimoPonto.lat}<br>Longitude: ${ultimoPonto.lng}`)
        .openPopup();
}

// ✅ Inicialização geral
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Inicializando mapa tempo real (último ponto)...");

    if (typeof pontos !== 'undefined' && pontos.length > 0) {
        const ultimoPonto = pontos[pontos.length - 1];
        console.log("✅ Último ponto:", ultimoPonto);

        inicializarMapaTempoReal(ultimoPonto);
    } else {
        console.warn("⚠️ Nenhum ponto encontrado para exibição.");
    }
});
