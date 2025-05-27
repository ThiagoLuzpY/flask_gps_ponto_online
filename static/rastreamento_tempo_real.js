let marcador = null;
let mapaTempoReal = null;
let ultimaPosicao = null;
let ultimoTimestamp = null;

function inicializarMapaTempoReal() {
    mapaTempoReal = L.map('mapaTempoReal').setView([-22.9, -43.2], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaTempoReal);
}

function atualizarMarcador(funcionario) {
    const { lat, lng, nome, timestamp } = funcionario;

    let status = 'offline';
    if (ultimoTimestamp && timestamp !== ultimoTimestamp) {
        status = 'online';
    }
    ultimoTimestamp = timestamp;

    if (marcador) {
        marcador.setLatLng([lat, lng]);
    } else {
        marcador = L.marker([lat, lng]).addTo(mapaTempoReal);
    }

    marcador.setIcon(getIcon(status));
    marcador.bindPopup(`${nome} (${status})<br>Latitude: ${lat}<br>Longitude: ${lng}`).openPopup();

    // Centraliza e dá zoom
    mapaTempoReal.setView([lat, lng], 16);
}

function getIcon(status) {
    const color = status === "online" ? "green" : "red";
    return L.icon({
        iconUrl: `https://maps.google.com/mapfiles/ms/icons/${color}-dot.png`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });
}

function buscarUltimaPosicao(funcionarioId, data) {
    const url = `/rastreamento_tempo_real?funcionario_id=${funcionarioId}&data=${data}`;

    fetch(url)
        .then(response => response.text())  // ou .json() conforme seu backend
        .then(html => {
            // extrai os dados conforme o retorno
            // ou, melhor, criar um endpoint só pra JSON de última posição
        })
        .catch(error => console.warn("⚠️ Erro ao buscar posição:", error));
}

function iniciarAtualizacaoAutomatica(funcionarioId, data) {
    setInterval(() => {
        buscarUltimaPosicao(funcionarioId, data);
    }, 15000);  // 15 segundos
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarMapaTempoReal();

    const selectFuncionario = document.querySelector("select[name='funcionario_id']");
    const inputData = document.querySelector("input[name='data']");
    const botaoBuscar = document.querySelector("button[type='submit']");

    botaoBuscar.addEventListener('click', (e) => {
        e.preventDefault();
        const funcionarioId = selectFuncionario.value;
        const data = inputData.value;
        iniciarAtualizacaoAutomatica(funcionarioId, data);
        buscarUltimaPosicao(funcionarioId, data);
    });
});
