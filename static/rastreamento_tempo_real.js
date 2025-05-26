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
    fetch('/api/ultima_posicao')
        .then(response => response.json())
        .then(data => {
            const funcionario = data.find(f => f.id_funcionario == funcionarioId);
            if (funcionario) {
                atualizarMarcador(funcionario);
            } else {
                console.warn("❌ Nenhum dado encontrado para o funcionário selecionado.");
            }
        })
        .catch(error => console.error("❌ Erro ao buscar última posição:", error));
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
    let funcionarioIdSelecionado = selectFuncionario ? selectFuncionario.value : null;

    if (funcionarioIdSelecionado) {
        iniciarAtualizacaoAutomatica(funcionarioIdSelecionado);
    }

    selectFuncionario.addEventListener('change', function () {
        funcionarioIdSelecionado = this.value;
        if (funcionarioIdSelecionado) {
            iniciarAtualizacaoAutomatica(funcionarioIdSelecionado);
        } else {
            if (intervalo) {
                clearInterval(intervalo);
            }
            if (marcador) {
                mapaTempoReal.removeLayer(marcador);
                marcador = null;
            }
        }
    });
});
