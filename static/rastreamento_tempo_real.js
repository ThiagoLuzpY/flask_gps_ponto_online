// flask_gps_ponto/static/rastreamento_tempo_real.js

let marcador = null;
let mapaTempoReal = null;
let ultimoTimestamp = null;
let intervalo = null;

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
    const url = `/api/ultima_posicao?funcionario_id=${funcionarioId}&data=${data}`;

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error("Nenhum registro encontrado ou erro na API.");
            }
            return response.json();
        })
        .then(funcionario => {
            atualizarMarcador(funcionario);
        })
        .catch(error => console.warn("⚠️ Erro ao buscar posição:", error));
}

function iniciarAtualizacaoAutomatica(funcionarioId, data) {
    if (intervalo) {
        clearInterval(intervalo);
    }
    buscarUltimaPosicao(funcionarioId, data);
    intervalo = setInterval(() => {
        buscarUltimaPosicao(funcionarioId, data);
    }, 15000);
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

        if (!funcionarioId || !data) {
            alert("Por favor, selecione um funcionário e uma data.");
            return;
        }

        iniciarAtualizacaoAutomatica(funcionarioId, data);
    });
});
