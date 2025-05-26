let marcador = null;
let mapaTempoReal = null;
let intervalo = null;

function inicializarMapaTempoReal() {
    mapaTempoReal = L.map('mapaTempoReal').setView([-22.9, -43.2], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapaTempoReal);
}

function atualizarMarcador(funcionario) {
    const { lat, lng, nome, timestamp } = funcionario;

    if (marcador) {
        marcador.setLatLng([lat, lng]);
    } else {
        marcador = L.marker([lat, lng]).addTo(mapaTempoReal);
    }
    marcador.bindPopup(`${nome}<br>${new Date(timestamp).toLocaleTimeString()}`).openPopup();
}

function buscarUltimaPosicao(funcionarioId) {
    const dataAtual = new Date().toISOString().split('T')[0];  // "YYYY-MM-DD"
    const url = `/api/ultima_posicao?funcionario_id=${funcionarioId}&data=${dataAtual}`;

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
        .catch(error => console.warn("⚠️", error.message));
}

function iniciarAtualizacaoAutomatica(funcionarioId) {
    if (intervalo) {
        clearInterval(intervalo);
    }
    buscarUltimaPosicao(funcionarioId);
    intervalo = setInterval(() => {
        buscarUltimaPosicao(funcionarioId);
    }, 10000);  // ✅ Atualiza a cada 10 segundos
}

document.addEventListener("DOMContentLoaded", () => {
    inicializarMapaTempoReal();

    const selectFuncionario = document.querySelector("#select-funcionario-tempo-real");
    const botaoBuscar = document.querySelector("#botao-buscar");

    botaoBuscar.addEventListener('click', () => {
        const funcionarioIdSelecionado = selectFuncionario.value;

        if (!funcionarioIdSelecionado) {
            alert("Por favor, selecione um funcionário antes de buscar.");
            return;
        }

        iniciarAtualizacaoAutomatica(funcionarioIdSelecionado);
    });
});
