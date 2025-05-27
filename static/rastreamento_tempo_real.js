let marcador = null;
let mapaTempoReal = null;

function inicializarMapaTempoReal() {
    mapaTempoReal = L.map('mapaTempoReal').setView([-22.9, -43.2], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaTempoReal);
}

function atualizarMarcador(ponto) {
    const { lat, lng } = ponto;

    if (marcador) {
        marcador.setLatLng([lat, lng]);
    } else {
        marcador = L.marker([lat, lng]).addTo(mapaTempoReal);
    }
    marcador.bindPopup(`Última Posição`).openPopup();
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Inicializando mapa GPS Tempo Real...");

    if (typeof pontos === "undefined" || pontos.length === 0) {
        console.warn("⚠️ Nenhum ponto disponível para exibir no mapa.");
        return;
    }

    inicializarMapaTempoReal();

    const ultimoPonto = pontos[pontos.length - 1];
    atualizarMarcador(ultimoPonto);
});
